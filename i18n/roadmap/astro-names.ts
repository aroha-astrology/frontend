import type { RoadmapBundle } from "./types";

/**
 * Proper names the roadmap features show: the 27 nakshatras (keyed by the
 * engine's name, lowercased — "purvaphalguni") and the day's muhurta windows
 * (choghadiya names lowercased, plus Abhijit and Rahu Kaal).
 */
export const astroNamesBundle: RoadmapBundle = {
  en: {
    nakshatraNames: {
      ashwini: "Ashwini", bharani: "Bharani", krittika: "Krittika", rohini: "Rohini", mrigashira: "Mrigashira",
      ardra: "Ardra", punarvasu: "Punarvasu", pushya: "Pushya", ashlesha: "Ashlesha", magha: "Magha",
      purvaphalguni: "Purva Phalguni", uttaraphalguni: "Uttara Phalguni", hasta: "Hasta", chitra: "Chitra",
      swati: "Swati", vishakha: "Vishakha", anuradha: "Anuradha", jyeshtha: "Jyeshtha", moola: "Moola",
      purvaashadha: "Purva Ashadha", uttaraashadha: "Uttara Ashadha", shravana: "Shravana", dhanishta: "Dhanishta",
      shatabhisha: "Shatabhisha", purvabhadrapada: "Purva Bhadrapada", uttarabhadrapada: "Uttara Bhadrapada", revati: "Revati",
    },
    muhurtaNames: {
      amrit: "Amrit", shubh: "Shubh", labh: "Labh", char: "Char", rog: "Rog", kaal: "Kaal", udveg: "Udveg",
      abhijit: "Abhijit Muhurta", rahuKaal: "Rahu Kaal",
    },
  },
  hi: {
    nakshatraNames: {
      ashwini: "अश्विनी", bharani: "भरणी", krittika: "कृत्तिका", rohini: "रोहिणी", mrigashira: "मृगशिरा",
      ardra: "आर्द्रा", punarvasu: "पुनर्वसु", pushya: "पुष्य", ashlesha: "आश्लेषा", magha: "मघा",
      purvaphalguni: "पूर्वा फाल्गुनी", uttaraphalguni: "उत्तरा फाल्गुनी", hasta: "हस्त", chitra: "चित्रा",
      swati: "स्वाति", vishakha: "विशाखा", anuradha: "अनुराधा", jyeshtha: "ज्येष्ठा", moola: "मूल",
      purvaashadha: "पूर्वाषाढ़ा", uttaraashadha: "उत्तराषाढ़ा", shravana: "श्रवण", dhanishta: "धनिष्ठा",
      shatabhisha: "शतभिषा", purvabhadrapada: "पूर्वा भाद्रपद", uttarabhadrapada: "उत्तरा भाद्रपद", revati: "रेवती",
    },
    muhurtaNames: {
      amrit: "अमृत", shubh: "शुभ", labh: "लाभ", char: "चर", rog: "रोग", kaal: "काल", udveg: "उद्वेग",
      abhijit: "अभिजित मुहूर्त", rahuKaal: "राहु काल",
    },
  },
  bn: {
    nakshatraNames: {
      ashwini: "অশ্বিনী", bharani: "ভরণী", krittika: "কৃত্তিকা", rohini: "রোহিণী", mrigashira: "মৃগশিরা",
      ardra: "আর্দ্রা", punarvasu: "পুনর্বসু", pushya: "পুষ্যা", ashlesha: "অশ্লেষা", magha: "মঘা",
      purvaphalguni: "পূর্বফাল্গুনী", uttaraphalguni: "উত্তরফাল্গুনী", hasta: "হস্তা", chitra: "চিত্রা",
      swati: "স্বাতী", vishakha: "বিশাখা", anuradha: "অনুরাধা", jyeshtha: "জ্যেষ্ঠা", moola: "মূলা",
      purvaashadha: "পূর্বাষাঢ়া", uttaraashadha: "উত্তরাষাঢ়া", shravana: "শ্রবণা", dhanishta: "ধনিষ্ঠা",
      shatabhisha: "শতভিষা", purvabhadrapada: "পূর্বভাদ্রপদ", uttarabhadrapada: "উত্তরভাদ্রপদ", revati: "রেবতী",
    },
    muhurtaNames: {
      amrit: "অমৃত", shubh: "শুভ", labh: "লাভ", char: "চর", rog: "রোগ", kaal: "কাল", udveg: "উদ্বেগ",
      abhijit: "অভিজিৎ মুহূর্ত", rahuKaal: "রাহু কাল",
    },
  },
  mr: {
    nakshatraNames: {
      ashwini: "अश्विनी", bharani: "भरणी", krittika: "कृत्तिका", rohini: "रोहिणी", mrigashira: "मृगशीर्ष",
      ardra: "आर्द्रा", punarvasu: "पुनर्वसू", pushya: "पुष्य", ashlesha: "आश्लेषा", magha: "मघा",
      purvaphalguni: "पूर्वा फाल्गुनी", uttaraphalguni: "उत्तरा फाल्गुनी", hasta: "हस्त", chitra: "चित्रा",
      swati: "स्वाती", vishakha: "विशाखा", anuradha: "अनुराधा", jyeshtha: "ज्येष्ठा", moola: "मूळ",
      purvaashadha: "पूर्वाषाढा", uttaraashadha: "उत्तराषाढा", shravana: "श्रवण", dhanishta: "धनिष्ठा",
      shatabhisha: "शततारका", purvabhadrapada: "पूर्वा भाद्रपदा", uttarabhadrapada: "उत्तरा भाद्रपदा", revati: "रेवती",
    },
    muhurtaNames: {
      amrit: "अमृत", shubh: "शुभ", labh: "लाभ", char: "चर", rog: "रोग", kaal: "काळ", udveg: "उद्वेग",
      abhijit: "अभिजित मुहूर्त", rahuKaal: "राहू काळ",
    },
  },
  te: {
    nakshatraNames: {
      ashwini: "అశ్విని", bharani: "భరణి", krittika: "కృత్తిక", rohini: "రోహిణి", mrigashira: "మృగశిర",
      ardra: "ఆర్ద్ర", punarvasu: "పునర్వసు", pushya: "పుష్యమి", ashlesha: "ఆశ్లేష", magha: "మఖ",
      purvaphalguni: "పూర్వ ఫల్గుణి", uttaraphalguni: "ఉత్తర ఫల్గుణి", hasta: "హస్త", chitra: "చిత్త",
      swati: "స్వాతి", vishakha: "విశాఖ", anuradha: "అనూరాధ", jyeshtha: "జ్యేష్ఠ", moola: "మూల",
      purvaashadha: "పూర్వాషాఢ", uttaraashadha: "ఉత్తరాషాఢ", shravana: "శ్రవణం", dhanishta: "ధనిష్ఠ",
      shatabhisha: "శతభిషం", purvabhadrapada: "పూర్వాభాద్ర", uttarabhadrapada: "ఉత్తరాభాద్ర", revati: "రేవతి",
    },
    muhurtaNames: {
      amrit: "అమృత", shubh: "శుభ", labh: "లాభ", char: "చర", rog: "రోగ", kaal: "కాల", udveg: "ఉద్వేగ",
      abhijit: "అభిజిత్ ముహూర్తం", rahuKaal: "రాహు కాలం",
    },
  },
  ta: {
    nakshatraNames: {
      ashwini: "அஸ்வினி", bharani: "பரணி", krittika: "கார்த்திகை", rohini: "ரோகிணி", mrigashira: "மிருகசீரிடம்",
      ardra: "திருவாதிரை", punarvasu: "புனர்பூசம்", pushya: "பூசம்", ashlesha: "ஆயில்யம்", magha: "மகம்",
      purvaphalguni: "பூரம்", uttaraphalguni: "உத்திரம்", hasta: "அஸ்தம்", chitra: "சித்திரை",
      swati: "சுவாதி", vishakha: "விசாகம்", anuradha: "அனுஷம்", jyeshtha: "கேட்டை", moola: "மூலம்",
      purvaashadha: "பூராடம்", uttaraashadha: "உத்திராடம்", shravana: "திருவோணம்", dhanishta: "அவிட்டம்",
      shatabhisha: "சதயம்", purvabhadrapada: "பூரட்டாதி", uttarabhadrapada: "உத்திரட்டாதி", revati: "ரேவதி",
    },
    muhurtaNames: {
      amrit: "அமிர்தம்", shubh: "சுபம்", labh: "லாபம்", char: "சரம்", rog: "ரோகம்", kaal: "காலம்", udveg: "உத்வேகம்",
      abhijit: "அபிஜித் முகூர்த்தம்", rahuKaal: "ராகு காலம்",
    },
  },
  gu: {
    nakshatraNames: {
      ashwini: "અશ્વિની", bharani: "ભરણી", krittika: "કૃત્તિકા", rohini: "રોહિણી", mrigashira: "મૃગશીર્ષ",
      ardra: "આર્દ્રા", punarvasu: "પુનર્વસુ", pushya: "પુષ્ય", ashlesha: "આશ્લેષા", magha: "મઘા",
      purvaphalguni: "પૂર્વા ફાલ્ગુની", uttaraphalguni: "ઉત્તરા ફાલ્ગુની", hasta: "હસ્ત", chitra: "ચિત્રા",
      swati: "સ્વાતિ", vishakha: "વિશાખા", anuradha: "અનુરાધા", jyeshtha: "જ્યેષ્ઠા", moola: "મૂળ",
      purvaashadha: "પૂર્વાષાઢા", uttaraashadha: "ઉત્તરાષાઢા", shravana: "શ્રવણ", dhanishta: "ધનિષ્ઠા",
      shatabhisha: "શતભિષા", purvabhadrapada: "પૂર્વા ભાદ્રપદ", uttarabhadrapada: "ઉત્તરા ભાદ્રપદ", revati: "રેવતી",
    },
    muhurtaNames: {
      amrit: "અમૃત", shubh: "શુભ", labh: "લાભ", char: "ચલ", rog: "રોગ", kaal: "કાળ", udveg: "ઉદ્વેગ",
      abhijit: "અભિજિત મુહૂર્ત", rahuKaal: "રાહુ કાળ",
    },
  },
};
