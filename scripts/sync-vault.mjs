#!/usr/bin/env node
// Sync published blog posts from knowledge-vault into this Astro project.
//
// Rules (agreed with the user):
//   1. Source: <repo>/../../knowledge-vault/blog/*.md  (override with VAULT_DIR env var)
//   2. Only files whose frontmatter has `publish: true` are synced.
//   3. `category` is REQUIRED in the vault file. Missing → hard error (no fallback).
//   4. `tags` should exist; if missing, falls back to `[category]` and warns.
//   5. Filename `YYYY-MM-DD-title.md` → `title.md` (date prefix stripped).
//   6. Conflicts: vault always wins (overwrite).
//   7. Stale cleanup: any post in src/content/posts marked `source: vault`
//      that is no longer in the current sync set is deleted.
//   8. Synced posts get `source: vault` so future syncs can identify them.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const VAULT_DIR =
  process.env.VAULT_DIR ||
  path.resolve(repoRoot, "../../knowledge-vault/blog");
const POSTS_DIR = path.join(repoRoot, "src/content/posts");

const FM_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
const DATE_PREFIX_RE = /^(\d{4}-\d{2}-\d{2})-/;

function readFrontmatter(text) {
  const match = text.match(FM_RE);
  if (!match) {
    return { data: null, body: text };
  }
  const data = yaml.load(match[1]) || {};
  return { data, body: match[2] };
}

function toDateString(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return String(value);
}

function buildPostFrontmatter(data, sourceFile) {
  if (!data.title) throw new Error(`${sourceFile}: missing 'title'`);
  if (!data.date) throw new Error(`${sourceFile}: missing 'date'`);
  if (!data.category) {
    throw new Error(
      `${sourceFile}: missing 'category'. Add one in the vault file — sync script does not provide a default.`
    );
  }

  let tags = data.tags;
  if (!Array.isArray(tags) || tags.length === 0) {
    console.warn(
      `  ⚠ ${sourceFile}: no tags, falling back to [${data.category}]`
    );
    tags = [data.category];
  }

  const out = {
    title: data.title,
    date: toDateString(data.date),
    description: data.description || data.summary || data.title,
    category: data.category,
    tags,
    source: "vault",
  };
  if (data.summary) out.summary = data.summary;
  if (data.author) out.author = data.author;
  if (data.cover) out.cover = data.cover;
  if (data.featured) out.featured = true;
  if (data.categoryCustom) out.categoryCustom = data.categoryCustom;
  return out;
}

function dumpFrontmatter(obj) {
  return yaml.dump(obj, {
    forceQuotes: false,
    lineWidth: -1,
    noRefs: true,
  });
}

function stripDatePrefix(filename) {
  const base = filename.replace(/\.md$/i, "");
  const stripped = base.replace(DATE_PREFIX_RE, "");
  return `${stripped}.md`;
}

function listPostsBySource(sourceTag) {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".md"))
    .filter((f) => {
      const text = fs.readFileSync(path.join(POSTS_DIR, f), "utf8");
      const { data } = readFrontmatter(text);
      return data && data.source === sourceTag;
    });
}

function main() {
  if (!fs.existsSync(VAULT_DIR)) {
    console.error(`Vault dir not found: ${VAULT_DIR}`);
    process.exit(1);
  }
  if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR, { recursive: true });
  }

  const vaultFiles = fs
    .readdirSync(VAULT_DIR)
    .filter((f) => f.endsWith(".md"));

  const syncedNames = new Set();
  let written = 0;
  let skipped = 0;

  for (const file of vaultFiles) {
    const full = path.join(VAULT_DIR, file);
    const text = fs.readFileSync(full, "utf8");
    const { data, body } = readFrontmatter(text);
    if (!data) {
      console.warn(`  ⚠ ${file}: no frontmatter, skipped`);
      skipped++;
      continue;
    }
    if (data.publish !== true) {
      skipped++;
      continue;
    }

    const fm = buildPostFrontmatter(data, file);
    const targetName = stripDatePrefix(file);
    const targetPath = path.join(POSTS_DIR, targetName);
    const out = `---\n${dumpFrontmatter(fm)}---\n\n${body.trimStart()}`;
    fs.writeFileSync(targetPath, out);
    syncedNames.add(targetName);
    written++;
    console.log(`  ✓ ${file}  →  ${targetName}`);
  }

  // Stale cleanup: posts marked source:vault that no longer in current sync
  const existingVaultPosts = listPostsBySource("vault");
  let removed = 0;
  for (const name of existingVaultPosts) {
    if (!syncedNames.has(name)) {
      fs.unlinkSync(path.join(POSTS_DIR, name));
      console.log(`  ✗ ${name}  (removed, no longer published)`);
      removed++;
    }
  }

  console.log(
    `\nDone. ${written} written, ${removed} removed, ${skipped} skipped.`
  );
}

main();
