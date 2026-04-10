import { defineCollection, z } from "astro:content";

const posts = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date().transform((d) => d.toISOString().slice(0, 10)),
    category: z.string(),
    categoryCustom: z.string().optional(),
    tags: z.array(z.string()),
    author: z.string().default("JJ"),
    summary: z.string().optional(),
    cover: z.string().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().optional(),
    source: z.string().optional(),
  }),
});

export const collections = { posts };
