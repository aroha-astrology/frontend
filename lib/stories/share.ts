import { PLAY_STORE_URL } from "@/lib/app-review";
import type { ShareTarget, StoryId } from "./types";

/** Play Store link for a shared story. Play hands `referrer` back to the app on first launch. */
export function storyShareUrl(storyId: StoryId, referralCode?: string | null): string {
  let referrer = "utm_source=story_share&utm_campaign=" + storyId;
  if (referralCode && referralCode.length > 0) {
    referrer += "&ref=" + referralCode;
  }
  return PLAY_STORE_URL + "&referrer=" + encodeURIComponent(referrer);
}

/** A link that opens another app with the words filled in, or null when that app takes no text link. */
export function textShareLink(target: ShareTarget, caption: string): string | null {
  switch (target) {
    case "whatsapp":
    case "whatsappStatus":
      return "https://wa.me/?text=" + encodeURIComponent(caption);
    case "sms":
      return "sms:?body=" + encodeURIComponent(caption);
    case "x":
      return "https://twitter.com/intent/tweet?text=" + encodeURIComponent(caption);
    default:
      return null;
  }
}
