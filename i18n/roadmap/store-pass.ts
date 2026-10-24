import type { RoadmapBundle } from "./types";

/**
 * The Aroha Pass on the website (Razorpay Subscriptions, switch money.razorpayPass), on an iPhone
 * (App Store, money.storekit) and the Platinum free report (money.platinumReport). Used by
 * app/pass/page.tsx and components/pass/PassBenefits.tsx. The other eight languages are in
 * i18n/generated/*.json.
 */
export const storePassBundle: RoadmapBundle = {
  en: {
    pass: {
      web: {
        subscribe: "Subscribe on the website",
        note: "Renews every month. Cancel any time on this page.",
        cancel: "Stop renewing",
        cancelConfirm: "Stop renewing? Your Pass keeps working until {{date}}.",
        cancelled: "Renewal is off. Your Pass runs until {{date}}.",
        sourceWeb: "Bought on the website",
        pending: "Your payment is still being confirmed. Check again in a minute.",
      },
      appStore: {
        buy: "Subscribe with Apple",
        note: "Renews every month. Manage it in your Apple ID subscriptions.",
        restore: "Restore purchases",
        sourceApp: "Bought on the App Store",
        manage: "Manage in the App Store",
      },
      benefits: { freeReport: "One report free every 30 days" },
      freeReportReady: "Your free report for this period is ready. Pick any single report and it costs nothing.",
      freeReportUsed: "You have used this period's free report. The next one comes with your next Pass month.",
    },
  },
  hi: {
    pass: {
      web: {
        subscribe: "वेबसाइट पर सब्सक्राइब करें",
        note: "हर महीने अपने आप नवीनीकरण होता है। इसी पेज पर कभी भी रद्द करें।",
        cancel: "नवीनीकरण बंद करें",
        cancelConfirm: "नवीनीकरण बंद करें? आपका पास {{date}} तक चलता रहेगा।",
        cancelled: "नवीनीकरण बंद है। आपका पास {{date}} तक चलेगा।",
        sourceWeb: "वेबसाइट पर खरीदा गया",
        pending: "आपके भुगतान की पुष्टि अभी हो रही है। एक मिनट बाद फिर देखें।",
      },
      appStore: {
        buy: "Apple से सब्सक्राइब करें",
        note: "हर महीने अपने आप नवीनीकरण होता है। इसे अपनी Apple ID सब्सक्रिप्शन में संभालें।",
        restore: "खरीदारी बहाल करें",
        sourceApp: "App Store से खरीदा गया",
        manage: "App Store में संभालें",
      },
      benefits: { freeReport: "हर 30 दिन में एक रिपोर्ट मुफ़्त" },
      freeReportReady: "इस अवधि की आपकी मुफ़्त रिपोर्ट तैयार है। कोई भी एक रिपोर्ट चुनें, उसका कोई शुल्क नहीं।",
      freeReportUsed: "आप इस अवधि की मुफ़्त रिपोर्ट ले चुके हैं। अगली आपके अगले पास महीने के साथ मिलेगी।",
    },
  },
  bn: {
    pass: {
      web: {
        subscribe: "ওয়েবসাইটে সাবস্ক্রাইব করুন",
        note: "প্রতি মাসে নিজে থেকে নবায়ন হয়। এই পাতাতেই যেকোনো সময় বাতিল করুন।",
        cancel: "নবায়ন বন্ধ করুন",
        cancelConfirm: "নবায়ন বন্ধ করবেন? আপনার পাস {{date}} পর্যন্ত চলবে।",
        cancelled: "নবায়ন বন্ধ আছে। আপনার পাস {{date}} পর্যন্ত চলবে।",
        sourceWeb: "ওয়েবসাইটে কেনা",
        pending: "আপনার পেমেন্ট এখনও নিশ্চিত হচ্ছে। এক মিনিট পরে আবার দেখুন।",
      },
      appStore: {
        buy: "Apple দিয়ে সাবস্ক্রাইব করুন",
        note: "প্রতি মাসে নিজে থেকে নবায়ন হয়। আপনার Apple ID সাবস্ক্রিপশনে এটি পরিচালনা করুন।",
        restore: "কেনাকাটা পুনরুদ্ধার করুন",
        sourceApp: "App Store থেকে কেনা",
        manage: "App Store-এ পরিচালনা করুন",
      },
      benefits: { freeReport: "প্রতি ৩০ দিনে একটি রিপোর্ট বিনামূল্যে" },
      freeReportReady: "এই সময়ের আপনার বিনামূল্যের রিপোর্ট তৈরি। যেকোনো একটি রিপোর্ট বেছে নিন, কোনো খরচ নেই।",
      freeReportUsed: "আপনি এই সময়ের বিনামূল্যের রিপোর্ট নিয়ে ফেলেছেন। পরেরটি আপনার পরের পাস মাসের সঙ্গে আসবে।",
    },
  },
  mr: {
    pass: {
      web: {
        subscribe: "वेबसाइटवर सब्सक्राइब करा",
        note: "दर महिन्याला आपोआप नूतनीकरण होते. याच पानावर केव्हाही रद्द करा.",
        cancel: "नूतनीकरण थांबवा",
        cancelConfirm: "नूतनीकरण थांबवायचे? तुमचा पास {{date}} पर्यंत चालू राहील.",
        cancelled: "नूतनीकरण बंद आहे. तुमचा पास {{date}} पर्यंत चालेल.",
        sourceWeb: "वेबसाइटवर खरेदी केले",
        pending: "तुमच्या पेमेंटची खात्री अजून होत आहे. एक मिनिटाने पुन्हा पहा.",
      },
      appStore: {
        buy: "Apple वरून सब्सक्राइब करा",
        note: "दर महिन्याला आपोआप नूतनीकरण होते. तुमच्या Apple ID सब्सक्रिप्शनमध्ये व्यवस्थापित करा.",
        restore: "खरेदी पुन्हा मिळवा",
        sourceApp: "App Store वरून खरेदी केले",
        manage: "App Store मध्ये व्यवस्थापित करा",
      },
      benefits: { freeReport: "दर ३० दिवसांनी एक रिपोर्ट मोफत" },
      freeReportReady: "या कालावधीचा तुमचा मोफत रिपोर्ट तयार आहे. कोणताही एक रिपोर्ट निवडा, त्याचे पैसे लागत नाहीत.",
      freeReportUsed: "तुम्ही या कालावधीचा मोफत रिपोर्ट घेतला आहे. पुढचा तुमच्या पुढच्या पास महिन्यासोबत मिळेल.",
    },
  },
  te: {
    pass: {
      web: {
        subscribe: "వెబ్‌సైట్‌లో సబ్‌స్క్రైబ్ చేయండి",
        note: "ప్రతి నెలా ఆటోమేటిక్‌గా రెన్యూ అవుతుంది. ఈ పేజీలోనే ఎప్పుడైనా రద్దు చేయండి.",
        cancel: "రెన్యూవల్ ఆపండి",
        cancelConfirm: "రెన్యూవల్ ఆపాలా? మీ పాస్ {{date}} వరకు పనిచేస్తుంది.",
        cancelled: "రెన్యూవల్ ఆఫ్‌లో ఉంది. మీ పాస్ {{date}} వరకు ఉంటుంది.",
        sourceWeb: "వెబ్‌సైట్‌లో కొన్నది",
        pending: "మీ చెల్లింపు ఇంకా నిర్ధారణ అవుతోంది. ఒక నిమిషం తర్వాత మళ్లీ చూడండి.",
      },
      appStore: {
        buy: "Apple ద్వారా సబ్‌స్క్రైబ్ చేయండి",
        note: "ప్రతి నెలా ఆటోమేటిక్‌గా రెన్యూ అవుతుంది. మీ Apple ID సబ్‌స్క్రిప్షన్లలో నిర్వహించండి.",
        restore: "కొనుగోళ్లను పునరుద్ధరించండి",
        sourceApp: "App Store లో కొన్నది",
        manage: "App Store లో నిర్వహించండి",
      },
      benefits: { freeReport: "ప్రతి 30 రోజులకు ఒక రిపోర్ట్ ఉచితం" },
      freeReportReady: "ఈ కాలానికి మీ ఉచిత రిపోర్ట్ సిద్ధంగా ఉంది. ఏదైనా ఒక రిపోర్ట్ ఎంచుకోండి, దానికి ఖర్చు లేదు.",
      freeReportUsed: "మీరు ఈ కాలపు ఉచిత రిపోర్ట్ వాడేశారు. తర్వాతది మీ తదుపరి పాస్ నెలతో వస్తుంది.",
    },
  },
  ta: {
    pass: {
      web: {
        subscribe: "இணையதளத்தில் சந்தா செலுத்துங்கள்",
        note: "ஒவ்வொரு மாதமும் தானாகப் புதுப்பிக்கப்படும். இந்தப் பக்கத்திலேயே எப்போது வேண்டுமானாலும் ரத்து செய்யலாம்.",
        cancel: "புதுப்பிப்பை நிறுத்து",
        cancelConfirm: "புதுப்பிப்பை நிறுத்தவா? உங்கள் பாஸ் {{date}} வரை செயல்படும்.",
        cancelled: "புதுப்பிப்பு நிறுத்தப்பட்டது. உங்கள் பாஸ் {{date}} வரை இருக்கும்.",
        sourceWeb: "இணையதளத்தில் வாங்கியது",
        pending: "உங்கள் பணம் செலுத்துதல் இன்னும் உறுதிசெய்யப்படுகிறது. ஒரு நிமிடம் கழித்து மீண்டும் பாருங்கள்.",
      },
      appStore: {
        buy: "Apple மூலம் சந்தா செலுத்துங்கள்",
        note: "ஒவ்வொரு மாதமும் தானாகப் புதுப்பிக்கப்படும். உங்கள் Apple ID சந்தாக்களில் நிர்வகிக்கலாம்.",
        restore: "வாங்கியவற்றை மீட்டெடு",
        sourceApp: "App Store இல் வாங்கியது",
        manage: "App Store இல் நிர்வகிக்கவும்",
      },
      benefits: { freeReport: "ஒவ்வொரு 30 நாட்களுக்கும் ஒரு அறிக்கை இலவசம்" },
      freeReportReady: "இந்தக் காலத்துக்கான உங்கள் இலவச அறிக்கை தயார். எந்த ஒரு அறிக்கையையும் தேர்ந்தெடுங்கள், கட்டணம் இல்லை.",
      freeReportUsed: "இந்தக் காலத்தின் இலவச அறிக்கையை பயன்படுத்திவிட்டீர்கள். அடுத்தது உங்கள் அடுத்த பாஸ் மாதத்துடன் வரும்.",
    },
  },
  gu: {
    pass: {
      web: {
        subscribe: "વેબસાઇટ પર સબ્સ્ક્રાઇબ કરો",
        note: "દર મહિને આપમેળે નવીનીકરણ થાય છે. આ જ પેજ પર ગમે ત્યારે રદ કરો.",
        cancel: "નવીનીકરણ બંધ કરો",
        cancelConfirm: "નવીનીકરણ બંધ કરવું છે? તમારો પાસ {{date}} સુધી ચાલુ રહેશે.",
        cancelled: "નવીનીકરણ બંધ છે. તમારો પાસ {{date}} સુધી ચાલશે.",
        sourceWeb: "વેબસાઇટ પર ખરીદ્યો",
        pending: "તમારી ચુકવણીની પુષ્ટિ હજી થઈ રહી છે. એક મિનિટ પછી ફરી જુઓ.",
      },
      appStore: {
        buy: "Apple થી સબ્સ્ક્રાઇબ કરો",
        note: "દર મહિને આપમેળે નવીનીકરણ થાય છે. તમારા Apple ID સબ્સ્ક્રિપ્શનમાં મેનેજ કરો.",
        restore: "ખરીદીઓ પાછી મેળવો",
        sourceApp: "App Store પરથી ખરીદ્યો",
        manage: "App Store માં મેનેજ કરો",
      },
      benefits: { freeReport: "દર 30 દિવસે એક રિપોર્ટ મફત" },
      freeReportReady: "આ સમયગાળાનો તમારો મફત રિપોર્ટ તૈયાર છે. કોઈ પણ એક રિપોર્ટ પસંદ કરો, તેનો કોઈ ચાર્જ નથી.",
      freeReportUsed: "તમે આ સમયગાળાનો મફત રિપોર્ટ લઈ લીધો છે. આગળનો તમારા આગલા પાસ મહિના સાથે આવશે.",
    },
  },
};
