import { compileMDX } from "next-mdx-remote/rsc";
import path from "path";
import { readFile } from "fs/promises";
import GithubSlugger from "github-slugger";
import rehypeSlug from "rehype-slug";
import { CodeBlockContainer } from "@/components/CodeBlockContainer";

const CONTENT_DIR = path.join(process.cwd(), "content", "docs");

const mdxComponents = {
  pre: CodeBlockContainer,
};

export interface TocHeading {
  id: string;
  text: string;
  level: number; // 2 = h2, 3 = h3, etc.
}

/**
 * Extract h2 and h3 headings from raw MDX for table of contents.
 * Uses GithubSlugger to match rehype-slug's ID generation.
 */
export function extractHeadings(source: string): TocHeading[] {
  const slugger = new GithubSlugger();
  const headings: TocHeading[] = [];
  const headingRe = /^(#{2})\s+(.+)$/;
  const lines = source.split("\n");

  // Skip only the first frontmatter block (--- ... ---). Other --- are horizontal rules.
  let i = 0;
  if (lines[i]?.trim() === "---") {
    i++;
    while (i < lines.length && lines[i].trim() !== "---") i++;
    i++; // skip closing ---
  }

  for (; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(headingRe);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/\s*\{#[\w-]+\}\s*$/, "").trim(); // strip custom ids
      const id = slugger.slug(text);
      headings.push({ id, text, level });
    }
  }
  return headings;
}

export async function getArticleHeadings(slug: string): Promise<TocHeading[]> {
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
  try {
    const raw = await readFile(filePath, "utf-8");
    return extractHeadings(raw);
  } catch {
    return [];
  }
}

export async function getArticleContent(slug: string) {
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
  try {
    const raw = await readFile(filePath, "utf-8");
    const { content } = await compileMDX({
      source: raw,
      options: {
        parseFrontmatter: true,
        mdxOptions: { rehypePlugins: [rehypeSlug] },
      },
      components: mdxComponents,
    });
    return content;
  } catch {
    return null;
  }
}
