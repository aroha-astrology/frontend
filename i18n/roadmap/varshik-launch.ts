import type { RoadmapBundle } from "./types";

/**
 * The Varshik Rashifal 2027 launch pop-up (components/reports/ReportLaunchModal). English passed through the
 * humanizer; the other languages translated through apinex (free/gemini-3.8-flash) and checked for the report name,
 * ordinary digits and dashes. The six bundle languages are here, the other eight are in i18n/generated/*.json. The
 * report's name stays in English in every language, as in the report's own label.
 */
export const varshikLaunchBundle: RoadmapBundle = {
  en: {
    varshikLaunch: {
      badge: "New for 2027",
      title: "Your 2027, month by month",
      body: "Varshik Rashifal is your year ahead, read from your birth chart and your two Varsha charts. It shows which months favour you and which ask for care.",
      cta: "See your 2027",
      later: "Maybe later",
    },
  },
  hi: {
    varshikLaunch: {
      badge: "2027 के लिए नया",
      title: "आपका 2027, महीनेवार",
      body: "Varshik Rashifal आपका आने वाला साल है, जिसे आपकी जन्म कुंडली और आपकी दो वार्षिक कुंडलियों से पढ़ा जाता है। यह बताता है कि कौन-से महीने आपके पक्ष में हैं और किनमें सावधानी बरतनी है।",
      cta: "अपना 2027 देखें",
      later: "शायद बाद में",
    },
  },
  bn: {
    varshikLaunch: {
      badge: "2027 সালের জন্য নতুন",
      title: "আপনার 2027, মাস অনুযায়ী",
      body: "Varshik Rashifal হল আপনার আগামী বছর, যা পড়ুন আপনার জন্ম চার্ট এবং আপনার দুটি Varsha চার্ট থেকে। এটি দেখায় কোন মাস আপনার পক্ষে অনুকূল এবং কোনটিতে সতর্কতা প্রয়োজন।",
      cta: "আপনার 2027 দেখুন",
      later: "হয়তো পরে",
    },
  },
  mr: {
    varshikLaunch: {
      badge: "2027 साठी नवीन",
      title: "तुमचे 2027, महिन्यानुसार",
      body: "Varshik Rashifal हा तुमचा पुढचा वर्ष आहे, जो तुमच्या जन्मकुंडली आणि तुमच्या दोन वार्षिक कुंडल्यांवरून वाचला जातो. यात कोणते महिने तुमच्या बाजूने आहेत आणि कोणत्या काळजीची गरज आहे, ते दिसते.",
      cta: "तुमचे 2027 पहा",
      later: "शक्यतो नंतर",
    },
  },
  te: {
    varshikLaunch: {
      badge: "2027 కొత్తగా",
      title: "మీ 2027, నెలవారీగా",
      body: "Varshik Rashifal అనేది మీ భవిష్యత్ సంవత్సరం. మీ జన్మ కుండలీ మరియు మీ రెండు వర్ష కుండలు ఆధారంగా దీనిని చదవండి. మీకు అనుకూలమైన నెలలు, జాగ్రత్త అవసరమైన నెలలు ఇందులో కనిపిస్తాయి.",
      cta: "మీ 2027 చూడండి",
      later: "తర్వాత చూద్దాం",
    },
  },
  ta: {
    varshikLaunch: {
      badge: "2027-க்கு புதியது",
      title: "உங்கள் 2027, மாதம் வாரியாக",
      body: "Varshik Rashifal உங்கள் அடுத்த ஆண்டு. உங்கள் பிறப்பு ஜாதகம் மற்றும் உங்கள் இரண்டு Varsha ஜாதகங்களின் அடிப்படையில் இதைப் படியுங்கள். எந்த மாதங்கள் உங்களுக்கு நல்லவை, எவை கவனம் தேவை என்பதை இது காட்டும்.",
      cta: "உங்கள் 2027-ஐப் பார்க்க",
      later: "சரி, பிறகு",
    },
  },
  gu: {
    varshikLaunch: {
      badge: "2027 માટે નવું",
      title: "તમારું 2027, મહિનાવાર",
      body: "Varshik Rashifal તમારું આગામી વર્ષ છે, જે તમારા જન્મ ચાર્ટ અને તમારા બે Varsha ચાર્ટ પરથી વાંચવામાં આવે છે. તે દર્શાવે છે કયા મહિના તમારા પક્ષમાં છે અને કયામાં સાવધાનીની જરૂર છે.",
      cta: "તમારું 2027 જુઓ",
      later: "શક્ય છે પછી",
    },
  },
};
