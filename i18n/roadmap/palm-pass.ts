import type { RoadmapBundle } from "./types";

/**
 * Palm Reading on the Aroha Pass and Question Packs on Google Play (owner, 2026-10-23). The full
 * palm reading is a benefit of every Pass tier, one per 30-day period (the scan stays free);
 * Question Packs are bought through Google Play, never from the wallet. Used by
 * components/palm/PalmUnlockDrawer.tsx, components/pass/*, app/pass/page.tsx and the Lines /
 * Mounts switch on components/palm/PalmAnnotatedView.tsx. The other eight languages are in
 * i18n/generated/*.json.
 */
export const palmPassBundle: RoadmapBundle = {
  en: {
    pass: {
      benefits: { palm: "A full palm reading every 30 days" },
      lock: { hook: { palm: "Your hand holds your story. Read every line." } },
      packs: {
        subtitlePlay: "Prepaid questions to Aroha, paid through Google Play. Used after your Pass questions.",
        androidOnly: "Buy Question Packs from the Aroha app on Android.",
        iosSoon: "Question Packs aren't available on iPhone yet.",
      },
    },
    palm: {
      pass: {
        badge: "Included in Aroha Pass",
        feature: "The full palm reading",
        included: "Your Aroha Pass includes one full palm reading every 30 days.",
        cta: "Unlock with my Pass",
        confirm: "Use this period's palm reading on this scan?",
        used: "You've used this period's palm reading. Your next one opens when your Pass renews.",
        usedOn: "You've used this period's palm reading. Your next one opens on {{date}}.",
      },
      overlay: { lines: "Lines", mounts: "Mounts" },
    },
  },
  hi: {
    pass: {
      benefits: { palm: "हर 30 दिन में एक पूरी हस्तरेखा रीडिंग" },
      lock: { hook: { palm: "आपकी हथेली में आपकी कहानी है। हर रेखा पढ़िए।" } },
      packs: {
        subtitlePlay: "Aroha से पहले से ख़रीदे सवाल, Google Play से भुगतान। Pass के सवालों के बाद इस्तेमाल होते हैं।",
        androidOnly: "Question Packs Android पर Aroha ऐप से ख़रीदें।",
        iosSoon: "Question Packs अभी iPhone पर उपलब्ध नहीं हैं।",
      },
    },
    palm: {
      pass: {
        badge: "Aroha Pass में शामिल",
        feature: "पूरी हस्तरेखा रीडिंग",
        included: "आपके Aroha Pass में हर 30 दिन में एक पूरी हस्तरेखा रीडिंग शामिल है।",
        cta: "मेरे Pass से अनलॉक करें",
        confirm: "इस अवधि की हस्तरेखा रीडिंग इस स्कैन पर इस्तेमाल करें?",
        used: "आपने इस अवधि की हस्तरेखा रीडिंग इस्तेमाल कर ली है। अगली रीडिंग Pass के नवीनीकरण पर खुलेगी।",
        usedOn: "आपने इस अवधि की हस्तरेखा रीडिंग इस्तेमाल कर ली है। अगली रीडिंग {{date}} को खुलेगी।",
      },
      overlay: { lines: "रेखाएँ", mounts: "पर्वत" },
    },
  },
  bn: {
    pass: {
      benefits: { palm: "প্রতি ৩০ দিনে একটি সম্পূর্ণ হস্তরেখা পাঠ" },
      lock: { hook: { palm: "আপনার হাতের তালুতে আপনার গল্প। প্রতিটি রেখা পড়ুন।" } },
      packs: {
        subtitlePlay: "Aroha-কে আগে থেকে কেনা প্রশ্ন, Google Play-এর মাধ্যমে পেমেন্ট। Pass-এর প্রশ্নের পরে ব্যবহার হয়।",
        androidOnly: "Android-এ Aroha অ্যাপ থেকে Question Packs কিনুন।",
        iosSoon: "Question Packs এখনও iPhone-এ পাওয়া যায় না।",
      },
    },
    palm: {
      pass: {
        badge: "Aroha Pass-এ অন্তর্ভুক্ত",
        feature: "সম্পূর্ণ হস্তরেখা পাঠ",
        included: "আপনার Aroha Pass-এ প্রতি ৩০ দিনে একটি সম্পূর্ণ হস্তরেখা পাঠ অন্তর্ভুক্ত।",
        cta: "আমার Pass দিয়ে আনলক করুন",
        confirm: "এই সময়ের হস্তরেখা পাঠটি এই স্ক্যানে ব্যবহার করবেন?",
        used: "এই সময়ের হস্তরেখা পাঠটি আপনি ব্যবহার করেছেন। Pass নবীকরণ হলে পরেরটি খুলবে।",
        usedOn: "এই সময়ের হস্তরেখা পাঠটি আপনি ব্যবহার করেছেন। পরেরটি {{date}} তারিখে খুলবে।",
      },
      overlay: { lines: "রেখা", mounts: "পর্বত" },
    },
  },
  mr: {
    pass: {
      benefits: { palm: "दर ३० दिवसांनी एक संपूर्ण हस्तरेषा वाचन" },
      lock: { hook: { palm: "तुमच्या तळहातात तुमची कहाणी आहे. प्रत्येक रेषा वाचा." } },
      packs: {
        subtitlePlay: "Aroha ला आधीच विकत घेतलेले प्रश्न, Google Play द्वारे पेमेंट. Pass चे प्रश्न संपल्यावर वापरले जातात.",
        androidOnly: "Android वरील Aroha ॲपमधून Question Packs विकत घ्या.",
        iosSoon: "Question Packs अजून iPhone वर उपलब्ध नाहीत.",
      },
    },
    palm: {
      pass: {
        badge: "Aroha Pass मध्ये समाविष्ट",
        feature: "संपूर्ण हस्तरेषा वाचन",
        included: "तुमच्या Aroha Pass मध्ये दर ३० दिवसांनी एक संपूर्ण हस्तरेषा वाचन समाविष्ट आहे.",
        cta: "माझ्या Pass ने अनलॉक करा",
        confirm: "या कालावधीचे हस्तरेषा वाचन या स्कॅनसाठी वापरायचे?",
        used: "तुम्ही या कालावधीचे हस्तरेषा वाचन वापरले आहे. Pass नूतनीकरण झाल्यावर पुढचे उघडेल.",
        usedOn: "तुम्ही या कालावधीचे हस्तरेषा वाचन वापरले आहे. पुढचे {{date}} रोजी उघडेल.",
      },
      overlay: { lines: "रेषा", mounts: "पर्वत" },
    },
  },
  te: {
    pass: {
      benefits: { palm: "ప్రతి 30 రోజులకు ఒక పూర్తి హస్తరేఖ పఠనం" },
      lock: { hook: { palm: "మీ అరచేతిలో మీ కథ ఉంది. ప్రతి రేఖను చదవండి." } },
      packs: {
        subtitlePlay: "Arohaకు ముందుగా కొన్న ప్రశ్నలు, Google Play ద్వారా చెల్లింపు. Pass ప్రశ్నల తర్వాత వాడబడతాయి.",
        androidOnly: "Androidలో Aroha యాప్ నుండి Question Packs కొనండి.",
        iosSoon: "Question Packs ఇంకా iPhoneలో అందుబాటులో లేవు.",
      },
    },
    palm: {
      pass: {
        badge: "Aroha Passలో భాగం",
        feature: "పూర్తి హస్తరేఖ పఠనం",
        included: "మీ Aroha Passలో ప్రతి 30 రోజులకు ఒక పూర్తి హస్తరేఖ పఠనం ఉంది.",
        cta: "నా Passతో అన్‌లాక్ చేయండి",
        confirm: "ఈ కాలపు హస్తరేఖ పఠనాన్ని ఈ స్కాన్‌కు వాడాలా?",
        used: "ఈ కాలపు హస్తరేఖ పఠనాన్ని మీరు వాడేశారు. Pass పునరుద్ధరణ అయినప్పుడు తదుపరిది తెరుచుకుంటుంది.",
        usedOn: "ఈ కాలపు హస్తరేఖ పఠనాన్ని మీరు వాడేశారు. తదుపరిది {{date}}న తెరుచుకుంటుంది.",
      },
      overlay: { lines: "రేఖలు", mounts: "పర్వతాలు" },
    },
  },
  ta: {
    pass: {
      benefits: { palm: "ஒவ்வொரு 30 நாட்களுக்கும் ஒரு முழு கைரேகை வாசிப்பு" },
      lock: { hook: { palm: "உங்கள் உள்ளங்கையில் உங்கள் கதை உள்ளது. ஒவ்வொரு ரேகையையும் படியுங்கள்." } },
      packs: {
        subtitlePlay: "Aroha-விடம் முன்கூட்டியே வாங்கிய கேள்விகள், Google Play மூலம் கட்டணம். Pass கேள்விகளுக்குப் பிறகு பயன்படுத்தப்படும்.",
        androidOnly: "Android-இல் Aroha ஆப்பிலிருந்து Question Packs வாங்குங்கள்.",
        iosSoon: "Question Packs இன்னும் iPhone-இல் கிடைக்கவில்லை.",
      },
    },
    palm: {
      pass: {
        badge: "Aroha Pass-இல் அடங்கும்",
        feature: "முழு கைரேகை வாசிப்பு",
        included: "உங்கள் Aroha Pass-இல் ஒவ்வொரு 30 நாட்களுக்கும் ஒரு முழு கைரேகை வாசிப்பு அடங்கும்.",
        cta: "என் Pass மூலம் திறக்கவும்",
        confirm: "இந்தக் காலத்தின் கைரேகை வாசிப்பை இந்த ஸ்கேனுக்குப் பயன்படுத்தவா?",
        used: "இந்தக் காலத்தின் கைரேகை வாசிப்பை நீங்கள் பயன்படுத்திவிட்டீர்கள். Pass புதுப்பிக்கப்படும்போது அடுத்தது திறக்கும்.",
        usedOn: "இந்தக் காலத்தின் கைரேகை வாசிப்பை நீங்கள் பயன்படுத்திவிட்டீர்கள். அடுத்தது {{date}} அன்று திறக்கும்.",
      },
      overlay: { lines: "ரேகைகள்", mounts: "மேடுகள்" },
    },
  },
  gu: {
    pass: {
      benefits: { palm: "દર 30 દિવસે એક સંપૂર્ણ હસ્તરેખા વાંચન" },
      lock: { hook: { palm: "તમારી હથેળીમાં તમારી વાર્તા છે. દરેક રેખા વાંચો." } },
      packs: {
        subtitlePlay: "Arohaને અગાઉથી ખરીદેલા પ્રશ્નો, Google Play દ્વારા ચુકવણી. Passના પ્રશ્નો પછી વપરાય છે.",
        androidOnly: "Android પર Aroha એપમાંથી Question Packs ખરીદો.",
        iosSoon: "Question Packs હજુ iPhone પર ઉપલબ્ધ નથી.",
      },
    },
    palm: {
      pass: {
        badge: "Aroha Passમાં સામેલ",
        feature: "સંપૂર્ણ હસ્તરેખા વાંચન",
        included: "તમારા Aroha Passમાં દર 30 દિવસે એક સંપૂર્ણ હસ્તરેખા વાંચન સામેલ છે.",
        cta: "મારા Passથી અનલૉક કરો",
        confirm: "આ સમયગાળાનું હસ્તરેખા વાંચન આ સ્કેન પર વાપરવું છે?",
        used: "તમે આ સમયગાળાનું હસ્તરેખા વાંચન વાપરી લીધું છે. Pass રિન્યૂ થશે ત્યારે આગળનું ખુલશે.",
        usedOn: "તમે આ સમયગાળાનું હસ્તરેખા વાંચન વાપરી લીધું છે. આગળનું {{date}}ના રોજ ખુલશે.",
      },
      overlay: { lines: "રેખાઓ", mounts: "પર્વતો" },
    },
  },
};
