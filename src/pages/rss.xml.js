import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context) {
  const posts = await getCollection("posts");
  const items = posts
    .map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: new Date(entry.data.date),
      link: `/posts/${entry.slug}`,
    }))
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: "个人博客",
    description: "高质量内容创作与设计实践",
    site: context.site ?? "https://example.com",
    items,
  });
}
