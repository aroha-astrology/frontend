import type { RoadmapBundle } from "./types";

/**
 * The voice call trial (Durga Puja 2026): every user gets {{minutes}} minutes
 * free once, then the Pass. Used by components/ai-chat/VoiceCall.tsx,
 * VoiceCallOverlay.tsx and VoiceConsentSheet.tsx. Never says "AI" (owner's rule
 * for anything promotional): it is Yogi Baba.
 */
export const voiceTrialBundle: RoadmapBundle = {
  en: {
    aiChatPage: {
      voiceTrialConsent: "Your first {{minutes}} minutes are free, a gift for everyone.",
      voiceTrialMinute: "Free trial minute",
      voiceTrialEnding: "Your free call ends soon. Get Aroha Pass to keep talking.",
      voiceTrialUsed: "You've used your {{minutes}} free minutes. Get Aroha Pass to keep talking to Yogi Baba.",
      voiceTrialBubble: "{{minutes}} free minutes · tap to call",
    },
  },
  hi: {
    aiChatPage: {
      voiceTrialConsent: "आपके पहले {{minutes}} मिनट मुफ़्त हैं, सबके लिए एक उपहार।",
      voiceTrialMinute: "मुफ़्त ट्रायल मिनट",
      voiceTrialEnding: "आपकी मुफ़्त कॉल जल्द खत्म होगी। बात जारी रखने के लिए Aroha Pass लें।",
      voiceTrialUsed: "आपने अपने {{minutes}} मुफ़्त मिनट इस्तेमाल कर लिए हैं। योगी बाबा से बात जारी रखने के लिए Aroha Pass लें।",
      voiceTrialBubble: "{{minutes}} मिनट मुफ़्त · कॉल के लिए टैप करें",
    },
  },
  bn: {
    aiChatPage: {
      voiceTrialConsent: "আপনার প্রথম {{minutes}} মিনিট বিনামূল্যে, সবার জন্য একটি উপহার।",
      voiceTrialMinute: "বিনামূল্যে ট্রায়াল মিনিট",
      voiceTrialEnding: "আপনার বিনামূল্যের কল শিগগির শেষ হবে। কথা চালিয়ে যেতে Aroha Pass নিন।",
      voiceTrialUsed: "আপনি আপনার {{minutes}} মিনিট বিনামূল্যের সময় ব্যবহার করেছেন। যোগী বাবার সঙ্গে কথা চালিয়ে যেতে Aroha Pass নিন।",
      voiceTrialBubble: "{{minutes}} মিনিট বিনামূল্যে · কল করতে ট্যাপ করুন",
    },
  },
  mr: {
    aiChatPage: {
      voiceTrialConsent: "तुमची पहिली {{minutes}} मिनिटे मोफत आहेत, सर्वांसाठी एक भेट.",
      voiceTrialMinute: "मोफत ट्रायल मिनिट",
      voiceTrialEnding: "तुमचा मोफत कॉल लवकरच संपेल. बोलणे सुरू ठेवण्यासाठी Aroha Pass घ्या.",
      voiceTrialUsed: "तुम्ही तुमची {{minutes}} मोफत मिनिटे वापरली आहेत. योगी बाबांशी बोलणे सुरू ठेवण्यासाठी Aroha Pass घ्या.",
      voiceTrialBubble: "{{minutes}} मिनिटे मोफत · कॉलसाठी टॅप करा",
    },
  },
  te: {
    aiChatPage: {
      voiceTrialConsent: "మీ మొదటి {{minutes}} నిమిషాలు ఉచితం, అందరికీ ఒక కానుక.",
      voiceTrialMinute: "ఉచిత ట్రయల్ నిమిషం",
      voiceTrialEnding: "మీ ఉచిత కాల్ త్వరలో ముగుస్తుంది. మాట్లాడటం కొనసాగించడానికి Aroha Pass తీసుకోండి.",
      voiceTrialUsed: "మీరు మీ {{minutes}} ఉచిత నిమిషాలు వాడేశారు. యోగి బాబాతో మాట్లాడటం కొనసాగించడానికి Aroha Pass తీసుకోండి.",
      voiceTrialBubble: "{{minutes}} నిమిషాలు ఉచితం · కాల్ చేయడానికి నొక్కండి",
    },
  },
  ta: {
    aiChatPage: {
      voiceTrialConsent: "உங்கள் முதல் {{minutes}} நிமிடங்கள் இலவசம், அனைவருக்கும் ஒரு பரிசு.",
      voiceTrialMinute: "இலவச சோதனை நிமிடம்",
      voiceTrialEnding: "உங்கள் இலவச அழைப்பு விரைவில் முடியும். தொடர்ந்து பேச Aroha Pass பெறுங்கள்.",
      voiceTrialUsed: "உங்கள் {{minutes}} இலவச நிமிடங்களைப் பயன்படுத்திவிட்டீர்கள். யோகி பாபாவுடன் தொடர்ந்து பேச Aroha Pass பெறுங்கள்.",
      voiceTrialBubble: "{{minutes}} நிமிடங்கள் இலவசம் · அழைக்க தட்டவும்",
    },
  },
  gu: {
    aiChatPage: {
      voiceTrialConsent: "તમારી પહેલી {{minutes}} મિનિટ મફત છે, સૌ માટે એક ભેટ.",
      voiceTrialMinute: "મફત ટ્રાયલ મિનિટ",
      voiceTrialEnding: "તમારો મફત કૉલ જલ્દી પૂરો થશે. વાત ચાલુ રાખવા Aroha Pass લો.",
      voiceTrialUsed: "તમે તમારી {{minutes}} મફત મિનિટ વાપરી લીધી છે. યોગી બાબા સાથે વાત ચાલુ રાખવા Aroha Pass લો.",
      voiceTrialBubble: "{{minutes}} મિનિટ મફત · કૉલ કરવા ટેપ કરો",
    },
  },
};
