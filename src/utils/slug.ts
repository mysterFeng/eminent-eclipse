export function slugifyTag(tag: string) {
  return tag
    .trim()
    .toLowerCase()
    .replace(/\\s+/g, "-")
    .replace(/[^a-z0-9\\-\\u4e00-\\u9fa5]/g, "");
}

export function deslugTag(slug: string, tags: string[]) {
  const match = tags.find((t) => slugifyTag(t) === slug);
  return match ?? slug;
}
