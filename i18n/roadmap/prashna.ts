import type { RoadmapBundle } from "./types";

/**
 * v7 Sprint 3 — the 108 Prashna cards of the Morning Ritual, in all 7 hand-written languages and both looks.
 *
 * A card is a nakshatra (27 themes) seen through one of the four aims its pada stands for (dharma, artha,
 * kama, moksha): 27 x 4 = 108 distinct cards. The theme is a short noun phrase; each aim has one question
 * that takes the theme in its `{{theme}}` slot. Every question puts the theme first ("around X: ...", and the
 * equivalent postposition in the other languages), so the theme never has to change form and no verb has to
 * agree with its gender. Classic Vedic wording uses the traditional aims; Modern Cosmic uses plain ones.
 */
export const prashnaBundle: RoadmapBundle = {
  en: {
    prashna: {
      vedic: {
        lens: {
          dharma: { label: "Dharma", q: "Around {{theme}}: where does duty ask you to stand firm today?" },
          artha: { label: "Artha", q: "Around {{theme}}: what honest work can you do today?" },
          kama: { label: "Kama", q: "Around {{theme}}: what would you gladly give your heart to today?" },
          moksha: { label: "Moksha", q: "Around {{theme}}: what can you let go of today?" },
        },
        theme: {
          ashwini: "swift healing", bharani: "carrying your duties", krittika: "the purifying fire", rohini: "growth and abundance",
          mrigashira: "the search for truth", ardra: "the storm that renews", punarvasu: "return and renewal", pushya: "nourishing others",
          ashlesha: "hidden wisdom", magha: "lineage and honour", purvaphalguni: "joy and rest", uttaraphalguni: "steady support",
          hasta: "skill of the hands", chitra: "beauty in your work", swati: "independence", vishakha: "single-minded purpose",
          anuradha: "devotion and friendship", jyeshtha: "the duty of an elder", moola: "going to the root", purvaashadha: "unshaken courage",
          uttaraashadha: "lasting success", shravana: "deep listening", dhanishta: "abundance and rhythm", shatabhisha: "healing in privacy",
          purvabhadrapada: "burning away the old", uttarabhadrapada: "deep calm", revati: "a safe journey's end",
        },
      },
      cosmic: {
        lens: {
          dharma: { label: "Purpose", q: "Around {{theme}}: where do you want to take a stand today?" },
          artha: { label: "Work", q: "Around {{theme}}: what is one small thing you can build today?" },
          kama: { label: "Heart", q: "Around {{theme}}: what would you love to give your attention to today?" },
          moksha: { label: "Release", q: "Around {{theme}}: what can you release today?" },
        },
        theme: {
          ashwini: "a fresh start", bharani: "what you are carrying", krittika: "plain honesty", rohini: "steady growth",
          mrigashira: "curiosity", ardra: "letting feelings move", punarvasu: "a second chance", pushya: "care and nourishment",
          ashlesha: "your instincts", magha: "your roots", purvaphalguni: "pleasure and rest", uttaraphalguni: "reliable support",
          hasta: "craft and skill", chitra: "creative design", swati: "freedom", vishakha: "a clear goal",
          anuradha: "loyal friendship", jyeshtha: "protective leadership", moola: "getting to the root", purvaashadha: "quiet confidence",
          uttaraashadha: "long-term wins", shravana: "listening well", dhanishta: "momentum", shatabhisha: "solitude and healing",
          purvabhadrapada: "bold change", uttarabhadrapada: "inner depth", revati: "gentle completion",
        },
      },
    },
  },
  hi: {
    prashna: {
      vedic: {
        lens: {
          dharma: { label: "धर्म", q: "{{theme}} को लेकर: आज कर्तव्य आपसे कहाँ अडिग रहने को कहता है?" },
          artha: { label: "अर्थ", q: "{{theme}} को लेकर: आज आप कौन-सा ईमानदार काम कर सकते हैं?" },
          kama: { label: "काम", q: "{{theme}} को लेकर: आज आप किस बात को खुशी से अपना दिल देंगे?" },
          moksha: { label: "मोक्ष", q: "{{theme}} को लेकर: आज आप क्या छोड़ सकते हैं?" },
        },
        theme: {
          ashwini: "तेज़ उपचार", bharani: "अपने कर्तव्यों का वहन", krittika: "शुद्ध करने वाली अग्नि", rohini: "वृद्धि और समृद्धि",
          mrigashira: "सत्य की खोज", ardra: "नवजीवन देने वाला तूफ़ान", punarvasu: "वापसी और नवीकरण", pushya: "दूसरों का पोषण",
          ashlesha: "छिपी हुई बुद्धि", magha: "वंश और सम्मान", purvaphalguni: "आनंद और विश्राम", uttaraphalguni: "स्थिर सहारा",
          hasta: "हाथों का हुनर", chitra: "आपके काम की सुंदरता", swati: "स्वतंत्रता", vishakha: "एकाग्र लक्ष्य",
          anuradha: "भक्ति और मित्रता", jyeshtha: "बड़ों का दायित्व", moola: "जड़ तक पहुँचना", purvaashadha: "अडिग साहस",
          uttaraashadha: "स्थायी सफलता", shravana: "गहरा सुनना", dhanishta: "समृद्धि और लय", shatabhisha: "एकांत में उपचार",
          purvabhadrapada: "पुराने को जला देना", uttarabhadrapada: "गहरी शांति", revati: "सुरक्षित यात्रा का अंत",
        },
      },
      cosmic: {
        lens: {
          dharma: { label: "उद्देश्य", q: "{{theme}} को लेकर: आज आप कहाँ अपना रुख़ तय करना चाहेंगे?" },
          artha: { label: "काम", q: "{{theme}} को लेकर: आज आप कौन-सी एक छोटी चीज़ बना सकते हैं?" },
          kama: { label: "दिल", q: "{{theme}} को लेकर: आप आज किस पर अपना ध्यान देना पसंद करेंगे?" },
          moksha: { label: "छोड़ना", q: "{{theme}} को लेकर: आज आप क्या छोड़ सकते हैं?" },
        },
        theme: {
          ashwini: "नई शुरुआत", bharani: "जो आप ढो रहे हैं", krittika: "सीधी ईमानदारी", rohini: "स्थिर विकास",
          mrigashira: "जिज्ञासा", ardra: "भावनाओं को बहने देना", punarvasu: "दूसरा मौका", pushya: "देखभाल और पोषण",
          ashlesha: "आपकी अंतर्ज्ञान", magha: "आपकी जड़ें", purvaphalguni: "सुख और आराम", uttaraphalguni: "भरोसेमंद सहारा",
          hasta: "कारीगरी और कौशल", chitra: "रचनात्मक डिज़ाइन", swati: "आज़ादी", vishakha: "स्पष्ट लक्ष्य",
          anuradha: "वफ़ादार दोस्ती", jyeshtha: "रक्षा करने वाला नेतृत्व", moola: "असली वजह तक पहुँचना", purvaashadha: "शांत आत्मविश्वास",
          uttaraashadha: "लंबे समय की जीत", shravana: "अच्छी तरह सुनना", dhanishta: "गति", shatabhisha: "एकांत और उपचार",
          purvabhadrapada: "साहसी बदलाव", uttarabhadrapada: "भीतरी गहराई", revati: "कोमल समापन",
        },
      },
    },
  },
  bn: {
    prashna: {
      vedic: {
        lens: {
          dharma: { label: "ধর্ম", q: "{{theme}} নিয়ে: আজ কর্তব্য আপনাকে কোথায় অবিচল থাকতে বলে?" },
          artha: { label: "অর্থ", q: "{{theme}} নিয়ে: আজ আপনি কোন সৎ কাজটি করতে পারেন?" },
          kama: { label: "কাম", q: "{{theme}} নিয়ে: আজ আপনি কীসে খুশি মনে হৃদয় দেবেন?" },
          moksha: { label: "মোক্ষ", q: "{{theme}} নিয়ে: আজ আপনি কী ছেড়ে দিতে পারেন?" },
        },
        theme: {
          ashwini: "দ্রুত নিরাময়", bharani: "দায়িত্বের ভার বহন", krittika: "শুদ্ধ করা আগুন", rohini: "বৃদ্ধি ও প্রাচুর্য",
          mrigashira: "সত্যের অনুসন্ধান", ardra: "নবজীবন আনা ঝড়", punarvasu: "ফিরে আসা ও নবীকরণ", pushya: "অন্যকে পুষ্টি দেওয়া",
          ashlesha: "গোপন প্রজ্ঞা", magha: "বংশ ও সম্মান", purvaphalguni: "আনন্দ ও বিশ্রাম", uttaraphalguni: "স্থির আশ্রয়",
          hasta: "হাতের দক্ষতা", chitra: "কাজের সৌন্দর্য", swati: "স্বাধীনতা", vishakha: "একনিষ্ঠ লক্ষ্য",
          anuradha: "ভক্তি ও বন্ধুত্ব", jyeshtha: "প্রবীণের দায়িত্ব", moola: "মূলে পৌঁছানো", purvaashadha: "অটল সাহস",
          uttaraashadha: "স্থায়ী সাফল্য", shravana: "গভীর শোনা", dhanishta: "প্রাচুর্য ও ছন্দ", shatabhisha: "নির্জনে নিরাময়",
          purvabhadrapada: "পুরনোকে পুড়িয়ে ফেলা", uttarabhadrapada: "গভীর শান্তি", revati: "নিরাপদ যাত্রার সমাপ্তি",
        },
      },
      cosmic: {
        lens: {
          dharma: { label: "উদ্দেশ্য", q: "{{theme}} নিয়ে: আজ আপনি কোথায় অবস্থান নিতে চান?" },
          artha: { label: "কাজ", q: "{{theme}} নিয়ে: আজ আপনি কোন একটি ছোট জিনিস গড়ে তুলতে পারেন?" },
          kama: { label: "হৃদয়", q: "{{theme}} নিয়ে: আজ আপনি কীসে মনোযোগ দিতে ভালোবাসবেন?" },
          moksha: { label: "ছেড়ে দেওয়া", q: "{{theme}} নিয়ে: আজ আপনি কী ছেড়ে দিতে পারেন?" },
        },
        theme: {
          ashwini: "নতুন শুরু", bharani: "যা আপনি বয়ে বেড়াচ্ছেন", krittika: "সোজাসুজি সততা", rohini: "ধীর স্থির বৃদ্ধি",
          mrigashira: "কৌতূহল", ardra: "অনুভূতিকে বইতে দেওয়া", punarvasu: "দ্বিতীয় সুযোগ", pushya: "যত্ন ও পুষ্টি",
          ashlesha: "আপনার সহজাত বোধ", magha: "আপনার শিকড়", purvaphalguni: "আনন্দ ও বিশ্রাম", uttaraphalguni: "ভরসাযোগ্য সঙ্গ",
          hasta: "কারুশিল্প ও দক্ষতা", chitra: "সৃজনশীল নকশা", swati: "মুক্তি", vishakha: "পরিষ্কার লক্ষ্য",
          anuradha: "বিশ্বস্ত বন্ধুত্ব", jyeshtha: "রক্ষাকারী নেতৃত্ব", moola: "আসল কারণে পৌঁছানো", purvaashadha: "শান্ত আত্মবিশ্বাস",
          uttaraashadha: "দীর্ঘমেয়াদি জয়", shravana: "ভালো করে শোনা", dhanishta: "গতি", shatabhisha: "নিঃসঙ্গতা ও নিরাময়",
          purvabhadrapada: "সাহসী পরিবর্তন", uttarabhadrapada: "ভেতরের গভীরতা", revati: "কোমল সমাপ্তি",
        },
      },
    },
  },
  mr: {
    prashna: {
      vedic: {
        lens: {
          dharma: { label: "धर्म", q: "{{theme}} बद्दल: आज कर्तव्य तुम्हाला कुठे ठाम राहायला सांगते?" },
          artha: { label: "अर्थ", q: "{{theme}} बद्दल: आज तुम्ही कोणते प्रामाणिक काम करू शकता?" },
          kama: { label: "काम", q: "{{theme}} बद्दल: आज तुम्ही कशाला आनंदाने मन द्याल?" },
          moksha: { label: "मोक्ष", q: "{{theme}} बद्दल: आज तुम्ही काय सोडून देऊ शकता?" },
        },
        theme: {
          ashwini: "जलद उपचार", bharani: "कर्तव्यांचे वहन", krittika: "शुद्ध करणारा अग्नी", rohini: "वाढ आणि समृद्धी",
          mrigashira: "सत्याचा शोध", ardra: "नवजीवन देणारे वादळ", punarvasu: "परत येणे आणि नवीकरण", pushya: "इतरांचे पोषण",
          ashlesha: "दडलेले ज्ञान", magha: "वंश आणि सन्मान", purvaphalguni: "आनंद आणि विश्रांती", uttaraphalguni: "स्थिर आधार",
          hasta: "हातांचे कौशल्य", chitra: "तुमच्या कामातील सौंदर्य", swati: "स्वातंत्र्य", vishakha: "एकनिष्ठ ध्येय",
          anuradha: "भक्ती आणि मैत्री", jyeshtha: "ज्येष्ठाचे कर्तव्य", moola: "मुळापर्यंत जाणे", purvaashadha: "अढळ धैर्य",
          uttaraashadha: "टिकाऊ यश", shravana: "खोलवर ऐकणे", dhanishta: "समृद्धी आणि लय", shatabhisha: "एकांतातील उपचार",
          purvabhadrapada: "जुने जाळून टाकणे", uttarabhadrapada: "खोल शांतता", revati: "सुरक्षित प्रवासाचा शेवट",
        },
      },
      cosmic: {
        lens: {
          dharma: { label: "उद्देश", q: "{{theme}} बद्दल: आज तुम्हाला कुठे भूमिका घ्यायची आहे?" },
          artha: { label: "काम", q: "{{theme}} बद्दल: आज तुम्ही कोणती एक छोटी गोष्ट उभी करू शकता?" },
          kama: { label: "मन", q: "{{theme}} बद्दल: आज तुम्हाला कशाकडे लक्ष द्यायला आवडेल?" },
          moksha: { label: "सोडून देणे", q: "{{theme}} बद्दल: आज तुम्ही काय सोडून देऊ शकता?" },
        },
        theme: {
          ashwini: "नवी सुरुवात", bharani: "जे तुम्ही वाहून नेत आहात", krittika: "थेट प्रामाणिकपणा", rohini: "स्थिर वाढ",
          mrigashira: "जिज्ञासा", ardra: "भावनांना वाट देणे", punarvasu: "दुसरी संधी", pushya: "काळजी आणि पोषण",
          ashlesha: "तुमची अंतःप्रेरणा", magha: "तुमची मुळे", purvaphalguni: "सुख आणि आराम", uttaraphalguni: "विश्वासू आधार",
          hasta: "कलाकुसर आणि कौशल्य", chitra: "सर्जनशील रचना", swati: "मोकळीक", vishakha: "स्पष्ट ध्येय",
          anuradha: "निष्ठावान मैत्री", jyeshtha: "संरक्षक नेतृत्व", moola: "खऱ्या कारणापर्यंत पोहोचणे", purvaashadha: "शांत आत्मविश्वास",
          uttaraashadha: "दीर्घकालीन विजय", shravana: "नीट ऐकणे", dhanishta: "गती", shatabhisha: "एकांत आणि उपचार",
          purvabhadrapada: "धाडसी बदल", uttarabhadrapada: "आतली खोली", revati: "सौम्य समारोप",
        },
      },
    },
  },
  te: {
    prashna: {
      vedic: {
        lens: {
          dharma: { label: "ధర్మం", q: "{{theme}} విషయంలో: ఈ రోజు కర్తవ్యం మిమ్మల్ని ఎక్కడ స్థిరంగా నిలబడమంటోంది?" },
          artha: { label: "అర్థం", q: "{{theme}} విషయంలో: ఈ రోజు మీరు ఏ నిజాయితీ పని చేయగలరు?" },
          kama: { label: "కామం", q: "{{theme}} విషయంలో: ఈ రోజు మీరు దేనికి సంతోషంగా మనసు ఇస్తారు?" },
          moksha: { label: "మోక్షం", q: "{{theme}} విషయంలో: ఈ రోజు మీరు ఏమి వదిలేయగలరు?" },
        },
        theme: {
          ashwini: "వేగవంతమైన స్వస్థత", bharani: "బాధ్యతల భారం మోయడం", krittika: "శుద్ధి చేసే అగ్ని", rohini: "వృద్ధి మరియు సమృద్ధి",
          mrigashira: "సత్యాన్వేషణ", ardra: "కొత్త జీవం ఇచ్చే తుపాను", punarvasu: "తిరిగి రావడం మరియు పునరుద్ధరణ", pushya: "ఇతరులను పోషించడం",
          ashlesha: "దాగిన జ్ఞానం", magha: "వంశం మరియు గౌరవం", purvaphalguni: "ఆనందం మరియు విశ్రాంతి", uttaraphalguni: "స్థిరమైన ఆసరా",
          hasta: "చేతి నైపుణ్యం", chitra: "మీ పనిలోని అందం", swati: "స్వాతంత్ర్యం", vishakha: "ఏకాగ్రమైన లక్ష్యం",
          anuradha: "భక్తి మరియు స్నేహం", jyeshtha: "పెద్దవారి బాధ్యత", moola: "మూలానికి వెళ్ళడం", purvaashadha: "చెదరని ధైర్యం",
          uttaraashadha: "శాశ్వత విజయం", shravana: "లోతుగా వినడం", dhanishta: "సమృద్ధి మరియు లయ", shatabhisha: "ఏకాంతంలో స్వస్థత",
          purvabhadrapada: "పాతదాన్ని కాల్చివేయడం", uttarabhadrapada: "లోతైన ప్రశాంతత", revati: "సురక్షిత ప్రయాణపు ముగింపు",
        },
      },
      cosmic: {
        lens: {
          dharma: { label: "ఉద్దేశ్యం", q: "{{theme}} విషయంలో: ఈ రోజు మీరు ఎక్కడ నిలబడాలనుకుంటున్నారు?" },
          artha: { label: "పని", q: "{{theme}} విషయంలో: ఈ రోజు మీరు నిర్మించగల ఒక చిన్న విషయం ఏమిటి?" },
          kama: { label: "హృదయం", q: "{{theme}} విషయంలో: ఈ రోజు మీరు దేనిపై శ్రద్ధ పెట్టాలనుకుంటున్నారు?" },
          moksha: { label: "వదిలేయడం", q: "{{theme}} విషయంలో: ఈ రోజు మీరు ఏమి వదిలేయగలరు?" },
        },
        theme: {
          ashwini: "కొత్త ఆరంభం", bharani: "మీరు మోస్తున్నది", krittika: "సూటి నిజాయితీ", rohini: "స్థిరమైన ఎదుగుదల",
          mrigashira: "ఆసక్తి", ardra: "భావాలను ప్రవహించనివ్వడం", punarvasu: "రెండో అవకాశం", pushya: "శ్రద్ధ మరియు పోషణ",
          ashlesha: "మీ సహజ స్పృహ", magha: "మీ మూలాలు", purvaphalguni: "సుఖం మరియు విశ్రాంతి", uttaraphalguni: "నమ్మదగిన ఆసరా",
          hasta: "కళాకౌశలం మరియు నైపుణ్యం", chitra: "సృజనాత్మక రూపకల్పన", swati: "స్వేచ్ఛ", vishakha: "స్పష్టమైన లక్ష్యం",
          anuradha: "నమ్మకమైన స్నేహం", jyeshtha: "రక్షించే నాయకత్వం", moola: "అసలు కారణానికి చేరడం", purvaashadha: "ప్రశాంతమైన ఆత్మవిశ్వాసం",
          uttaraashadha: "దీర్ఘకాల విజయాలు", shravana: "బాగా వినడం", dhanishta: "ముందుకు సాగే వేగం", shatabhisha: "ఏకాంతం మరియు స్వస్థత",
          purvabhadrapada: "ధైర్యమైన మార్పు", uttarabhadrapada: "అంతర్గత లోతు", revati: "మృదువైన ముగింపు",
        },
      },
    },
  },
  ta: {
    prashna: {
      vedic: {
        lens: {
          dharma: { label: "தர்மம்", q: "{{theme}} பற்றி: இன்று கடமை உங்களை எங்கே உறுதியாக நிற்கச் சொல்கிறது?" },
          artha: { label: "அர்த்தம்", q: "{{theme}} பற்றி: இன்று நீங்கள் என்ன நேர்மையான வேலை செய்யலாம்?" },
          kama: { label: "காமம்", q: "{{theme}} பற்றி: இன்று எதற்கு மகிழ்ச்சியுடன் மனம் கொடுப்பீர்கள்?" },
          moksha: { label: "மோட்சம்", q: "{{theme}} பற்றி: இன்று எதை விட்டுவிடலாம்?" },
        },
        theme: {
          ashwini: "விரைவான குணமடைதல்", bharani: "கடமைகளைச் சுமத்தல்", krittika: "தூய்மையாக்கும் நெருப்பு", rohini: "வளர்ச்சியும் செழிப்பும்",
          mrigashira: "உண்மையைத் தேடுதல்", ardra: "புதுப்பிக்கும் புயல்", punarvasu: "திரும்புதலும் புதுப்பித்தலும்", pushya: "மற்றவரைப் போஷித்தல்",
          ashlesha: "மறைந்திருக்கும் ஞானம்", magha: "குலமும் மரியாதையும்", purvaphalguni: "மகிழ்ச்சியும் ஓய்வும்", uttaraphalguni: "உறுதியான ஆதரவு",
          hasta: "கைத்திறன்", chitra: "உங்கள் வேலையிலுள்ள அழகு", swati: "சுதந்திரம்", vishakha: "ஒருமுகப்பட்ட இலக்கு",
          anuradha: "பக்தியும் நட்பும்", jyeshtha: "மூத்தவரின் பொறுப்பு", moola: "வேர் வரை செல்லுதல்", purvaashadha: "அசையாத துணிவு",
          uttaraashadha: "நிலையான வெற்றி", shravana: "ஆழ்ந்து கேட்டல்", dhanishta: "செழிப்பும் தாளமும்", shatabhisha: "தனிமையில் குணமடைதல்",
          purvabhadrapada: "பழையதை எரித்தல்", uttarabhadrapada: "ஆழ்ந்த அமைதி", revati: "பாதுகாப்பான பயணத்தின் முடிவு",
        },
      },
      cosmic: {
        lens: {
          dharma: { label: "நோக்கம்", q: "{{theme}} பற்றி: இன்று நீங்கள் எங்கே உறுதியான நிலைப்பாடு எடுக்க விரும்புகிறீர்கள்?" },
          artha: { label: "பணி", q: "{{theme}} பற்றி: இன்று நீங்கள் உருவாக்கக்கூடிய ஒரு சிறிய விஷயம் என்ன?" },
          kama: { label: "இதயம்", q: "{{theme}} பற்றி: இன்று எதில் கவனம் செலுத்த விரும்புவீர்கள்?" },
          moksha: { label: "விடுவித்தல்", q: "{{theme}} பற்றி: இன்று எதை விட்டுவிடலாம்?" },
        },
        theme: {
          ashwini: "புதிய தொடக்கம்", bharani: "நீங்கள் சுமப்பது", krittika: "நேரடியான நேர்மை", rohini: "நிலையான வளர்ச்சி",
          mrigashira: "ஆர்வம்", ardra: "உணர்வுகளை ஓடவிடுதல்", punarvasu: "இரண்டாவது வாய்ப்பு", pushya: "அக்கறையும் போஷணையும்",
          ashlesha: "உங்கள் உள்ளுணர்வு", magha: "உங்கள் வேர்கள்", purvaphalguni: "இன்பமும் ஓய்வும்", uttaraphalguni: "நம்பகமான ஆதரவு",
          hasta: "கைவினையும் திறமையும்", chitra: "படைப்பாற்றல் வடிவமைப்பு", swati: "விடுதலை", vishakha: "தெளிவான இலக்கு",
          anuradha: "விசுவாசமான நட்பு", jyeshtha: "காக்கும் தலைமை", moola: "அடிப்படைக் காரணத்தை அடைதல்", purvaashadha: "அமைதியான தன்னம்பிக்கை",
          uttaraashadha: "நீண்டகால வெற்றிகள்", shravana: "நன்றாகக் கேட்டல்", dhanishta: "முன்னேற்ற வேகம்", shatabhisha: "தனிமையும் குணமடைதலும்",
          purvabhadrapada: "துணிச்சலான மாற்றம்", uttarabhadrapada: "உள் ஆழம்", revati: "மென்மையான நிறைவு",
        },
      },
    },
  },
  gu: {
    prashna: {
      vedic: {
        lens: {
          dharma: { label: "ધર્મ", q: "{{theme}} વિશે: આજે ફરજ તમને ક્યાં અડગ રહેવા કહે છે?" },
          artha: { label: "અર્થ", q: "{{theme}} વિશે: આજે તમે કયું પ્રામાણિક કામ કરી શકો?" },
          kama: { label: "કામ", q: "{{theme}} વિશે: આજે તમે શેને રાજીખુશીથી મન આપશો?" },
          moksha: { label: "મોક્ષ", q: "{{theme}} વિશે: આજે તમે શું છોડી શકો?" },
        },
        theme: {
          ashwini: "ઝડપી ઉપચાર", bharani: "ફરજોનો ભાર ઉઠાવવો", krittika: "શુદ્ધ કરનાર અગ્નિ", rohini: "વૃદ્ધિ અને સમૃદ્ધિ",
          mrigashira: "સત્યની શોધ", ardra: "નવજીવન આપતું તોફાન", punarvasu: "પાછા ફરવું અને નવીકરણ", pushya: "બીજાનું પોષણ",
          ashlesha: "છુપાયેલું જ્ઞાન", magha: "વંશ અને સન્માન", purvaphalguni: "આનંદ અને વિશ્રામ", uttaraphalguni: "સ્થિર આધાર",
          hasta: "હાથની કુશળતા", chitra: "તમારા કામની સુંદરતા", swati: "સ્વતંત્રતા", vishakha: "એકનિષ્ઠ લક્ષ્ય",
          anuradha: "ભક્તિ અને મિત્રતા", jyeshtha: "વડીલની જવાબદારી", moola: "મૂળ સુધી પહોંચવું", purvaashadha: "અડગ હિંમત",
          uttaraashadha: "કાયમી સફળતા", shravana: "ઊંડાણથી સાંભળવું", dhanishta: "સમૃદ્ધિ અને લય", shatabhisha: "એકાંતમાં ઉપચાર",
          purvabhadrapada: "જૂનાને બાળી નાખવું", uttarabhadrapada: "ઊંડી શાંતિ", revati: "સલામત સફરનો અંત",
        },
      },
      cosmic: {
        lens: {
          dharma: { label: "હેતુ", q: "{{theme}} વિશે: આજે તમે ક્યાં વલણ લેવા માગો છો?" },
          artha: { label: "કામ", q: "{{theme}} વિશે: આજે તમે કઈ એક નાની વસ્તુ બનાવી શકો?" },
          kama: { label: "હૃદય", q: "{{theme}} વિશે: આજે તમે શેના પર ધ્યાન આપવાનું પસંદ કરશો?" },
          moksha: { label: "છોડવું", q: "{{theme}} વિશે: આજે તમે શું છોડી શકો?" },
        },
        theme: {
          ashwini: "નવી શરૂઆત", bharani: "જે તમે ઉઠાવી રહ્યા છો", krittika: "સીધી પ્રામાણિકતા", rohini: "સ્થિર વિકાસ",
          mrigashira: "જિજ્ઞાસા", ardra: "લાગણીઓને વહેવા દેવી", punarvasu: "બીજી તક", pushya: "કાળજી અને પોષણ",
          ashlesha: "તમારી અંતઃસ્ફુરણા", magha: "તમારાં મૂળ", purvaphalguni: "સુખ અને આરામ", uttaraphalguni: "ભરોસાપાત્ર આધાર",
          hasta: "કારીગરી અને કુશળતા", chitra: "સર્જનાત્મક રચના", swati: "આઝાદી", vishakha: "સ્પષ્ટ લક્ષ્ય",
          anuradha: "વફાદાર મિત્રતા", jyeshtha: "રક્ષણ કરતું નેતૃત્વ", moola: "સાચા કારણ સુધી પહોંચવું", purvaashadha: "શાંત આત્મવિશ્વાસ",
          uttaraashadha: "લાંબા ગાળાની જીત", shravana: "સારી રીતે સાંભળવું", dhanishta: "ગતિ", shatabhisha: "એકાંત અને ઉપચાર",
          purvabhadrapada: "હિંમતભર્યો ફેરફાર", uttarabhadrapada: "અંદરની ઊંડાઈ", revati: "નરમ સમાપન",
        },
      },
    },
  },
};
