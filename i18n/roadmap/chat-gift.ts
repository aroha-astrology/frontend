import type { RoadmapBundle } from "./types";

/**
 * The Dussehra 2026 gift: every user's next questions are on us until
 * 21 Oct 11:59 PM (backend config/chat-gifts.ts). Shown above the chat input by
 * components/ai-chat/ChatConversation.tsx. Never says "AI" (owner's rule for
 * anything promotional).
 */
export const chatGiftBundle: RoadmapBundle = {
  en: {
    aiChatPage: {
      chatGiftOnUs: "🏹 Dussehra gift: your next {{count}} questions are on us",
      chatGiftOneLeft: "🏹 1 more question on us",
      chatGiftUntil: "till {{until}}",
    },
  },
  hi: {
    aiChatPage: {
      chatGiftOnUs: "🏹 दशहरा का उपहार: आपके अगले {{count}} सवाल हमारी ओर से मुफ़्त",
      chatGiftOneLeft: "🏹 1 और सवाल हमारी ओर से मुफ़्त",
      chatGiftUntil: "{{until}} तक",
    },
  },
  bn: {
    aiChatPage: {
      chatGiftOnUs: "🏹 বিজয়ার উপহার: আপনার পরের {{count}}টি প্রশ্ন আমাদের তরফ থেকে বিনামূল্যে",
      chatGiftOneLeft: "🏹 আরও ১টি প্রশ্ন আমাদের তরফ থেকে বিনামূল্যে",
      chatGiftUntil: "{{until}} পর্যন্ত",
    },
  },
  mr: {
    aiChatPage: {
      chatGiftOnUs: "🏹 दसऱ्याची भेट: तुमचे पुढचे {{count}} प्रश्न आमच्याकडून मोफत",
      chatGiftOneLeft: "🏹 अजून 1 प्रश्न आमच्याकडून मोफत",
      chatGiftUntil: "{{until}} पर्यंत",
    },
  },
  te: {
    aiChatPage: {
      chatGiftOnUs: "🏹 దసరా కానుక: మీ తదుపరి {{count}} ప్రశ్నలు మా తరఫున ఉచితం",
      chatGiftOneLeft: "🏹 ఇంకా 1 ప్రశ్న మా తరఫున ఉచితం",
      chatGiftUntil: "{{until}} వరకు",
    },
  },
  ta: {
    aiChatPage: {
      chatGiftOnUs: "🏹 விஜயதசமி பரிசு: உங்கள் அடுத்த {{count}} கேள்விகள் எங்கள் சார்பில் இலவசம்",
      chatGiftOneLeft: "🏹 இன்னும் 1 கேள்வி எங்கள் சார்பில் இலவசம்",
      chatGiftUntil: "{{until}} வரை",
    },
  },
  gu: {
    aiChatPage: {
      chatGiftOnUs: "🏹 દશેરાની ભેટ: તમારા આગલા {{count}} પ્રશ્નો અમારા તરફથી મફત",
      chatGiftOneLeft: "🏹 હજી 1 પ્રશ્ન અમારા તરફથી મફત",
      chatGiftUntil: "{{until}} સુધી",
    },
  },
};
