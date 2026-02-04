import { defineCollection, z } from "astro:content";

const posts = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.string(),
    readingTime: z.string(),
    tags: z.array(z.string()),
    author: z.string().default("JH"),
    summary: z.string().optional(),
    cover: z.string().optional(),
    featured: z.boolean().default(false),
  }),
});

export const collections = { posts };
