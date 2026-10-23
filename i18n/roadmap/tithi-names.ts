import type { RoadmapBundle } from "./types";

/**
 * The 16 tithi names (Pratipada ... Chaturdashi, Purnima, Amavasya), keyed by the engine's English name
 * lowercased. The same name serves both pakshas; the paksha is shown next to it. Used when the
 * lang.localNames switch is on. The other eight languages keep theirs in i18n/generated/*.json.
 */
export const tithiNamesBundle: RoadmapBundle = {
  en: {
    tithiNames: {
      pratipada: "Pratipada", dwitiya: "Dwitiya", tritiya: "Tritiya", chaturthi: "Chaturthi", panchami: "Panchami",
      shashthi: "Shashthi", saptami: "Saptami", ashtami: "Ashtami", navami: "Navami", dashami: "Dashami",
      ekadashi: "Ekadashi", dwadashi: "Dwadashi", trayodashi: "Trayodashi", chaturdashi: "Chaturdashi",
      purnima: "Purnima", amavasya: "Amavasya",
    },
  },
  hi: {
    tithiNames: {
      pratipada: "प्रतिपदा", dwitiya: "द्वितीया", tritiya: "तृतीया", chaturthi: "चतुर्थी", panchami: "पंचमी",
      shashthi: "षष्ठी", saptami: "सप्तमी", ashtami: "अष्टमी", navami: "नवमी", dashami: "दशमी",
      ekadashi: "एकादशी", dwadashi: "द्वादशी", trayodashi: "त्रयोदशी", chaturdashi: "चतुर्दशी",
      purnima: "पूर्णिमा", amavasya: "अमावस्या",
    },
  },
  bn: {
    tithiNames: {
      pratipada: "প্রতিপদ", dwitiya: "দ্বিতীয়া", tritiya: "তৃতীয়া", chaturthi: "চতুর্থী", panchami: "পঞ্চমী",
      shashthi: "ষষ্ঠী", saptami: "সপ্তমী", ashtami: "অষ্টমী", navami: "নবমী", dashami: "দশমী",
      ekadashi: "একাদশী", dwadashi: "দ্বাদশী", trayodashi: "ত্রয়োদশী", chaturdashi: "চতুর্দশী",
      purnima: "পূর্ণিমা", amavasya: "অমাবস্যা",
    },
  },
  mr: {
    tithiNames: {
      pratipada: "प्रतिपदा", dwitiya: "द्वितीया", tritiya: "तृतीया", chaturthi: "चतुर्थी", panchami: "पंचमी",
      shashthi: "षष्ठी", saptami: "सप्तमी", ashtami: "अष्टमी", navami: "नवमी", dashami: "दशमी",
      ekadashi: "एकादशी", dwadashi: "द्वादशी", trayodashi: "त्रयोदशी", chaturdashi: "चतुर्दशी",
      purnima: "पौर्णिमा", amavasya: "अमावस्या",
    },
  },
  te: {
    tithiNames: {
      pratipada: "పాడ్యమి", dwitiya: "విదియ", tritiya: "తదియ", chaturthi: "చవితి", panchami: "పంచమి",
      shashthi: "షష్ఠి", saptami: "సప్తమి", ashtami: "అష్టమి", navami: "నవమి", dashami: "దశమి",
      ekadashi: "ఏకాదశి", dwadashi: "ద్వాదశి", trayodashi: "త్రయోదశి", chaturdashi: "చతుర్దశి",
      purnima: "పౌర్ణమి", amavasya: "అమావాస్య",
    },
  },
  ta: {
    tithiNames: {
      pratipada: "பிரதமை", dwitiya: "துவிதியை", tritiya: "திருதியை", chaturthi: "சதுர்த்தி", panchami: "பஞ்சமி",
      shashthi: "சஷ்டி", saptami: "சப்தமி", ashtami: "அஷ்டமி", navami: "நவமி", dashami: "தசமி",
      ekadashi: "ஏகாதசி", dwadashi: "துவாதசி", trayodashi: "திரயோதசி", chaturdashi: "சதுர்த்தசி",
      purnima: "பௌர்ணமி", amavasya: "அமாவாசை",
    },
  },
  gu: {
    tithiNames: {
      pratipada: "પ્રતિપદા", dwitiya: "દ્વિતીયા", tritiya: "તૃતીયા", chaturthi: "ચતુર્થી", panchami: "પંચમી",
      shashthi: "ષષ્ઠી", saptami: "સપ્તમી", ashtami: "અષ્ટમી", navami: "નવમી", dashami: "દશમી",
      ekadashi: "એકાદશી", dwadashi: "દ્વાદશી", trayodashi: "ત્રયોદશી", chaturdashi: "ચતુર્દશી",
      purnima: "પૂર્ણિમા", amavasya: "અમાસ",
    },
  },
};
