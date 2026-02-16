import { compileMDX } from "next-mdx-remote/rsc";
import path from "path";
import { readFile } from "fs/promises";

const CONTENT_DIR = path.join(process.cwd(), "content", "resources");

export async function getArticleContent(slug: string) {
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
  try {
    const raw = await readFile(filePath, "utf-8");
    const { content } = await compileMDX({
      source: raw,
      options: { parseFrontmatter: true },
    });
    return content;
  } catch {
    return null;
  }
}
