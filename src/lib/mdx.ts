import { compileMDX } from "next-mdx-remote/rsc";
import { cache } from "react";
import GithubSlugger from "github-slugger";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { CodeBlockContainer } from "@/components/CodeBlockContainer";
import { prisma } from "@/lib/prisma";
import type { JSX } from "react";

const mdxComponents = {
  pre: CodeBlockContainer,
};

export interface TocHeading {
  id: string;
  text: string;
  level: number; // 2 = h2, 3 = h3, etc.
}

// ---------------------------------------------------------------------------
// In-memory cache for compiled MDX (avoids recompiling on every request)
// ---------------------------------------------------------------------------

interface CachedArticle {
  content: JSX.Element;
  headings: TocHeading[];
  updatedAt: number; // timestamp from DB record
}

const _mdxCache = new Map<string, CachedArticle>();

/** Call after publishing/updating an article to bust its compiled cache. */
export function invalidateMdxCache(slug?: string) {
  if (slug) {
    _mdxCache.delete(slug);
  } else {
    _mdxCache.clear();
  }
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
 * Uses an in-memory cache keyed by slug + updatedAt so compiled MDX
 * is only regenerated when the article actually changes.
 * Also wrapped with React `cache()` for per-request deduplication.
 */
export const getArticleData = cache(async (slug: string) => {
  try {
    const article = await prisma.article.findUnique({
      where: { slug },
      select: { content: true, updatedAt: true },
    });

    if (!article) {
      return { content: null, headings: [] as TocHeading[] };
    }

    const dbUpdatedAt = article.updatedAt.getTime();

    // Check in-memory cache
    const cached = _mdxCache.get(slug);
    if (cached && cached.updatedAt === dbUpdatedAt) {
      return { content: cached.content, headings: cached.headings };
    }

    const raw = article.content;

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

    // Store in cache
    _mdxCache.set(slug, { content, headings, updatedAt: dbUpdatedAt });

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
