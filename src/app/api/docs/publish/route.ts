import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import matter from "gray-matter";
import { invalidateArticlesCache } from "@/app/docs/data";
import { invalidateMdxCache } from "@/lib/mdx";

export const dynamic = "force-dynamic";

/**
 * POST /api/docs/publish
 *
 * Publish or update an article in the database.
 * Protected by CRON_SECRET (same secret your agent uses).
 *
 * Body: { content: string } — the full MDX file content including frontmatter.
 * The slug, title, category, etc. are extracted from the frontmatter.
 *
 * If an article with the same slug already exists, it is updated.
 * Otherwise, a new article is created.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { content?: string };

    if (!body.content || typeof body.content !== "string") {
      return NextResponse.json(
        { error: "Request body must include a 'content' string (full MDX with frontmatter)" },
        { status: 400 }
      );
    }

    const { data, content: mdxBody } = matter(body.content);

    // Derive slug from frontmatter or filename-style slug field
    const slug = data.slug as string | undefined;
    if (!slug) {
      return NextResponse.json(
        { error: "Frontmatter must include a 'slug' field" },
        { status: 400 }
      );
    }

    const title = (data.title as string) || slug;
    const description = (data.description as string) || "";
    const section = (data.section as string) || "docs";
    const category = (data.category as string) || "getting-started";
    const type = (data.type as string) || "article";
    const readTime = (data.readTime as string) || null;
    const duration = (data.duration as string) || null;
    const featured = (data.featured as boolean) || false;
    const author = (data.author as string) || null;
    const keywords = Array.isArray(data.keywords) ? (data.keywords as string[]) : [];
    const publishedAt = data.date ? new Date(data.date as string) : new Date();

    // Verify mdxBody is not empty
    if (!mdxBody.trim()) {
      return NextResponse.json(
        { error: "Article content (after frontmatter) is empty" },
        { status: 400 }
      );
    }

    const article = await prisma.article.upsert({
      where: { slug },
      create: {
        slug,
        title,
        description,
        section,
        category,
        type,
        readTime,
        duration,
        featured,
        author,
        keywords,
        content: body.content,
        publishedAt,
      },
      update: {
        title,
        description,
        section,
        category,
        type,
        readTime,
        duration,
        featured,
        author,
        keywords,
        content: body.content,
        publishedAt,
      },
    });

    // Bust caches so the article is served fresh
    invalidateArticlesCache();
    invalidateMdxCache(slug);

    return NextResponse.json({
      ok: true,
      slug: article.slug,
      title: article.title,
      created: article.createdAt.toISOString() === article.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    console.error("[docs/publish] error:", error);
    const message = error instanceof Error ? error.message : "Failed to publish article";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
