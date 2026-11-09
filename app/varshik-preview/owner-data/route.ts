import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * DEV ONLY: the owner's accuracy-test report (docs/varshik-classical-completeness.md, "Owner accuracy test").
 * Serves frontend/.claude/varshik-owner-report.json, which is gitignored and never committed. 404 in production
 * and whenever the file is absent, so nothing personal can ever be served from a deployed build.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  try {
    const file = path.join(process.cwd(), ".claude", "varshik-owner-report.json");
    return new Response(await fs.readFile(file, "utf8"), {
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
