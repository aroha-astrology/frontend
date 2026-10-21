import type { RoadmapBundle } from "./types";

/**
 * Text for the places that used to assume a fact and now say so or ask
 * (2026-10-20 audit): the free chart without a birth time, the Vastu North check before the paid report,
 * the Palm hand choice, and the gender question some reports need.
 */
export const noAssumptionsBundle: RoadmapBundle = {
  en: {
    kundliPage: {
      noTimeCaveat:
        "You left the birth time blank, so this chart is cast for 12:00 noon. The ascendant and houses may be wrong; planet signs are reliable, except the Moon on a day it changes sign.",
    },
    vastu: {
      northBeforeReport:
        "Set where north is before the report: every room's direction depends on it. Close this sheet if the top of the drawing really is north.",
    },
    palm: { capture: { chooseHand: "Which hand do you write or work with mostly? We read that one first." } },
    reports: {
      questions: {
        readerGender: {
          label: "Your gender (this report's calculation depends on it)",
          female: "Female",
          male: "Male",
        },
      },
    },
  },
  hi: {
    kundliPage: {
      noTimeCaveat:
        "आपने जन्म समय खाली छोड़ा, इसलिए यह कुंडली दोपहर 12:00 के लिए बनी है। लग्न और भाव गलत हो सकते हैं; ग्रहों की राशियाँ भरोसेमंद हैं, सिवाय उस दिन के जब चंद्रमा राशि बदलता है।",
    },
    vastu: {
      northBeforeReport:
        "रिपोर्ट से पहले उत्तर दिशा तय करें: हर कमरे की दिशा इसी पर निर्भर है। अगर ड्रॉइंग का ऊपरी हिस्सा सच में उत्तर है तो यह शीट बंद कर दें।",
    },
    palm: { capture: { chooseHand: "आप ज़्यादातर किस हाथ से लिखते या काम करते हैं? पहले उसी हाथ को पढ़ा जाएगा।" } },
    reports: {
      questions: {
        readerGender: {
          label: "आपका लिंग (इस रिपोर्ट की गणना इस पर निर्भर है)",
          female: "महिला",
          male: "पुरुष",
        },
      },
    },
  },
  bn: {
    kundliPage: {
      noTimeCaveat:
        "আপনি জন্ম সময় খালি রেখেছেন, তাই এই কুণ্ডলী দুপুর ১২:০০-এর জন্য তৈরি। লগ্ন ও ভাব ভুল হতে পারে; গ্রহের রাশি নির্ভরযোগ্য, শুধু যেদিন চন্দ্র রাশি বদলায় সেদিন ছাড়া।",
    },
    vastu: {
      northBeforeReport:
        "রিপোর্টের আগে উত্তর দিক ঠিক করুন: প্রতিটি ঘরের দিক এর উপর নির্ভর করে। ছবির উপরের দিকটি সত্যিই উত্তর হলে এই শিটটি বন্ধ করুন।",
    },
    palm: { capture: { chooseHand: "আপনি বেশিরভাগ সময় কোন হাতে লেখেন বা কাজ করেন? সেই হাতটি আগে পড়া হবে।" } },
    reports: {
      questions: {
        readerGender: {
          label: "আপনার লিঙ্গ (এই রিপোর্টের গণনা এর উপর নির্ভর করে)",
          female: "মহিলা",
          male: "পুরুষ",
        },
      },
    },
  },
  mr: {
    kundliPage: {
      noTimeCaveat:
        "तुम्ही जन्मवेळ रिकामी ठेवली, म्हणून ही कुंडली दुपारी १२:०० साठी बनवली आहे. लग्न आणि भाव चुकीचे असू शकतात; ग्रहांच्या राशी विश्वासार्ह आहेत, फक्त चंद्र राशी बदलतो त्या दिवशी वगळता.",
    },
    vastu: {
      northBeforeReport:
        "अहवालापूर्वी उत्तर दिशा ठरवा: प्रत्येक खोलीची दिशा त्यावर अवलंबून आहे. चित्राचा वरचा भाग खरोखर उत्तर असेल तर ही शीट बंद करा.",
    },
    palm: { capture: { chooseHand: "तुम्ही बहुतेक वेळा कोणत्या हाताने लिहिता किंवा काम करता? तो हात आधी वाचला जाईल." } },
    reports: {
      questions: {
        readerGender: {
          label: "तुमचे लिंग (या अहवालाची गणना यावर अवलंबून आहे)",
          female: "स्त्री",
          male: "पुरुष",
        },
      },
    },
  },
  te: {
    kundliPage: {
      noTimeCaveat:
        "మీరు జన్మ సమయాన్ని ఖాళీగా వదిలారు, కాబట్టి ఈ కుండలి మధ్యాహ్నం 12:00 కోసం తయారైంది. లగ్నం, భావాలు తప్పు కావచ్చు; గ్రహాల రాశులు నమ్మదగినవి, చంద్రుడు రాశి మారే రోజు తప్ప.",
    },
    vastu: {
      northBeforeReport:
        "రిపోర్ట్‌కు ముందు ఉత్తర దిశను సెట్ చేయండి: ప్రతి గది దిశ దానిపై ఆధారపడి ఉంటుంది. డ్రాయింగ్ పైభాగం నిజంగా ఉత్తరమే అయితే ఈ షీట్‌ను మూసివేయండి.",
    },
    palm: { capture: { chooseHand: "మీరు ఎక్కువగా ఏ చేత్తో రాస్తారు లేదా పని చేస్తారు? ముందుగా ఆ చేతిని చదువుతాము." } },
    reports: {
      questions: {
        readerGender: {
          label: "మీ లింగం (ఈ రిపోర్ట్ లెక్క దీనిపై ఆధారపడి ఉంది)",
          female: "స్త్రీ",
          male: "పురుషుడు",
        },
      },
    },
  },
  ta: {
    kundliPage: {
      noTimeCaveat:
        "நீங்கள் பிறந்த நேரத்தை காலியாக விட்டதால், இந்த ஜாதகம் மதியம் 12:00-க்கு தயாரிக்கப்பட்டது. லக்னமும் பாவங்களும் தவறாக இருக்கலாம்; கிரக ராசிகள் நம்பகமானவை, சந்திரன் ராசி மாறும் நாளைத் தவிர.",
    },
    vastu: {
      northBeforeReport:
        "அறிக்கைக்கு முன் வடக்கு திசையை அமைக்கவும்: ஒவ்வொரு அறையின் திசையும் அதைப் பொறுத்தது. வரைபடத்தின் மேல்பகுதி உண்மையில் வடக்கு என்றால் இந்தத் தாளை மூடவும்.",
    },
    palm: { capture: { chooseHand: "நீங்கள் பெரும்பாலும் எந்தக் கையால் எழுதுவீர்கள் அல்லது வேலை செய்வீர்கள்? அந்தக் கை முதலில் படிக்கப்படும்." } },
    reports: {
      questions: {
        readerGender: {
          label: "உங்கள் பாலினம் (இந்த அறிக்கையின் கணக்கு இதைப் பொறுத்தது)",
          female: "பெண்",
          male: "ஆண்",
        },
      },
    },
  },
  gu: {
    kundliPage: {
      noTimeCaveat:
        "તમે જન્મ સમય ખાલી રાખ્યો, તેથી આ કુંડળી બપોરે ૧૨:૦૦ માટે બનાવી છે. લગ્ન અને ભાવ ખોટા હોઈ શકે; ગ્રહોની રાશિઓ ભરોસાપાત્ર છે, ચંદ્ર રાશિ બદલે તે દિવસ સિવાય.",
    },
    vastu: {
      northBeforeReport:
        "રિપોર્ટ પહેલાં ઉત્તર દિશા નક્કી કરો: દરેક રૂમની દિશા તેના પર આધારિત છે. ચિત્રનો ઉપરનો ભાગ ખરેખર ઉત્તર હોય તો આ શીટ બંધ કરો.",
    },
    palm: { capture: { chooseHand: "તમે મોટે ભાગે કયા હાથથી લખો છો કે કામ કરો છો? તે હાથ પહેલા વાંચવામાં આવશે." } },
    reports: {
      questions: {
        readerGender: {
          label: "તમારું લિંગ (આ રિપોર્ટની ગણતરી તેના પર આધારિત છે)",
          female: "સ્ત્રી",
          male: "પુરુષ",
        },
      },
    },
  },
};
