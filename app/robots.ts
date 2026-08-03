import type { MetadataRoute } from "next";

// The app lives here; marketing/SEO lives on the landing site. Keep this
// out of Google entirely so search results point at landing, not the app.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
