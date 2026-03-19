/**
 * One-time migration script: imports all MDX files from content/docs into the database.
 *
 * Usage: npx tsx scripts/migrate-articles-to-db.ts
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
const CONTENT_DIR = path.join(process.cwd(), "content", "docs");

async function main() {
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".mdx"));
  console.log(`Found ${files.length} MDX files to migrate.\n`);

  let created = 0;
  let updated = 0;

  for (const file of files) {
    const slug = file.replace(/\.mdx$/, "");
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");
    const { data } = matter(raw);

    const articleData = {
      slug,
      title: (data.title as string) || slug,
      description: (data.description as string) || "",
      category: (data.category as string) || "getting-started",
      type: (data.type as string) || "article",
      readTime: (data.readTime as string) || null,
      duration: (data.duration as string) || null,
      featured: (data.featured as boolean) || false,
      author: (data.author as string) || null,
      keywords: Array.isArray(data.keywords) ? (data.keywords as string[]) : [],
      content: raw,
      publishedAt: data.date ? new Date(data.date as string) : new Date(),
    };

    const existing = await prisma.article.findUnique({ where: { slug } });

    if (existing) {
      await prisma.article.update({ where: { slug }, data: articleData });
      updated++;
      console.log(`  ↻ Updated: ${slug}`);
    } else {
      await prisma.article.create({ data: articleData });
      created++;
      console.log(`  ✓ Created: ${slug}`);
    }
  }

  console.log(`\nDone! Created: ${created}, Updated: ${updated}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
