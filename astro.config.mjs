// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://warm-haupia-9c9aa2.netlify.app",
  integrations: [sitemap()],
});
