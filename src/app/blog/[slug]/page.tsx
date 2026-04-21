import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";
import { getAllArticles } from "@/app/docs/data";
import { getArticleData } from "@/lib/mdx";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const allArticles = await getAllArticles();
  const article = allArticles.find((a) => a.section === "blog" && a.slug === slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: article.title,
      description: article.description,
      type: "article",
      ...(article.publishedAt && { publishedTime: new Date(article.publishedAt).toISOString() }),
      ...(article.author && { authors: [article.author] }),
      ...(article.coverImage && {
        images: [{ url: article.coverImage, width: 1200, height: 630, alt: article.title }],
      }),
    },
    ...(article.coverImage && {
      twitter: {
        card: "summary_large_image",
        title: article.title,
        description: article.description,
        images: [article.coverImage],
      },
    }),
  };
}

function formatDate(date?: Date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const allArticles = await getAllArticles();
  const article = allArticles.find((a) => a.section === "blog" && a.slug === slug);

  if (!article) return notFound();

  const { content: mdxContent } = await getArticleData(slug);

  // Related posts from same category
  const related = allArticles
    .filter((a) => a.section === "blog" && a.category === article.category && a.slug !== slug)
    .slice(0, 3);

  return (
    <div className="marketing min-h-screen" style={{ background: "var(--m-bg)" }}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.description,
          ...(article.coverImage && { image: article.coverImage }),
          ...(article.publishedAt && { datePublished: new Date(article.publishedAt).toISOString() }),
          ...(article.author && { author: { "@type": "Person", name: article.author } }),
          publisher: {
            "@type": "Organization",
            name: "Meaning",
            url: "https://usemeaning.io",
          },
          url: `https://usemeaning.io/blog/${slug}`,
        }}
      />
      <Navbar />

      {/* Article header — centered, Resend-style */}
      <header className="mx-auto max-w-3xl px-6 pt-32 text-center md:pt-40">
        <p className="mb-4 text-sm" style={{ color: "var(--m-text-muted)" }}>
          {formatDate(article.publishedAt)}
        </p>
        <h1
          className="display-lg mb-4"
          style={{ color: "var(--m-text)" }}
        >
          {article.title}
        </h1>
        <p className="mx-auto max-w-xl text-base leading-relaxed" style={{ color: "var(--m-text-secondary)" }}>
          {article.description}
        </p>
        {article.author && (
          <p className="mt-6 text-sm" style={{ color: "var(--m-text-muted)" }}>
            {article.author}
          </p>
        )}
      </header>

      {/* Cover image */}
      {article.coverImage && (
        <div className="mx-auto mt-10 max-w-4xl px-6">
          <div className="relative aspect-[1200/630] overflow-hidden rounded-2xl">
            <Image
              src={article.coverImage}
              alt={article.title}
              fill
              className="object-cover"
              sizes="(max-width: 896px) 100vw, 896px"
              priority
            />
          </div>
        </div>
      )}

      {/* Article body */}
      <div className="mx-auto max-w-3xl px-6 py-16">
        {mdxContent ? (
          <div className="article-body">{mdxContent}</div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-lg font-medium" style={{ color: "var(--m-text)" }}>
              Content coming soon
            </p>
            <p className="mt-2 text-sm" style={{ color: "var(--m-text-muted)" }}>
              This post is being written. Check back soon.
            </p>
          </div>
        )}
      </div>

      {/* Related posts */}
      {related.length > 0 && (
        <div className="mx-auto max-w-6xl px-6 pb-24">
          <div style={{ borderTop: "1px solid var(--m-hairline)" }} className="pt-12">
            <h2 className="mb-6 text-lg font-semibold" style={{ color: "var(--m-text)" }}>
              Related posts
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="rounded-xl p-4 transition-colors hover:bg-[color:var(--m-surface-elevated)]"
                  style={{ border: "1px solid var(--m-hairline)" }}
                >
                  <h3 className="mb-1 text-sm font-medium" style={{ color: "var(--m-text)" }}>
                    {post.title}
                  </h3>
                  <p className="text-xs" style={{ color: "var(--m-text-muted)" }}>
                    {post.author && <>{post.author} · </>}
                    {formatDate(post.publishedAt)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
