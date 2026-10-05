import type { MetadataRoute } from "next";

// Marketing/SEO lives on the landing site; here only the entry (/ and
// /sign-in) is meant to show in search, so someone looking for the web app
// by name finds it. Every other route is kept out with an X-Robots-Tag
// noindex header (see next.config.ts), which a crawler can only read if the
// route is NOT disallowed here.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
  };
}
