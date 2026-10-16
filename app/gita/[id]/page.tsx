import { redirect } from "next/navigation";
import { gitaChantHref } from "@/lib/gita";

/**
 * A Gita verse opens on the chant screen (the verse, its audio and the bead
 * counter), so the old verse page only forwards there. Kept so shared links
 * and the Daily Stories button from older app builds still land somewhere.
 */
export default async function GitaVersePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(gitaChantHref(id));
}
