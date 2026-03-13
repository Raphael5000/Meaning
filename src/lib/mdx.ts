import { compileMDX } from "next-mdx-remote/rsc";
import path from "path";
import { readFile } from "fs/promises";
import { cache } from "react";
import GithubSlugger from "github-slugger";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
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

/**
 * Read and compile an MDX article in a single pass, returning both the
 * rendered content and the table-of-contents headings.
 *
 * Wrapped with React `cache()` so that multiple calls with the same slug
 * within a single server request are deduplicated (one file read, one compile).
 */
export const getArticleData = cache(async (slug: string) => {
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
  try {
    const raw = await readFile(filePath, "utf-8");

    // Strip the first # heading — the page already renders the title from frontmatter
    const stripped = raw.replace(/^(---[\s\S]*?---\s*)\n# .+\n/, "$1\n");

    const [{ content }, headings] = await Promise.all([
      compileMDX({
        source: stripped,
        options: {
          parseFrontmatter: true,
          mdxOptions: {
            remarkPlugins: [remarkGfm],
            rehypePlugins: [rehypeSlug],
          },
        },
        components: mdxComponents,
      }),
      Promise.resolve(extractHeadings(raw)),
    ]);

    return { content, headings };
  } catch {
    return { content: null, headings: [] as TocHeading[] };
  }
});

export async function getArticleHeadings(slug: string): Promise<TocHeading[]> {
  const { headings } = await getArticleData(slug);
  return headings;
}

export async function getArticleContent(slug: string) {
  const { content } = await getArticleData(slug);
  return content;
}
