import type { RoadmapBundle } from "./types";

/** v7 Sprint 2 — the travel pill, the home city and NRI mode (switches experience.travelPill, experience.nriMode). */
export const travelBundle: RoadmapBundle = {
  en: {
    travel: {
      pill: {
        title: "You're in {{city}}",
        body: "Show Panchang and daily times for here, or keep {{home}} times?",
        use: "Use {{city}}",
        keep: "Keep {{home}}",
      },
      showingFor: "Showing times for {{city}}",
      homeTimes: "Home times: {{city}}",
      settings: {
        homeCity: "Home city",
        homeCityHint: "Set it to use the travel pill",
        homeCityBody: "The city you call home. When your phone is somewhere else, we offer to show times for there or keep home.",
        homeCityPlaceholder: "Search your home city",
        save: "Save home city",
        nri: "I live outside India",
        nriHint: "Panchang shows local times and Delhi (IST)",
      },
    },
  },
  hi: {
    travel: {
      pill: {
        title: "आप {{city}} में हैं",
        body: "यहाँ के लिए पंचांग और दैनिक समय दिखाएँ, या {{home}} का समय रखें?",
        use: "{{city}} का समय",
        keep: "{{home}} रखें",
      },
      showingFor: "{{city}} का समय दिखाया जा रहा है",
      homeTimes: "घर का समय: {{city}}",
      settings: {
        homeCity: "घर का शहर",
        homeCityHint: "यात्रा सुझाव के लिए इसे चुनें",
        homeCityBody: "वह शहर जिसे आप घर कहते हैं। जब आपका फ़ोन कहीं और हो, तो हम वहाँ का समय दिखाने या घर का रखने का विकल्प देते हैं।",
        homeCityPlaceholder: "अपना घर का शहर खोजें",
        save: "घर का शहर सहेजें",
        nri: "मैं भारत से बाहर रहता/रहती हूँ",
        nriHint: "पंचांग स्थानीय समय और दिल्ली (IST) दिखाता है",
      },
    },
  },
  bn: {
    travel: {
      pill: {
        title: "আপনি {{city}}-এ আছেন",
        body: "এখানকার জন্য পঞ্চাঙ্গ ও দৈনিক সময় দেখাব, নাকি {{home}}-এর সময় রাখব?",
        use: "{{city}}-এর সময়",
        keep: "{{home}} রাখুন",
      },
      showingFor: "{{city}}-এর সময় দেখানো হচ্ছে",
      homeTimes: "বাড়ির সময়: {{city}}",
      settings: {
        homeCity: "বাড়ির শহর",
        homeCityHint: "ভ্রমণ পরামর্শ পেতে এটি ঠিক করুন",
        homeCityBody: "যে শহরকে আপনি বাড়ি বলেন। ফোন অন্য কোথাও থাকলে সেখানকার সময় দেখানো বা বাড়ির সময় রাখার বিকল্প দিই।",
        homeCityPlaceholder: "আপনার বাড়ির শহর খুঁজুন",
        save: "বাড়ির শহর সংরক্ষণ করুন",
        nri: "আমি ভারতের বাইরে থাকি",
        nriHint: "পঞ্চাঙ্গ স্থানীয় সময় ও দিল্লি (IST) দেখায়",
      },
    },
  },
  mr: {
    travel: {
      pill: {
        title: "तुम्ही {{city}} मध्ये आहात",
        body: "इथल्यासाठी पंचांग आणि दैनिक वेळा दाखवू, की {{home}} ची वेळ ठेवू?",
        use: "{{city}} ची वेळ",
        keep: "{{home}} ठेवा",
      },
      showingFor: "{{city}} ची वेळ दाखवत आहे",
      homeTimes: "घरची वेळ: {{city}}",
      settings: {
        homeCity: "घराचे शहर",
        homeCityHint: "प्रवास सूचनेसाठी हे ठरवा",
        homeCityBody: "तुम्ही ज्या शहराला घर म्हणता ते. फोन दुसरीकडे असल्यास तिथली वेळ दाखवण्याचा किंवा घरची ठेवण्याचा पर्याय देतो.",
        homeCityPlaceholder: "तुमचे घराचे शहर शोधा",
        save: "घराचे शहर जतन करा",
        nri: "मी भारताबाहेर राहतो/राहते",
        nriHint: "पंचांग स्थानिक वेळ आणि दिल्ली (IST) दाखवते",
      },
    },
  },
  te: {
    travel: {
      pill: {
        title: "మీరు {{city}}లో ఉన్నారు",
        body: "ఇక్కడి కోసం పంచాంగం, రోజువారీ సమయాలు చూపాలా, లేదా {{home}} సమయాలను ఉంచాలా?",
        use: "{{city}} సమయం",
        keep: "{{home}} ఉంచండి",
      },
      showingFor: "{{city}} సమయాలు చూపిస్తున్నాం",
      homeTimes: "ఇంటి సమయం: {{city}}",
      settings: {
        homeCity: "ఇంటి నగరం",
        homeCityHint: "ప్రయాణ సూచన కోసం దీన్ని సెట్ చేయండి",
        homeCityBody: "మీరు ఇల్లు అని పిలిచే నగరం. మీ ఫోన్ వేరే చోట ఉంటే, అక్కడి సమయాలు చూపడం లేదా ఇంటి సమయాలు ఉంచడం అనే ఎంపిక ఇస్తాం.",
        homeCityPlaceholder: "మీ ఇంటి నగరాన్ని వెతకండి",
        save: "ఇంటి నగరాన్ని సేవ్ చేయండి",
        nri: "నేను భారతదేశం బయట ఉంటాను",
        nriHint: "పంచాంగం స్థానిక సమయం మరియు ఢిల్లీ (IST) చూపుతుంది",
      },
    },
  },
  ta: {
    travel: {
      pill: {
        title: "நீங்கள் {{city}}யில் இருக்கிறீர்கள்",
        body: "இங்குள்ள பஞ்சாங்கம், தினசரி நேரங்களைக் காட்டவா, அல்லது {{home}} நேரங்களை வைத்திருக்கவா?",
        use: "{{city}} நேரம்",
        keep: "{{home}} வைத்திரு",
      },
      showingFor: "{{city}} நேரங்கள் காட்டப்படுகின்றன",
      homeTimes: "வீட்டு நேரம்: {{city}}",
      settings: {
        homeCity: "வீட்டு நகரம்",
        homeCityHint: "பயண பரிந்துரைக்கு இதை அமைக்கவும்",
        homeCityBody: "நீங்கள் வீடு என்று அழைக்கும் நகரம். உங்கள் தொலைபேசி வேறு இடத்தில் இருந்தால், அங்குள்ள நேரங்களைக் காட்ட அல்லது வீட்டு நேரங்களை வைத்திருக்க விருப்பம் தருகிறோம்.",
        homeCityPlaceholder: "உங்கள் வீட்டு நகரத்தைத் தேடுங்கள்",
        save: "வீட்டு நகரத்தைச் சேமி",
        nri: "நான் இந்தியாவுக்கு வெளியே வசிக்கிறேன்",
        nriHint: "பஞ்சாங்கம் உள்ளூர் நேரத்தையும் டெல்லி (IST) நேரத்தையும் காட்டும்",
      },
    },
  },
  gu: {
    travel: {
      pill: {
        title: "તમે {{city}} માં છો",
        body: "અહીં માટે પંચાંગ અને દૈનિક સમય બતાવીએ, કે {{home}} નો સમય રાખીએ?",
        use: "{{city}} નો સમય",
        keep: "{{home}} રાખો",
      },
      showingFor: "{{city}} નો સમય બતાવી રહ્યા છીએ",
      homeTimes: "ઘરનો સમય: {{city}}",
      settings: {
        homeCity: "ઘરનું શહેર",
        homeCityHint: "પ્રવાસ સૂચન માટે આ સેટ કરો",
        homeCityBody: "જે શહેરને તમે ઘર કહો છો તે. ફોન બીજે હોય ત્યારે ત્યાંનો સમય બતાવવાનો કે ઘરનો રાખવાનો વિકલ્પ આપીએ છીએ.",
        homeCityPlaceholder: "તમારું ઘરનું શહેર શોધો",
        save: "ઘરનું શહેર સાચવો",
        nri: "હું ભારતની બહાર રહું છું",
        nriHint: "પંચાંગ સ્થાનિક સમય અને દિલ્હી (IST) બતાવે છે",
      },
    },
  },
};
