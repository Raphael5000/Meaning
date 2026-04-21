import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/account/",
        "/onboarding/",
        "/connect-analytics/",
        "/invite/",
        "/auth-error/",
        "/login/",
        "/signup/",
      ],
    },
    sitemap: "https://usemeaning.io/sitemap.xml",
  };
}
