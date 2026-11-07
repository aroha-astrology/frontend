import type { RoadmapBundle } from "./types";

/**
 * Varshik Rashifal 2027 chart text (components/reports/varshik): area, planet, tier, dosha and
 * decision names, labels, and the sky-event sentences. English plus the six bundle languages; the
 * other eight are in i18n/generated/*.json. Translated through apinex (free/gemini-3.8-flash).
 */
export const varshikBundle: RoadmapBundle = {
  en: {
    "reports": {
      "descriptions": {
        "varshik_rashifal_2027": "Your whole year ahead, month by month, read from your own chart and your two Varsha charts"
      },
      "labels": {
        "varshik_rashifal_2027": "Varshik Rashifal 2027"
      },
      "taglines": {
        "varshik_rashifal_2027": "Which months of 2027 are your best?"
      }
    },
    "varshik": {
      "area": {
        "career": "Career",
        "family": "Family",
        "growth": "Growth",
        "health": "Health",
        "love": "Love",
        "money": "Money",
        "travel": "Travel"
      },
      "areaBars": {
        "label": "Scores for the seven areas of life"
      },
      "areaMonth": {
        "best": "Best month",
        "label": "Twelve month score line for {{area}}",
        "rest": "Rest month"
      },
      "areas": {
        "best": "Best months",
        "intro": "Seven parts of life, each scored out of 100 for the whole of 2027. The next seven pages take them one at a time.",
        "overall": "Overall for 2027",
        "rest": "Quietest month"
      },
      "art": {
        "missing": "Artwork {{code}} to be added"
      },
      "birth": {
        "dasha": "Dasha at birth: {{planet}}, {{years}} years left",
        "date": "Born",
        "house": "house {{n}}",
        "lagna": "Lagna",
        "nakshatra": "Nakshatra",
        "time": "Time"
      },
      "card": {
        "eyebrow": "Varshik Rashifal 2027",
        "peaks": "Peak months: {{months}}",
        "yearLord": "Year Lord: {{planet}}"
      },
      "chapter": {
        "0": "Your report",
        "1": "The shape of your year",
        "2": "Seven areas of life",
        "3": "Your timing",
        "4": "Month by month",
        "5": "Carrying it with you",
        "6": "Your questions, answered"
      },
      "contents": {
        "chapter": "Chapter {{n}}"
      },
      "cover": {
        "eyebrow": "Varshik Rashifal",
        "title": "Your year ahead"
      },
      "decision": {
        "all": "All",
        "best": "Best window: {{from}} to {{to}} ({{score}}) {{tier}}",
        "business_launch": "Business launch",
        "commit_relationship": "Commit to a relationship",
        "family_time": "Family time",
        "filter": "Show one decision",
        "health_routine": "Health routine",
        "hold": "Hold: {{months}}",
        "main": "Your main decision",
        "marriage": "Marriage",
        "money_move": "Money move",
        "move_home": "Move home",
        "new_work": "New work",
        "noHold": "Nothing to hold",
        "study_exam": "Study and exams",
        "travel_abroad": "Travel abroad"
      },
      "dosha": {
        "activeIn": "Active in: {{months}}",
        "cancelledBy": "Cancelled because: {{reasons}}",
        "dhaiya": "Dhaiya",
        "grahan": "Grahan Dosha",
        "guruChandal": "Guru Chandal",
        "kaalSarp": "Kaal Sarp",
        "kemadruma": "Kemadruma",
        "mangal": "Mangal Dosha",
        "pitra": "Pitra Dosha",
        "quiet": "Quiet through 2027",
        "remedy": "Simple remedy",
        "sadeSati": "Sade Sati",
        "status": {
          "cancelled": "Cancelled",
          "not_present": "Not present",
          "present": "Present"
        },
        "touches": "Touches"
      },
      "effect": {
        "helping": "Helping",
        "neutral": "Steady",
        "weighing": "Weighing"
      },
      "error": {
        "noFacts": "This report could not be opened. Please try again in a moment."
      },
      "glance": {
        "caption": "Your 2027",
        "muntha": "Muntha house",
        "peaks": "Your three peak months",
        "rest": "Your month to rest",
        "yearLord": "Year Lord"
      },
      "golden": {
        "peak": "Peak on {{date}}",
        "then": "then {{from}} – {{to}}"
      },
      "impact": {
        "house": "House {{n}} in your birth chart",
        "months": "Best month: {{best}}. Harder month: {{hard}}.",
        "strength": "Strength",
        "topArea": "Strongest on: {{area}}"
      },
      "month": {
        "glance": "The month at a glance",
        "keyDates": "Key dates",
        "label": {
          "do": "What to do",
          "heart": "Love and health",
          "hold": "What to hold",
          "remedy": "This month's remedy",
          "work": "Career and money"
        },
        "living": "Living the month",
        "mudda": "Mudda lord",
        "sahamPeak": "Saham peak: {{name}}",
        "score": "Score for the month",
        "varsha": "Varsha chart of {{year}}, Lagna {{lagna}}"
      },
      "moves": {
        "bindusRange": "Bindus {{min}} to {{max}}",
        "label": "{{planet}} through the twelve months of 2027",
        "note": "Bindus show how supportive a house is for that planet; more is easier.",
        "segment": "{{from}} to {{to}} · house {{house}} · {{sign}} · {{bindus}} bindus",
        "segmentOne": "{{from}} · house {{house}} · {{sign}} · {{bindus}} bindus"
      },
      "nav": {
        "contents": "Contents",
        "label": "Report pages",
        "next": "Next",
        "page": "Page {{n}} of {{total}}",
        "prev": "Previous"
      },
      "opener": {
        "1": "Where the year begins: the score, the Year Lord, and the sky that frames it.",
        "2": "Love, career, money, health, family, growth and travel, one at a time.",
        "3": "When to move and when to wait: your twelve months, your rhythm, your dates.",
        "4": "Two pages for every month: the month at a glance, and how to live it."
      },
      "page": {
        "act": "When to act",
        "areas": "Seven areas of life",
        "birth": "Your birth chart",
        "card": "Your year on one card",
        "closing": "A closing letter from Baba Ji",
        "contents": "Contents",
        "doshas": "Doshas in your 2027",
        "glance": "2027 at a glance",
        "golden": "Golden windows and key dates",
        "moves": "The big moves of the sky",
        "planets": "Planet by planet",
        "preparedFor": "Prepared for {{name}}",
        "relief": "What you have been through, and what changes",
        "remedies": "Simple remedies",
        "rhythm": "The rhythm of your year",
        "sky": "Sky calendar 2027",
        "timing": "Your Master Timing Map",
        "varsha": "Your two Varsha years",
        "welcome": "Welcome",
        "yearLord": "Your Year Lord and Muntha",
        "yogas": "Yogas on your side"
      },
      "panchadhikari": {
        "aspectsLagna": "Sees the Lagna",
        "yearLord": "Year Lord"
      },
      "panchavargi": {
        "title": "Five-fold strength of the planets"
      },
      "planet": {
        "jupiter": "Jupiter",
        "ketu": "Ketu",
        "mars": "Mars",
        "mercury": "Mercury",
        "moon": "Moon",
        "rahu": "Rahu",
        "saturn": "Saturn",
        "sun": "Sun",
        "venus": "Venus"
      },
      "question": {
        "eases": "When it eases"
      },
      "relief": {
        "ahead": "The turning points ahead",
        "past": "The stretch behind you"
      },
      "ring": {
        "label": "Overall score {{score}} out of 100, {{tier}}"
      },
      "role": {
        "Dina-Ratri Pati": "Lord of day and night",
        "Janma Lagnesha": "Lord of your birth Lagna",
        "Munthesh": "Lord of the Muntha",
        "Tri-Rashi Pati": "Lord of the three signs",
        "Varsha Lagnesha": "Lord of the year's Lagna"
      },
      "sky": {
        "combust-in": "{{planet}} goes combust in {{sign}}, house {{house}}",
        "combust-out": "{{planet}} leaves combustion in {{sign}}, house {{house}}",
        "eclipse-lunar": "Lunar eclipse in {{sign}}, house {{house}} of your chart",
        "eclipse-solar": "Solar eclipse in {{sign}}, house {{house}} of your chart",
        "eclipseKey": "Gold marks are eclipses",
        "ingress": "{{planet}} enters {{sign}}, house {{house}}",
        "label": "Sky events through 2027",
        "station-direct": "{{planet}} turns direct in {{sign}}, house {{house}}",
        "station-retrograde": "{{planet}} turns retrograde in {{sign}}, house {{house}}"
      },
      "tier": {
        "go": "Go",
        "hold": "Rest",
        "steady": "Steady",
        "weigh": "Weigh"
      },
      "timeline": {
        "dayReturn": "Solar return by the day",
        "ends": "Ends",
        "house": "house {{n}}",
        "label": "Your two Varsha years",
        "lagna": "Varsha Lagna",
        "muntha": "Muntha",
        "starts": "Starts",
        "yearLord": "Year Lord"
      },
      "timing": {
        "tap": "Tap any tile to open that month."
      },
      "waiting": {
        "body": "This takes a few minutes. You can leave this page; your report will be waiting.",
        "step": {
          "areas": "Scoring your planets, seven areas and timing",
          "closing": "Writing your remedies and Baba Ji's letter",
          "monthsA": "Writing the first months of your year",
          "monthsB": "Writing the last months of your year",
          "shape": "Reading your chart and the shape of your year"
        },
        "steps": "Progress",
        "title": "Writing your year"
      },
      "wave": {
        "label": "Daily rhythm of the year 2027",
        "to": "to"
      },
      "welcome": {
        "babaJi": "Baba Ji",
        "edition": "Edition 2027",
        "editionNo": "Edition 2027 · No. {{n}}",
        "from": "A letter from",
        "howToRead": "How to read your colours",
        "monthly": "Open this report on the 1st of each month and read that month's two pages. The year is a map; the month is where you walk."
      },
      "yearLord": {
        "muntha": "Muntha in {{sign}}, house {{house}}"
      },
      "yoga": {
        "delivers": "Delivers in: {{months}}",
        "group": {
          "natal": "From your birth chart",
          "tajika": "From your Varsha charts"
        },
        "noMonths": "Present in the chart; no month stands out"
      }
    },
    "varshikReport": {
      "subtitle": "Your year ahead, month by month"
    }
  },
  hi: {
    "reports": {
      "descriptions": {
        "varshik_rashifal_2027": "आपका पूरा आने वाला वर्ष, महीनेवार, आपके अपने जन्म कुंडली और आपके दो वर्षा चार्टों से पढ़ा गया"
      },
      "labels": {
        "varshik_rashifal_2027": "Varshik Rashifal 2027"
      },
      "taglines": {
        "varshik_rashifal_2027": "2027 के कौन से महीने आपके लिए सबसे अच्छे होंगे?"
      }
    },
    "varshik": {
      "area": {
        "career": "करियर",
        "family": "परिवार",
        "growth": "विकास",
        "health": "स्वास्थ्य",
        "love": "प्रेम",
        "money": "धन",
        "travel": "यात्रा"
      },
      "areaBars": {
        "label": "जीवन के सात क्षेत्रों के स्कोर"
      },
      "areaMonth": {
        "best": "सर्वश्रेष्ठ माह",
        "label": "{{area}} के लिए बारह माह का स्कोर",
        "rest": "विश्राम माह"
      },
      "areas": {
        "best": "सबसे अच्छे महीने",
        "intro": "जीवन के सात पहलू, जिनमें से प्रत्येक को 2027 के पूरे वर्ष के लिए 100 में से अंकित किया गया है। अगले सात पृष्ठ उन्हें एक-एक करके ले जाएंगे।",
        "overall": "2027 का समग्र फल",
        "rest": "सबसे शांत महीना"
      },
      "art": {
        "missing": "कलाकृति {{code}} जोड़ी जानी है"
      },
      "birth": {
        "dasha": "जन्म के समय दशा: {{planet}}, {{years}} वर्ष शेष",
        "date": "जन्म",
        "house": "घर {{n}}",
        "lagna": "लग्न",
        "nakshatra": "नक्षत्र",
        "time": "समय"
      },
      "card": {
        "eyebrow": "Varshik Rashifal 2027",
        "peaks": "शीर्ष महीने: {{months}}",
        "yearLord": "वर्षाधिपति: {{planet}}"
      },
      "chapter": {
        "0": "आपकी रिपोर्ट",
        "1": "आपके वर्ष का स्वरूप",
        "2": "जीवन के सात पहलू",
        "3": "आपका समय",
        "4": "महीनेवार",
        "5": "इसे अपने साथ ले जाना",
        "6": "आपके प्रश्न, उत्तरित"
      },
      "contents": {
        "chapter": "अध्याय {{n}}"
      },
      "cover": {
        "eyebrow": "Varshik Rashifal",
        "title": "आपका आने वाला वर्ष"
      },
      "decision": {
        "all": "सभी",
        "best": "शुभ अवधि: {{from}} से {{to}} ({{score}}) {{tier}}",
        "business_launch": "व्यापार की शुरुआत",
        "commit_relationship": "संबंध में स्थिर रहें",
        "family_time": "परिवार के साथ समय",
        "filter": "एक निर्णय दिखाएं",
        "health_routine": "स्वास्थ्य की दिनचर्या",
        "hold": "ठहरें: {{months}}",
        "main": "आपका मुख्य निर्णय",
        "marriage": "शादी",
        "money_move": "धन से जुड़ा कदम",
        "move_home": "घर बदलें",
        "new_work": "नया कार्य",
        "noHold": "रुकावट नहीं",
        "study_exam": "अध्ययन और परीक्षा",
        "travel_abroad": "विदेश यात्रा"
      },
      "dosha": {
        "activeIn": "प्रभावी: {{months}}",
        "cancelledBy": "रद्द होने का कारण: {{reasons}}",
        "dhaiya": "ढाईया",
        "grahan": "ग्रहण दोष",
        "guruChandal": "गुरु चंडाल",
        "kaalSarp": "काल सर्प",
        "kemadruma": "केमद्रुमा",
        "mangal": "मंगल दोष",
        "pitra": "पितृ दोष",
        "quiet": "2027 तक शांत",
        "remedy": "सरल उपाय",
        "sadeSati": "साढ़े साती",
        "status": {
          "cancelled": "रद्द",
          "not_present": "नहीं है",
          "present": "है"
        },
        "touches": "स्पर्श"
      },
      "effect": {
        "helping": "सहायक",
        "neutral": "स्थिर",
        "weighing": "सावधानी"
      },
      "error": {
        "noFacts": "इस रिपोर्ट को खोला नहीं जा सका। कृपया कुछ ही पल में पुनः प्रयास करें।"
      },
      "glance": {
        "caption": "आपका 2027",
        "muntha": "मुंठा घर",
        "peaks": "आपके तीन शीर्ष महीने",
        "rest": "आपका विश्राम का महीना",
        "yearLord": "वर्षाधिपति"
      },
      "golden": {
        "peak": "{{date}} पर चरम",
        "then": "फिर {{from}} – {{to}}"
      },
      "impact": {
        "house": "जन्म कुंडली का {{n}}वाँ भाव",
        "months": "शुभ माह: {{best}}. चुनौतीपूर्ण माह: {{hard}}.",
        "strength": "शक्ति",
        "topArea": "सबसे प्रबल: {{area}}"
      },
      "month": {
        "glance": "एक नज़र में महीना",
        "keyDates": "प्रमुख तिथियां",
        "label": {
          "do": "क्या करना है",
          "heart": "प्रेम और स्वास्थ्य",
          "hold": "किस बात को टालें",
          "remedy": "इस महीने का उपाय",
          "work": "करियर और धन"
        },
        "living": "महीने को कैसे जिएँ",
        "mudda": "मुद्दाधिपति",
        "sahamPeak": "साहम चरम: {{name}}",
        "score": "महीने के लिए अंक",
        "varsha": "{{year}} का वर्षा चार्ट, लग्न {{lagna}}"
      },
      "moves": {
        "bindusRange": "Bindus {{min}} से {{max}}",
        "label": "{{planet}} का 2027 के बारह महीनों में संचार",
        "note": "Bindus दर्शाते हैं कि कोई भव आपके ग्रह के लिए कितना सहयोगी है; जितने अधिक, उतना आसान।",
        "segment": "{{from}} से {{to}} · भाव {{house}} · राशि {{sign}} · {{bindus}} bindus",
        "segmentOne": "{{from}} · भाव {{house}} · राशि {{sign}} · {{bindus}} bindus"
      },
      "nav": {
        "contents": "विषय-सूची",
        "label": "रिपोर्ट पृष्ठ",
        "next": "अगला",
        "page": "पृष्ठ {{n}} / {{total}}",
        "prev": "पिछला"
      },
      "opener": {
        "1": "वह जगह जहाँ वर्ष शुरू होता है: अंक, वर्षाधिपति, और उस आकाश जो उसे घेरता है।",
        "2": "प्रेम, करियर, धन, स्वास्थ्य, परिवार, विकास और यात्रा: एक-एक करके।",
        "3": "कब आगे बढ़ें और कब ठहरें: आपके बारह महीने, आपकी लय, आपकी तिथियाँ।",
        "4": "हर महीने के दो पन्ने: महीने की झलक, और उसे कैसे जिएँ।"
      },
      "page": {
        "act": "कब क्या करें",
        "areas": "जीवन के सात क्षेत्र",
        "birth": "आपकी जन्म कुंडली",
        "card": "एक कार्ड पर आपका वर्ष",
        "closing": "बाबा जी का समापन पत्र",
        "contents": "विषय-सूची",
        "doshas": "आपके 2027 के दोष",
        "glance": "2027 एक नज़र में",
        "golden": "सुनहरे अवसर और प्रमुख तिथियाँ",
        "moves": "आकाश की बड़ी चालें",
        "planets": "ग्रह-दर-ग्रह",
        "preparedFor": "{{name}} के लिए तैयार",
        "relief": "जो आपने झेला, और जो बदलने वाला है",
        "remedies": "सरल उपाय",
        "rhythm": "आपके वर्ष की लय",
        "sky": "आकाश-कैलेंडर 2027",
        "timing": "आपका समय-मानचित्र",
        "varsha": "आपके दो वर्षफल वर्ष",
        "welcome": "स्वागत है",
        "yearLord": "आपके वर्षेश और मुंथा",
        "yogas": "आपके पक्ष के योग"
      },
      "panchadhikari": {
        "aspectsLagna": "Lagna को देखता है",
        "yearLord": "वर्ष का स्वामी"
      },
      "panchavargi": {
        "title": "ग्रहों की पंचवर्गीय शक्ति"
      },
      "planet": {
        "jupiter": "गुरु",
        "ketu": "केतु",
        "mars": "मंगल",
        "mercury": "बुध",
        "moon": "चंद्रमा",
        "rahu": "राहु",
        "saturn": "शनि",
        "sun": "सूर्य",
        "venus": "शुक्र"
      },
      "question": {
        "eases": "कब राहत मिलेगी"
      },
      "relief": {
        "ahead": "आगे के मोड़",
        "past": "आपके पीछे का दौर"
      },
      "ring": {
        "label": "कुल अंक {{score}} में से 100, {{tier}}"
      },
      "role": {
        "Dina-Ratri Pati": "दिन और रात का स्वामी",
        "Janma Lagnesha": "आपके जन्म Lagna का स्वामी",
        "Munthesh": "Muntha का स्वामी",
        "Tri-Rashi Pati": "तीन राशियों का स्वामी",
        "Varsha Lagnesha": "वर्ष के Lagna का स्वामी"
      },
      "sky": {
        "combust-in": "{{planet}} {{sign}} में अस्त होता है, भाव {{house}}",
        "combust-out": "{{planet}} {{sign}} में अस्त से बाहर आता है, भाव {{house}}",
        "eclipse-lunar": "चंद्र ग्रहण {{sign}} में, आपके चार्ट के भाव {{house}} में",
        "eclipse-solar": "सूर्य ग्रहण {{sign}} में, आपके चार्ट के भाव {{house}} में",
        "eclipseKey": "सुनहरे निशान ग्रहण हैं",
        "ingress": "{{planet}} {{sign}} में प्रवेश करता है, भाव {{house}}",
        "label": "2027 तक आकाशीय घटनाएँ",
        "station-direct": "{{planet}} {{sign}} में मार्गी होता है, भाव {{house}}",
        "station-retrograde": "{{planet}} {{sign}} में वक्री होता है, भाव {{house}}"
      },
      "tier": {
        "go": "आगे बढ़ें",
        "hold": "विश्राम",
        "steady": "स्थिर",
        "weigh": "सोच-विचार"
      },
      "timeline": {
        "dayReturn": "दिन का सूर्य प्रत्यागमन",
        "ends": "समाप्त",
        "house": "भव {{n}}",
        "label": "आपके दो Varsha वर्ष",
        "lagna": "Varsha Lagna",
        "muntha": "Muntha",
        "starts": "प्रारंभ",
        "yearLord": "वर्ष का स्वामी"
      },
      "timing": {
        "tap": "उस महीने को खोलने के लिए किसी भी खाने पर टैप करें।"
      },
      "waiting": {
        "body": "इसमें कुछ मिनट लगेंगे। आप इस पृष्ठ को छोड़ सकते हैं; आपकी रिपोर्ट इंतज़ार कर रही होगी।",
        "step": {
          "areas": "आपके ग्रहों, सात क्षेत्रों और समय का मूल्यांकन",
          "closing": "आपके उपाय और बाबा जी का पत्र लिखना",
          "monthsA": "आपके वर्ष के पहले महीनों को लिखना",
          "monthsB": "आपके वर्ष के अंतिम महीनों को लिखना",
          "shape": "आपकी कुंडली और आपके वर्ष के आकार को पढ़ना"
        },
        "steps": "प्रगति",
        "title": "आपका वर्ष लिखा जा रहा है"
      },
      "wave": {
        "label": "वर्ष 2027 की दैनिक लय",
        "to": "से"
      },
      "welcome": {
        "babaJi": "Baba Ji",
        "edition": "संस्करण 2027",
        "editionNo": "संस्करण 2027 · क्र. {{n}}",
        "from": "यह पत्र लिखा है",
        "howToRead": "अपने रंग कैसे पढ़ें",
        "monthly": "हर महीने की 1 तारीख़ को यह रिपोर्ट खोलें और उस महीने के दो पन्ने पढ़ें। वर्ष एक नक्शा है; महीना वह जगह है जहाँ आप चलते हैं।"
      },
      "yearLord": {
        "muntha": "मुंथा {{sign}} में, भाव {{house}}"
      },
      "yoga": {
        "delivers": "प्रदान करता है: {{months}}",
        "group": {
          "natal": "आपके जन्म कुंडली से",
          "tajika": "आपकी Varsha कुंडली से"
        },
        "noMonths": "कुंडली में मौजूद; कोई महीना विशेष नहीं"
      }
    },
    "varshikReport": {
      "subtitle": "आपका आने वाला वर्ष, महीने-दर-महीने"
    }
  },
  bn: {
    "reports": {
      "descriptions": {
        "varshik_rashifal_2027": "আপনার আগামী পুরো বছর, মাস অনুযায়ী, আপনার নিজের জন্মচিহ্ন এবং আপনার দুটি বর্ষ চার্ট থেকে পড়ুন"
      },
      "labels": {
        "varshik_rashifal_2027": "Varshik Rashifal 2027"
      },
      "taglines": {
        "varshik_rashifal_2027": "2027 সালের কোন মাসগুলো আপনার জন্য সেরা?"
      }
    },
    "varshik": {
      "area": {
        "career": "ক্যারিয়ার",
        "family": "পরিবার",
        "growth": "বিকাশ",
        "health": "স্বাস্থ্য",
        "love": "প্রেম",
        "money": "অর্থ",
        "travel": "ভ্রমণ"
      },
      "areaBars": {
        "label": "জীবনের সাতটি ক্ষেত্রের স্কোর"
      },
      "areaMonth": {
        "best": "সেরা মাস",
        "label": "{{area}}-এর বার্ষিক মাসিক স্কোর",
        "rest": "বাকি মাস"
      },
      "areas": {
        "best": "সেরা মাসগুলো",
        "intro": "জীবনের সাতটি অংশ, প্রতিটি 2027 সালের জন্য 100-এর মধ্যে স্কোর করা। পরবর্তী সাতটি পৃষ্ঠায় এগুলো একে একে আলোচনা করা হয়েছে।",
        "overall": "2027 সালের সামগ্রিক ফল",
        "rest": "সবচেয়ে শান্ত মাস"
      },
      "art": {
        "missing": "আর্টওয়ার্ক {{code}} যোগ করতে বাকি"
      },
      "birth": {
        "dasha": "জন্মকালীন দশা: {{planet}}, {{years}} বছর বাকি",
        "date": "জন্ম তারিখ",
        "house": "{{n}} তম ভবন",
        "lagna": "লগ্ন",
        "nakshatra": "নক্ষত্র",
        "time": "সময়"
      },
      "card": {
        "eyebrow": "Varshik Rashifal 2027",
        "peaks": "শীর্ষ মাসগুলো: {{months}}",
        "yearLord": "বর্ষপতি: {{planet}}"
      },
      "chapter": {
        "0": "আপনার প্রতিবেদন",
        "1": "আপনার বছরের গঠন",
        "2": "জীবনের সাতটি অংশ",
        "3": "আপনার সময়সূচী",
        "4": "মাস অনুযায়ী",
        "5": "এটি সাথে নিয়ে চলুন",
        "6": "আপনার প্রশ্নের উত্তর"
      },
      "contents": {
        "chapter": "অধ্যায় {{n}}"
      },
      "cover": {
        "eyebrow": "Varshik Rashifal",
        "title": "আপনার আগামী বছর"
      },
      "decision": {
        "all": "সব",
        "best": "সেরা সময়: {{from}} থেকে {{to}} ({{score}}) {{tier}}",
        "business_launch": "ব্যবসা শুরু",
        "commit_relationship": "সম্পর্কে স্থায়ী হওয়া",
        "family_time": "পরিবারের সময়",
        "filter": "একটি সিদ্ধান্ত দেখান",
        "health_routine": "স্বাস্থ্য রুটিন",
        "hold": "অপেক্ষা করুন: {{months}}",
        "main": "আপনার প্রধান সিদ্ধান্ত",
        "marriage": "বিবাহ",
        "money_move": "অর্থের পদক্ষেপ",
        "move_home": "বাড়ি বদলানো",
        "new_work": "নতুন কাজ",
        "noHold": "অপেক্ষা করার কিছু নেই",
        "study_exam": "পড়াশোনা ও পরীক্ষা",
        "travel_abroad": "বিদেশ ভ্রমণ"
      },
      "dosha": {
        "activeIn": "প্রভাবিত: {{months}}",
        "cancelledBy": "রোধক কারণ: {{reasons}}",
        "dhaiya": "ধাইয়া",
        "grahan": "গ্রহণ দোষ",
        "guruChandal": "গুরু চণ্ডাল",
        "kaalSarp": "কাল সর্প",
        "kemadruma": "কেমাদ্রুম",
        "mangal": "মঙ্গল দোষ",
        "pitra": "পিতৃ দোষ",
        "quiet": "2027 সাল জুড়ে নিরপেক্ষ",
        "remedy": "সহজ সমাধান",
        "sadeSati": "সাড়েসাতি",
        "status": {
          "cancelled": "রোধক",
          "not_present": "নেই",
          "present": "আছে"
        },
        "touches": "স্পর্শ"
      },
      "effect": {
        "helping": "সহায়ক",
        "neutral": "স্থির",
        "weighing": "সতর্কতা"
      },
      "error": {
        "noFacts": "এই প্রতিবেদনটি খোলা যায়নি। দয়া করে কিছুক্ষণ পর আবার চেষ্টা করুন।"
      },
      "glance": {
        "caption": "আপনার 2027",
        "muntha": "মুন্ঠা ভবন",
        "peaks": "আপনার তিনটি শীর্ষ মাস",
        "rest": "বিশ্রামের মাস",
        "yearLord": "বর্ষপতি"
      },
      "golden": {
        "peak": "{{date}}-এ শীর্ষ",
        "then": "তারপর {{from}} – {{to}}"
      },
      "impact": {
        "house": "জন্ম চার্টের {{n}} তম ভবন",
        "months": "সেরা মাস: {{best}}. চ্যালেঞ্জিং মাস: {{hard}}.",
        "strength": "শক্তি",
        "topArea": "সবচেয়ে শক্তিশালী: {{area}}"
      },
      "month": {
        "glance": "মাসের সংক্ষিপ্ত রূপ",
        "keyDates": "গুরুত্বপূর্ণ তারিখগুলো",
        "label": {
          "do": "কী করা উচিত",
          "heart": "প্রেম ও স্বাস্থ্য",
          "hold": "কী এড়ানো উচিত",
          "remedy": "এই মাসের উপায়",
          "work": "ক্যারিয়ার ও অর্থ"
        },
        "living": "মাসটি কাটানোর উপায়",
        "mudda": "মুদ্দা পতি",
        "sahamPeak": "সাহাম শীর্ষ: {{name}}",
        "score": "মাসের স্কোর",
        "varsha": "{{year}} বর্ষ চার্ট, লগ্ন {{lagna}}"
      },
      "moves": {
        "bindusRange": "বিন্দু {{min}} থেকে {{max}}",
        "label": "{{planet}} 2027 সালের বারো মাসে",
        "note": "Bindus দেখায় একটি ভবন কতটা সেই গ্রহের জন্য সহায়ক; বেশি হলে কাজ সহজ হয়।",
        "segment": "{{from}} থেকে {{to}} · ভবন {{house}} · রাশি {{sign}} · {{bindus}} বিন্দু",
        "segmentOne": "{{from}} · ভবন {{house}} · রাশি {{sign}} · {{bindus}} বিন্দু"
      },
      "nav": {
        "contents": "বিষয়সূচী",
        "label": "প্রতিবেদন পৃষ্ঠাগুলো",
        "next": "পরবর্তী",
        "page": "পৃষ্ঠা {{n}} / {{total}}",
        "prev": "পূর্ববর্তী"
      },
      "opener": {
        "1": "বছরটি কোথায় শুরু হয়: স্কোর, বর্ষপতি, এবং এর চারপাশের আকাশ।",
        "2": "প্রেম, কেরিয়ার, টাকা, স্বাস্থ্য, পরিবার, উন্নতি এবং ভ্রমণ — একে একে।",
        "3": "কখন এগোবে, কখন অপেক্ষা করবে: আপনার বারো মাস, আপনার লয়, আপনার তারিখ।",
        "4": "প্রতি মাসের দুই পৃষ্ঠা: এক নজরে মাস, আর কীভাবে জীবনযাপন করবেন।"
      },
      "page": {
        "act": "কখন কাজ করবেন",
        "areas": "জীবনের সাতটি ক্ষেত্র",
        "birth": "আপনার জন্ম চার্ট",
        "card": "আপনার বছর একটি কার্ডে",
        "closing": "বাবা জি-র একটি সমাপনী চিঠি",
        "contents": "বিষয়সূচি",
        "doshas": "আপনার 2027-এর দোষ",
        "glance": "2027 এক নজরে",
        "golden": "সোনালী সময় ও প্রধান তারিখ",
        "moves": "আকাশের বড় পরিবর্তন",
        "planets": "গ্রহ অনুযায়ী",
        "preparedFor": "{{name}}-এর জন্য প্রস্তুত",
        "relief": "আপনি যা পার করেছেন, আর কী পরিবর্তন আসছে",
        "remedies": "সহজ উপায়",
        "rhythm": "আপনার বছরের লয়",
        "sky": "আকাশ ক্যালেন্ডার 2027",
        "timing": "আপনার মাস্টার টাইমিং ম্যাপ",
        "varsha": "আপনার দুই বর্ষ",
        "welcome": "স্বাগতম",
        "yearLord": "আপনার বর্ষপতি ও মুন্ঠা",
        "yogas": "আপনার পক্ষে যোগ"
      },
      "panchadhikari": {
        "aspectsLagna": "লগ্নকে দেখছে",
        "yearLord": "বর্ষপতি"
      },
      "panchavargi": {
        "title": "গ্রহদের পাঁচভাবে শক্তি"
      },
      "planet": {
        "jupiter": "বৃহস্পতি",
        "ketu": "কেতু",
        "mars": "মঙ্গল",
        "mercury": "বুধ",
        "moon": "চন্দ্র",
        "rahu": "রাহু",
        "saturn": "শনি",
        "sun": "সূর্য",
        "venus": "শুক্র"
      },
      "question": {
        "eases": "কখন আরাম পাবেন"
      },
      "relief": {
        "ahead": "আগামীর মোড়",
        "past": "আপনার পেছনের সময়"
      },
      "ring": {
        "label": "মোট স্কোর {{score}} থেকে 100, {{tier}}"
      },
      "role": {
        "Dina-Ratri Pati": "দিন-রাত্রির অধিপতি",
        "Janma Lagnesha": "জন্ম লগ্নের অধিপতি",
        "Munthesh": "মুন্ঠেশ",
        "Tri-Rashi Pati": "তিন রাশির অধিপতি",
        "Varsha Lagnesha": "বর্ষ লগ্নের অধিপতি"
      },
      "sky": {
        "combust-in": "{{planet}} {{sign}} রাশিতে অস্ত যান, ভাব {{house}}",
        "combust-out": "{{planet}} {{sign}} রাশিতে অস্ত থেকে মুক্ত হন, ভাব {{house}}",
        "eclipse-lunar": "চন্দ্রগ্রহণ {{sign}} রাশিতে, আপনার চার্টের ভবন {{house}}",
        "eclipse-solar": "সূর্যগ্রহণ {{sign}} রাশিতে, আপনার চার্টের ভবন {{house}}",
        "eclipseKey": "সোনালি চিহ্নগুলো হলো গ্রহণ",
        "ingress": "{{planet}} প্রবেশ করছেন {{sign}} রাশিতে, ভবন {{house}}",
        "label": "2027 সালের আকাশীয় ঘটনা",
        "station-direct": "{{planet}} {{sign}} রাশিতে মার্গী হন, ভাব {{house}}",
        "station-retrograde": "{{planet}} {{sign}} রাশিতে বক্রী হন, ভাব {{house}}"
      },
      "tier": {
        "go": "এগিয়ে চলুন",
        "hold": "বিশ্রাম",
        "steady": "স্থির",
        "weigh": "ভেবে দেখুন"
      },
      "timeline": {
        "dayReturn": "সূর্য প্রত্যাবর্তন দিন অনুযায়ী",
        "ends": "শেষ",
        "house": "{{n}} ভবন",
        "label": "আপনার দুটি বর্ষ",
        "lagna": "বর্ষ লগ্ন",
        "muntha": "মুন্ঠা",
        "starts": "শুরু",
        "yearLord": "বর্ষপতি"
      },
      "timing": {
        "tap": "সেই মাসটি খুলতে যেকোনো টাইলে ট্যাপ করুন।"
      },
      "waiting": {
        "body": "এতে কয়েক মিনিট সময় লাগবে। আপনি এই পৃষ্ঠাটি ছেড়ে যেতে পারেন; আপনার রিপোর্টটি অপেক্ষা করছে।",
        "step": {
          "areas": "আপনার গ্রহ, সাতটি ক্ষেত্র এবং সময়ের মূল্যায়ন",
          "closing": "আপনার উপায় এবং বাবা জির চিঠি লেখা",
          "monthsA": "আপনার বছরের প্রথম মাসগুলো লেখা",
          "monthsB": "আপনার বছরের শেষ মাসগুলো লেখা",
          "shape": "আপনার জন্মচিহ্ন এবং আপনার বছরের আকার পড়া"
        },
        "steps": "প্রগতি",
        "title": "আপনার বছর লেখা হচ্ছে"
      },
      "wave": {
        "label": "2027 সালের দৈনন্দিন লয়",
        "to": "থেকে"
      },
      "welcome": {
        "babaJi": "বাবা জি",
        "edition": "এডিশন 2027",
        "editionNo": "2027 সংস্করণ · নং {{n}}",
        "from": "একটি চিঠি",
        "howToRead": "আপনার রঙ কীভাবে পড়বেন",
        "monthly": "প্রতি মাসের প্রথম তারিখে এই রিপোর্ট খুলুন এবং ওই মাসের দুই পৃষ্ঠা পড়ুন। বছর হলো একটি মানচিত্র; মাস হলো যেখানে আপনি হাঁটবেন।"
      },
      "yearLord": {
        "muntha": "মুন্ঠা {{sign}}-এ, হাউস {{house}}"
      },
      "yoga": {
        "delivers": "ফল দেবে: {{months}}",
        "group": {
          "natal": "আপনার জন্ম চার্ট থেকে",
          "tajika": "আপনার বর্ষ চার্ট থেকে"
        },
        "noMonths": "চার্টে আছে; কোনো মাস বিশেষ নয়"
      }
    },
    "varshikReport": {
      "subtitle": "আপনার আগামী বছর, মাস অনুযায়ী"
    }
  },
  mr: {
    "reports": {
      "descriptions": {
        "varshik_rashifal_2027": "आपला पुढचा संपूर्ण वर्ष, महिन्यानुसार, तुमच्या स्वतःच्या चार्ट आणि तुमच्या दोन Varsha चार्ट्सवरून वाचा"
      },
      "labels": {
        "varshik_rashifal_2027": "Varshik Rashifal 2027"
      },
      "taglines": {
        "varshik_rashifal_2027": "2027 चे कोणते महिने तुमचे सर्वोत्तम असतील?"
      }
    },
    "varshik": {
      "area": {
        "career": "करिअर",
        "family": "कुटुंब",
        "growth": "विकास",
        "health": "आरोग्य",
        "love": "प्रेम",
        "money": "पैसा",
        "travel": "प्रवास"
      },
      "areaBars": {
        "label": "जीवनाच्या सात क्षेत्रांसाठी गुण"
      },
      "areaMonth": {
        "best": "सर्वात उत्तम महिना",
        "label": "{{area}} साठी बारा महिन्यांचा गुणरेषा",
        "rest": "उर्वरित महिना"
      },
      "areas": {
        "best": "सर्वात उत्तम महिने",
        "intro": "जीवनाचे सात भाग, प्रत्येकाला 2027 च्या संपूर्ण वर्षासाठी 100 पैकी गुण. पुढील सात पाने ती एकेक करून घेतात.",
        "overall": "2027 साठी सारांश",
        "rest": "सर्वात शांत महिना"
      },
      "art": {
        "missing": "कलाकृती {{code}} जोडणे बाकी आहे"
      },
      "birth": {
        "dasha": "जन्माची दशा: {{planet}}, {{years}} वर्षे उरले",
        "date": "जन्म",
        "house": "घर {{n}}",
        "lagna": "लग्न",
        "nakshatra": "नक्षत्र",
        "time": "वेळ"
      },
      "card": {
        "eyebrow": "Varshik Rashifal 2027",
        "peaks": "शिखर महिने: {{months}}",
        "yearLord": "वर्षाधिपती: {{planet}}"
      },
      "chapter": {
        "0": "तुमचा अहवाल",
        "1": "तुमच्या वर्षाचा आकार",
        "2": "जीवनाचे सात क्षेत्र",
        "3": "तुमची वेळ",
        "4": "महिन्यानुसार",
        "5": "तुमच्यासोबत नेणे",
        "6": "तुमचे प्रश्न, उत्तरे"
      },
      "contents": {
        "chapter": "अध्याय {{n}}"
      },
      "cover": {
        "eyebrow": "Varshik Rashifal",
        "title": "तुमचे पुढील वर्ष"
      },
      "decision": {
        "all": "सर्व",
        "best": "सर्वात योग्य कालावधी: {{from}} ते {{to}} ({{score}}) {{tier}}",
        "business_launch": "व्यवसाय सुरू करा",
        "commit_relationship": "संबंधात स्थिर राहा",
        "family_time": "कुटुंबासोबत वेळ",
        "filter": "एक निर्णय दाखवा",
        "health_routine": "आरोग्याची दिनचर्या",
        "hold": "थोडे थांबा: {{months}}",
        "main": "तुमचा मुख्य निर्णय",
        "marriage": "विवाह",
        "money_move": "पैशांचा निर्णय",
        "move_home": "घर बदला",
        "new_work": "नवीन काम",
        "noHold": "थांबवण्यासारखे काही नाही",
        "study_exam": "अभ्यास आणि परीक्षा",
        "travel_abroad": "परदेश प्रवास"
      },
      "dosha": {
        "activeIn": "सक्रिय: {{months}}",
        "cancelledBy": "रद्द करण्याचे कारण: {{reasons}}",
        "dhaiya": "धैय",
        "grahan": "ग्रहण दोष",
        "guruChandal": "गुरुचंद्र",
        "kaalSarp": "कालसर्प",
        "kemadruma": "केमद्रुम",
        "mangal": "मंगल दोष",
        "pitra": "पितृ दोष",
        "quiet": "2027 पूर्णपणे शांत",
        "remedy": "सोपा उपाय",
        "sadeSati": "साडेसाती",
        "status": {
          "cancelled": "रद्द",
          "not_present": "अस्तित्वात नाही",
          "present": "अस्तित्वात"
        },
        "touches": "स्पर्श"
      },
      "effect": {
        "helping": "सहाय्यक",
        "neutral": "स्थिर",
        "weighing": "सावधगिरी"
      },
      "error": {
        "noFacts": "हा अहवाल उघडू शकला नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा."
      },
      "glance": {
        "caption": "तुमचे 2027",
        "muntha": "मुंठा घर",
        "peaks": "तुमचे तीन शिखर महिने",
        "rest": "विश्रांतीचा तुमचा महिना",
        "yearLord": "वर्षाधिपती"
      },
      "golden": {
        "peak": "{{date}} रोजी शिखर",
        "then": "त्यानंतर {{from}} – {{to}}"
      },
      "impact": {
        "house": "तुमच्या जन्मचार्टमधील {{n}} घर",
        "months": "सर्वात चांगला महिना: {{best}}. कठीण महिना: {{hard}}.",
        "strength": "बल",
        "topArea": "सर्वात प्रबळ: {{area}}"
      },
      "month": {
        "glance": "महिना एक नजरेत",
        "keyDates": "महत्त्वाच्या तारखा",
        "label": {
          "do": "काय करावे",
          "heart": "प्रेम आणि आरोग्य",
          "hold": "काय टाळावे",
          "remedy": "या महिन्याचे उपाय",
          "work": "करिअर आणि पैसे"
        },
        "living": "महिना कसा जगावा",
        "mudda": "मुद्दा अधिपती",
        "sahamPeak": "साहम शिखर: {{name}}",
        "score": "महिन्याचे गुण",
        "varsha": "{{year}} चा वर्षा चार्ट, लग्न {{lagna}}"
      },
      "moves": {
        "bindusRange": "बिंदू {{min}} ते {{max}}",
        "label": "{{planet}} यांचे 2027 च्या बारा महिन्यांतले प्रवास",
        "note": "Bindus दर्शवतात की घर त्या ग्रहासाठी किती अनुकूल आहे; जास्त bindus म्हणजे सोपे.",
        "segment": "{{from}} ते {{to}} · घर {{house}} · {{sign}} · {{bindus}} बिंदू",
        "segmentOne": "{{from}} · घर {{house}} · {{sign}} · {{bindus}} बिंदू"
      },
      "nav": {
        "contents": "सूची",
        "label": "अहवाल पाने",
        "next": "पुढे",
        "page": "पान {{n}} / {{total}}",
        "prev": "मागील"
      },
      "opener": {
        "1": "वर्ष कुठे सुरू होते: गुण, वर्षाधिपती आणि त्याची आकाशरेषा.",
        "2": "प्रेम, करिअर, पैसा, आरोग्य, कुटुंब, वाढ आणि प्रवास — एकाएकी एक.",
        "3": "कधी हलवायचे आणि कधी थांबावे: तुमचे बारा महिने, तुमचा लय, तुमच्या तारखा.",
        "4": "प्रत्येक महिन्यासाठी दोन पाने: महिन्याचा झलक आणि तो कसा जगावा."
      },
      "page": {
        "act": "कधी कृती करावी",
        "areas": "जीवनाचे सात क्षेत्र",
        "birth": "तुमचा जन्मचार्ट",
        "card": "तुमचा वर्ष एक कार्डवर",
        "closing": "बाबा जींचे निरोप पत्र",
        "contents": "सूची",
        "doshas": "तुमच्या 2027 मधील दोष",
        "glance": "2027 एक नजर",
        "golden": "सुवर्ण खिडक्या आणि मुख्य तारखा",
        "moves": "आकाशातील मोठे हाल",
        "planets": "ग्रहानुसार ग्रह",
        "preparedFor": "{{name}} साठी तयार",
        "relief": "तुम्ही काय अनुभवले, आणि काय बदल",
        "remedies": "सोपे उपाय",
        "rhythm": "तुमच्या वर्षाचा लय",
        "sky": "आकाश कॅलेंडर 2027",
        "timing": "तुमचे मास्टर टायमिंग मॅप",
        "varsha": "तुमचे दोन वर्षावर्ष",
        "welcome": "स्वागत",
        "yearLord": "तुमचे वर्षाधिपती आणि मुंठा",
        "yogas": "तुमच्या बाजूचे योग"
      },
      "panchadhikari": {
        "aspectsLagna": "Lagna पाहतो",
        "yearLord": "वर्षाधिपती"
      },
      "panchavargi": {
        "title": "ग्रहांचे पंचवर्गीय बळ"
      },
      "planet": {
        "jupiter": "गुरु",
        "ketu": "केतू",
        "mars": "मंगळ",
        "mercury": "बुध",
        "moon": "चंद्र",
        "rahu": "राहु",
        "saturn": "शनि",
        "sun": "सूर्य",
        "venus": "शुक्र"
      },
      "question": {
        "eases": "जेव्हा सुटका मिळते"
      },
      "relief": {
        "ahead": "पुढील वळण",
        "past": "तुमच्या मागे असलेला काळ"
      },
      "ring": {
        "label": "एकूण गुण {{score}} पैकी 100, {{tier}}"
      },
      "role": {
        "Dina-Ratri Pati": "दिनरात्राधिपती",
        "Janma Lagnesha": "जन्म लग्नाचा स्वामी",
        "Munthesh": "मुंठाधिपती",
        "Tri-Rashi Pati": "तीन राशींचा स्वामी",
        "Varsha Lagnesha": "वर्ष लग्नाचा स्वामी"
      },
      "sky": {
        "combust-in": "{{planet}} {{sign}} मध्ये अस्त होतो, भाव {{house}}",
        "combust-out": "{{planet}} {{sign}} मध्ये अस्तातून बाहेर येतो, भाव {{house}}",
        "eclipse-lunar": "चंद्रग्रहण {{sign}} मध्ये, तुमच्या कुंडलीचे घर {{house}}",
        "eclipse-solar": "सूर्यग्रहण {{sign}} मध्ये, तुमच्या कुंडलीचे घर {{house}}",
        "eclipseKey": "सुवर्ण चिन्हे म्हणजे ग्रहण",
        "ingress": "{{planet}} {{sign}} मध्ये प्रवेश करतो, घर {{house}}",
        "label": "2027 मधील आकाशीय घटना",
        "station-direct": "{{planet}} {{sign}} मध्ये मार्गी होतो, भाव {{house}}",
        "station-retrograde": "{{planet}} {{sign}} मध्ये वक्री होतो, भाव {{house}}"
      },
      "tier": {
        "go": "पुढे चला",
        "hold": "विश्रांती",
        "steady": "स्थिर",
        "weigh": "विचार करा"
      },
      "timeline": {
        "dayReturn": "दिवसाचा सूर्यप्रत्यावर्तन",
        "ends": "संपते",
        "house": "घर {{n}}",
        "label": "तुमचे दोन वर्षाधिपती वर्षे",
        "lagna": "वर्ष लग्न",
        "muntha": "मुंठा",
        "starts": "सुरू होते",
        "yearLord": "वर्षाधिपती"
      },
      "timing": {
        "tap": "कोणतेही टाईल उघडण्यासाठी टॅप करा."
      },
      "waiting": {
        "body": "याला काही मिनिटे लागतील. तुम्ही हे पान सोडू शकता; तुमचा अहवाल वाट पाहत आहे.",
        "step": {
          "areas": "तुमच्या ग्रहांचे, सात क्षेत्रांचे आणि वेळेचे गुणन",
          "closing": "तुमचे उपाय आणि बाबाजींचे पत्र लिहित आहे",
          "monthsA": "तुमच्या वर्षाच्या पहिल्या महिन्यांचे लेखन",
          "monthsB": "तुमच्या वर्षाच्या शेवटच्या महिन्यांचे लेखन",
          "shape": "तुमचा चार्ट आणि तुमच्या वर्षाचा आकार वाचत आहे"
        },
        "steps": "प्रगती",
        "title": "तुमचे वर्ष लिहित आहे"
      },
      "wave": {
        "label": "2027 चे दैनिक लय",
        "to": "ते"
      },
      "welcome": {
        "babaJi": "बाबा जी",
        "edition": "एडिशन 2027",
        "editionNo": "संस्करण 2027 · क्र. {{n}}",
        "from": "पत्र",
        "howToRead": "तुमचे रंग कसे वाचावे",
        "monthly": "प्रत्येक महिन्याच्या पहिल्या तारखेला हे रिपोर्ट उघडा आणि त्या महिन्याची दोन पाने वाचा. वर्ष एक नकाशा आहे; महिना म्हणजे तुमचा प्रवास."
      },
      "yearLord": {
        "muntha": "मुंठा {{sign}} मध्ये, घर {{house}}"
      },
      "yoga": {
        "delivers": "दिले जाते: {{months}}",
        "group": {
          "natal": "तुमच्या जन्म कुंडलीतून",
          "tajika": "तुमच्या वर्षाधिपती कुंडल्यांतून"
        },
        "noMonths": "कुंडलीत उपस्थित; कोणताही महिना वेगळा नाही"
      }
    },
    "varshikReport": {
      "subtitle": "तुमचे पुढील वर्ष, महिनावार"
    }
  },
  te: {
    "reports": {
      "descriptions": {
        "varshik_rashifal_2027": "మీ పూర్తి సంవత్సరం, నెలవారీగా, మీ స్వంత జాతకం మరియు మీ రెండు వర్ష జాతకాల నుండి చదవండి"
      },
      "labels": {
        "varshik_rashifal_2027": "Varshik Rashifal 2027"
      },
      "taglines": {
        "varshik_rashifal_2027": "2027లో మీకు మంచి నెలలు ఏవి?"
      }
    },
    "varshik": {
      "area": {
        "career": "ఉద్యోగం",
        "family": "కుటుంబం",
        "growth": "వృద్ధి",
        "health": "ఆరోగ్యం",
        "love": "ప్రేమ",
        "money": "ధనం",
        "travel": "ప్రయాణం"
      },
      "areaBars": {
        "label": "జీవిత ఏడు అంశాలకు స్కోర్లు"
      },
      "areaMonth": {
        "best": "శుభమైన నెల",
        "label": "{{area}} కోసం పన్నెండు నెలల స్కోర్ రేఖ",
        "rest": "సాధారణ నెల"
      },
      "areas": {
        "best": "ఉత్తమ నెలలు",
        "intro": "జీవితానికి ఏడు అంశాలు, ప్రతిదానికీ 2027 మొత్తానికి 100లో స్కోరు. తర్వాత ఏడు పేజీలు వాటిని ఒక్కొక్కటిగా తీసుకుంటాయి.",
        "overall": "2027 సంవత్సరానికి సమగ్ర ఫలితాలు",
        "rest": "అత్యంత నిశ్శబ్ద నెల"
      },
      "art": {
        "missing": "ఆర్ట్‌వర్క్ {{code}} చేర్చాల్సి ఉంది"
      },
      "birth": {
        "dasha": "జన్మ దశ: {{planet}}, {{years}} సంవత్సరాలు మిగిలి ఉన్నాయి",
        "date": "జన్మ తేదీ",
        "house": "{{n}}వ భవనం",
        "lagna": "లాగ్నం",
        "nakshatra": "నక్షత్రం",
        "time": "సమయం"
      },
      "card": {
        "eyebrow": "Varshik Rashifal 2027",
        "peaks": "శిఖర నెలలు: {{months}}",
        "yearLord": "సంవత్సర ప్రభువు: {{planet}}"
      },
      "chapter": {
        "0": "మీ నివేదిక",
        "1": "మీ సంవత్సర ఆకారం",
        "2": "జీవితానికి ఏడు అంశాలు",
        "3": "మీ సమయం",
        "4": "నెలవారీగా",
        "5": "మీతో పాటు తీసుకువెళ్లండి",
        "6": "మీ ప్రశ్నలు, సమాధానాలు"
      },
      "contents": {
        "chapter": "అధ్యాయం {{n}}"
      },
      "cover": {
        "eyebrow": "Varshik Rashifal",
        "title": "మీ ముందున్న సంవత్సరం"
      },
      "decision": {
        "all": "అన్నీ",
        "best": "ఉత్తమ సమయం: {{from}} నుండి {{to}} వరకు ({{score}}) {{tier}}",
        "business_launch": "వ్యాపార ప్రారంభం",
        "commit_relationship": "బంధానికి అంగీకరించండి",
        "family_time": "కుటుంబ సమయం",
        "filter": "ఒక నిర్ణయాన్ని చూపించు",
        "health_routine": "ఆరోగ్య రూటీన్",
        "hold": "వేచి ఉండండి: {{months}}",
        "main": "మీ ప్రధాన నిర్ణయం",
        "marriage": "వివాహం",
        "money_move": "ధన చర్య",
        "move_home": "ఇల్లు మార్చుకోండి",
        "new_work": "కొత్త పని",
        "noHold": "ఆపివేయాల్సినది ఏమీ లేదు",
        "study_exam": "పఠనం మరియు పరీక్షలు",
        "travel_abroad": "విదేశాలకు ప్రయాణం"
      },
      "dosha": {
        "activeIn": "ప్రభావం: {{months}}",
        "cancelledBy": "రద్దు అయింది ఎందుకంటే: {{reasons}}",
        "dhaiya": "ధైయ",
        "grahan": "గ్రహణ దోషం",
        "guruChandal": "గురు చండల్",
        "kaalSarp": "కాళసర్ప",
        "kemadruma": "కేమద్రుమ",
        "mangal": "మంగళ దోషం",
        "pitra": "పితృ దోషం",
        "quiet": "2027 మొత్తం నిశ్శబ్దం",
        "remedy": "సరళ పరిహారం",
        "sadeSati": "సదే సాతీ",
        "status": {
          "cancelled": "రద్దు",
          "not_present": "లేదు",
          "present": "ఉంది"
        },
        "touches": "స్పర్శ"
      },
      "effect": {
        "helping": "అనుకూలం",
        "neutral": "సాధారణం",
        "weighing": "జాగ్రత్త"
      },
      "error": {
        "noFacts": "ఈ నివేదికను తెరవలేకపోయాము. దయచేసి కొంచెం సేపటికి మళ్ళీ ప్రయత్నించండి."
      },
      "glance": {
        "caption": "మీ 2027",
        "muntha": "Muntha భవనం",
        "peaks": "మీ మూడు శిఖర నెలలు",
        "rest": "విశ్రాంతికి మీ నెల",
        "yearLord": "సంవత్సర ప్రభువు"
      },
      "golden": {
        "peak": "{{date}}న శిఖరం",
        "then": "అప్పుడు {{from}} – {{to}}"
      },
      "impact": {
        "house": "మీ జన్మ కుండలిలో {{n}}వ భావం",
        "months": "ఉత్తమ నెల: {{best}}. కష్టమైన నెల: {{hard}}.",
        "strength": "బలం",
        "topArea": "బలంగా ఉంది: {{area}}"
      },
      "month": {
        "glance": "నెల సారాంశం",
        "keyDates": "ముఖ్య తేదీలు",
        "label": {
          "do": "ఏం చేయాలి",
          "heart": "ప్రేమ మరియు ఆరోగ్యం",
          "hold": "ఏది ఆపాలి",
          "remedy": "ఈ నెల చికిత్స",
          "work": "వృత్తి మరియు డబ్బు"
        },
        "living": "నెలను ఎలా గడపాలి",
        "mudda": "Mudda ప్రభువు",
        "sahamPeak": "Saham శిఖరం: {{name}}",
        "score": "నెలకు స్కోరు",
        "varsha": "{{year}} Varsha చార్ట్, Lagna {{lagna}}"
      },
      "moves": {
        "bindusRange": "బిందువులు {{min}} నుండి {{max}}",
        "label": "{{planet}} 2027 సంవత్సరం పన్నెండు నెలల పాటు",
        "note": "బిందువులు ఒక గృహం ఆ గ్రహానికి ఎంత సహకారంగా ఉంటుందో చూపిస్తాయి; ఎక్కువ ఉంటే సులభం.",
        "segment": "{{from}} నుండి {{to}} · భవనం {{house}} · రాశి {{sign}} · {{bindus}} బిందువులు",
        "segmentOne": "{{from}} · భవనం {{house}} · రాశి {{sign}} · {{bindus}} బిందువులు"
      },
      "nav": {
        "contents": "విషయ సూచిక",
        "label": "నివేదిక పేజీలు",
        "next": "తర్వాతి",
        "page": "{{n}}వ పేజీ, మొత్తం {{total}}",
        "prev": "మునుపటి"
      },
      "opener": {
        "1": "సంవత్సరం ఎక్కడ ప్రారంభమవుతుంది: స్కోరు, సంవత్సర ప్రభువు, మరియు దానిని చుట్టుముట్టే ఆకాశం.",
        "2": "ప్రేమ, కెరీర్, డబ్బు, ఆరోగ్యం, కుటుంబం, అభివృద్ధి, ప్రయాణం — ఒక్కోసారి ఒక్కోటి.",
        "3": "ఎప్పుడు ముందుకు సాగాలో, ఎప్పుడు వేచి ఉండాలి: మీ పన్నెండు నెలలు, మీ లయ, మీ తేదీలు.",
        "4": "ప్రతి నెలకు రెండు పేజీలు: నెల సారాంశం, మరియు దాన్ని ఎలా జీవించాలో."
      },
      "page": {
        "act": "ఎప్పుడు చర్య తీసుకోవాలి",
        "areas": "జీవితానికి ఏడు అంశాలు",
        "birth": "మీ జన్మ కుండలీ",
        "card": "మీ సంవత్సరం ఒక్క కార్డుపై",
        "closing": "బాబా జీ వారి సమావేశ లేఖ",
        "contents": "విషయ సూచిక",
        "doshas": "మీ 2027లో దోషాలు",
        "glance": "2027 సారాంశం",
        "golden": "స్వర్ణ సమయాలు మరియు ముఖ్య తేదీలు",
        "moves": "ఆకాశం యొక్క పెద్ద కదలికలు",
        "planets": "గ్రహం వారీగా",
        "preparedFor": "{{name}} కోసం సిద్ధం",
        "relief": "మీరు ఎదుర్కొన్నది, మరియు మార్పులు",
        "remedies": "సాధారణ పరిహారాలు",
        "rhythm": "మీ సంవత్సరం యొక్క లయ",
        "sky": "ఆకాశం క్యాలెండర్ 2027",
        "timing": "మీ మాస్టర్ టైమింగ్ మ్యాప్",
        "varsha": "మీ రెండు వర్ష సంవత్సరాలు",
        "welcome": "స్వాగతం",
        "yearLord": "మీ వర్షాధిపతి మరియు ముంథ",
        "yogas": "మీకు అనుకూలమైన యోగాలు"
      },
      "panchadhikari": {
        "aspectsLagna": "లగ్నాన్ని చూస్తుంది",
        "yearLord": "సంవత్సరాధిపతి"
      },
      "panchavargi": {
        "title": "గ్రహాల ఐదు రకాల బలం"
      },
      "planet": {
        "jupiter": "గురువు",
        "ketu": "కేతువు",
        "mars": "మంగళుడు",
        "mercury": "బుధుడు",
        "moon": "చంద్రుడు",
        "rahu": "రాహువు",
        "saturn": "శని",
        "sun": "సూర్యుడు",
        "venus": "శుక్రుడు"
      },
      "question": {
        "eases": "ఇది ఎప్పుడు తగ్గుతుంది"
      },
      "relief": {
        "ahead": "ముందున్న మలుపులు",
        "past": "మీ వెనుక ఉన్న కాలం"
      },
      "ring": {
        "label": "మొత్తం స్కోర్ {{score}} / 100, {{tier}}"
      },
      "role": {
        "Dina-Ratri Pati": "దినరాత్రిపతి",
        "Janma Lagnesha": "జన్మ లగ్నాధిపతి",
        "Munthesh": "ముంథేశుడు",
        "Tri-Rashi Pati": "త్రిరాశిపతి",
        "Varsha Lagnesha": "వర్ష లగ్నాధిపతి"
      },
      "sky": {
        "combust-in": "{{planet}} {{sign}} రాశి, {{house}}వ భావంలో అస్తంగతమవుతుంది",
        "combust-out": "{{planet}} దహనం నుండి బయటకు వస్తుంది, {{sign}} రాశి, {{house}}వ భవనం",
        "eclipse-lunar": "చంద్ర గ్రహణం {{sign}} రాశిలో, మీ జాతకంలో {{house}}వ భవనం",
        "eclipse-solar": "సూర్య గ్రహణం {{sign}} రాశిలో, మీ జాతకంలో {{house}}వ భవనం",
        "eclipseKey": "బంగారు గుర్తులు గ్రహణాలను సూచిస్తాయి",
        "ingress": "{{planet}} {{sign}} రాశిలో ప్రవేశిస్తుంది, {{house}}వ భవనం",
        "label": "2027 ఆకాశ ఘటనలు",
        "station-direct": "{{planet}} {{sign}} రాశి, {{house}}వ భావంలో మార్గి అవుతుంది",
        "station-retrograde": "{{planet}} {{sign}} రాశి, {{house}}వ భావంలో వక్రీ అవుతుంది"
      },
      "tier": {
        "go": "ముందుకు",
        "hold": "విశ్రాంతి",
        "steady": "స్థిరంగా",
        "weigh": "ఆలోచించండి"
      },
      "timeline": {
        "dayReturn": "రోజువారీ సూర్య ప్రత్యగమనం",
        "ends": "ముగుస్తుంది",
        "house": "{{n}} గృహం",
        "label": "మీ రెండు వర్ష సంవత్సరాలు",
        "lagna": "వర్ష లగ్నం",
        "muntha": "ముంథం",
        "starts": "ప్రారంభమవుతుంది",
        "yearLord": "సంవత్సరాధిపతి"
      },
      "timing": {
        "tap": "ఆ నెలను తెరవడానికి ఏదైనా టైల్‌ను తాకండి."
      },
      "waiting": {
        "body": "దీనికి కొన్ని నిమిషాలు పడుతుంది. మీరు ఈ పేజీని వదిలేయవచ్చు; మీ నివేదిక వేచి ఉంటుంది.",
        "step": {
          "areas": "మీ గ్రహాలకు, ఏడు అంశాలకు మరియు కాలానికి స్కోరింగ్",
          "closing": "మీ పరిహారాలు మరియు బాబా జీ లేఖను రాయడం",
          "monthsA": "మీ సంవత్సరం మొదటి నెలలను రాయడం",
          "monthsB": "మీ సంవత్సరం చివరి నెలలను రాయడం",
          "shape": "మీ జాతకాన్ని మరియు మీ సంవత్సరం ఆకారాన్ని చదవడం"
        },
        "steps": "ప్రగతి",
        "title": "మీ సంవత్సరాన్ని రాయడం"
      },
      "wave": {
        "label": "2027 సంవత్సరం రోజువారీ లయం",
        "to": "నుండి"
      },
      "welcome": {
        "babaJi": "బాబా జీ",
        "edition": "ఎడిషన్ 2027",
        "editionNo": "2027 సంచిక · సంఖ్య {{n}}",
        "from": "వారి నుండి లేఖ",
        "howToRead": "మీ రంగులను ఎలా చదవాలి",
        "monthly": "ప్రతి నెల 1వ తేదీన ఈ నివేదికను తెరవండి మరియు ఆ నెల రెండు పేజీలను చదవండి. సంవత్సరం ఒక మ్యాప్; నెల మీరు నడిచే ప్రదేశం."
      },
      "yearLord": {
        "muntha": "{{sign}}లో ముంథ, {{house}}వ భవనం"
      },
      "yoga": {
        "delivers": "ఫలితం ఇస్తుంది: {{months}}",
        "group": {
          "natal": "మీ జన్మ జాతకం నుండి",
          "tajika": "మీ వర్ష జాతకాల నుండి"
        },
        "noMonths": "జాతకంలో ఉంది; ఏ నెలనూ ప్రత్యేకంగా లేదు"
      }
    },
    "varshikReport": {
      "subtitle": "మీ ముందున్న సంవత్సరం, నెలవారీగా"
    }
  },
  ta: {
    "reports": {
      "descriptions": {
        "varshik_rashifal_2027": "உங்கள் வருடம் முழுவதும், மாதம் வாரியாக, உங்கள் ஜாதகம் மற்றும் உங்கள் இரண்டு வர்ஷ ஜாதகங்களிலிருந்து படிக்கவும்"
      },
      "labels": {
        "varshik_rashifal_2027": "Varshik Rashifal 2027"
      },
      "taglines": {
        "varshik_rashifal_2027": "2027-ல் எந்த மாதங்கள் உங்களுக்கு சிறந்தவை?"
      }
    },
    "varshik": {
      "area": {
        "career": "வேலை",
        "family": "குடும்பம்",
        "growth": "வளர்ச்சி",
        "health": "ஆரோக்கியம்",
        "love": "காதல்",
        "money": "பணம்",
        "travel": "பயணம்"
      },
      "areaBars": {
        "label": "வாழ்க்கையின் ஏழு துறைகளுக்கான மதிப்பெண்கள்"
      },
      "areaMonth": {
        "best": "சிறந்த மாதம்",
        "label": "{{area}}-க்கான பன்னிரண்டு மாத மதிப்பெண் வரி",
        "rest": "ஓய்வான மாதம்"
      },
      "areas": {
        "best": "சிறந்த மாதங்கள்",
        "intro": "வாழ்க்கையின் ஏழு பகுதிகள், ஒவ்வொன்றும் 2027 முழுவதற்கும் 100-ல் மதிப்பெண் பெற்றவை. அடுத்த ஏழு பக்கங்கள் அவற்றை ஒவ்வொன்றாக எடுத்துக்கொள்கின்றன.",
        "overall": "2027-க்கான ஒட்டுமொத்தம்",
        "rest": "அமைதியான மாதம்"
      },
      "art": {
        "missing": "கலைப்பொருள் {{code}} சேர்க்கப்பட வேண்டும்"
      },
      "birth": {
        "dasha": "பிறப்பு தசா: {{planet}}, {{years}} ஆண்டுகள் மீதம்",
        "date": "பிறந்த நாள்",
        "house": "{{n}}-ஆம் வீடு",
        "lagna": "லக்னம்",
        "nakshatra": "நட்சத்திரம்",
        "time": "நேரம்"
      },
      "card": {
        "eyebrow": "Varshik Rashifal 2027",
        "peaks": "உச்ச மாதங்கள்: {{months}}",
        "yearLord": "ஆண்டின் அதிபதி: {{planet}}"
      },
      "chapter": {
        "0": "உங்கள் அறிக்கை",
        "1": "உங்கள் ஆண்டின் வடிவம்",
        "2": "வாழ்க்கையின் ஏழு பகுதிகள்",
        "3": "உங்கள் காலம்",
        "4": "மாதம் வாரியாக",
        "5": "உங்களுடன் கொண்டு செல்ல",
        "6": "உங்கள் கேள்விகள், விடை"
      },
      "contents": {
        "chapter": "அத்தியாயம் {{n}}"
      },
      "cover": {
        "eyebrow": "Varshik Rashifal",
        "title": "உங்கள் வருங்கால ஆண்டு"
      },
      "decision": {
        "all": "அனைத்தும்",
        "best": "சிறந்த காலம்: {{from}} முதல் {{to}} வரை ({{score}}) {{tier}}",
        "business_launch": "வணிகத் தொடக்கம்",
        "commit_relationship": "உறவில் நிலைத்தன்மை",
        "family_time": "குடும்ப நேரம்",
        "filter": "ஒரு முடிவைக் காட்டு",
        "health_routine": "ஆரோக்கியப் பழக்கம்",
        "hold": "காத்திருப்பு: {{months}}",
        "main": "உங்கள் முக்கிய முடிவு",
        "marriage": "திருமணம்",
        "money_move": "பண இயக்கம்",
        "move_home": "வீடு மாற்றம்",
        "new_work": "புதிய வேலை",
        "noHold": "காத்திருக்க ஒன்றுமில்லை",
        "study_exam": "படிப்பு மற்றும் தேர்வுகள்",
        "travel_abroad": "வெளிநாட்டுப் பயணம்"
      },
      "dosha": {
        "activeIn": "{{months}} மாதங்களில் செயல்பாட்டில்",
        "cancelledBy": "ரத்து செய்யப்பட்டது: {{reasons}}",
        "dhaiya": "தாயியம்",
        "grahan": "கிரகண தோஷம்",
        "guruChandal": "குரு சாண்டாலம்",
        "kaalSarp": "கால சர்ப்பம்",
        "kemadruma": "கேம த்ருமம்",
        "mangal": "மங்கல தோஷம்",
        "pitra": "பித்ரு தோஷம்",
        "quiet": "2027 முழுவதும் அமைதியாக",
        "remedy": "எளிய தீர்வு",
        "sadeSati": "சடே சனி",
        "status": {
          "cancelled": "ரத்து செய்யப்பட்டது",
          "not_present": "இல்லை",
          "present": "உள்ளது"
        },
        "touches": "தொடுகிறது"
      },
      "effect": {
        "helping": "உதவும்",
        "neutral": "நடுநிலை",
        "weighing": "சமநிலை"
      },
      "error": {
        "noFacts": "இந்த அறிக்கையைத் திறக்க முடியவில்லை. தயவுசெய்து சற்று நேரத்தில் மீண்டும் முயற்சிக்கவும்."
      },
      "glance": {
        "caption": "உங்கள் 2027",
        "muntha": "Muntha வீடு",
        "peaks": "உங்கள் மூன்று உச்ச மாதங்கள்",
        "rest": "ஓய்வெடுக்க உங்கள் மாதம்",
        "yearLord": "ஆண்டின் அதிபதி"
      },
      "golden": {
        "peak": "{{date}}-இல் உச்சம்",
        "then": "பின்னர் {{from}} – {{to}}"
      },
      "impact": {
        "house": "உங்கள் ஜாதகத்தில் {{n}}-ஆம் வீடு",
        "months": "சிறந்த மாதம்: {{best}}. சற்று சவாலான மாதம்: {{hard}}.",
        "strength": "வலிமை",
        "topArea": "மிகவும் வலுவானது: {{area}}"
      },
      "month": {
        "glance": "மாதம் ஒரு நோக்கத்தில்",
        "keyDates": "முக்கிய தேதிகள்",
        "label": {
          "do": "என்ன செய்ய வேண்டும்",
          "heart": "அன்பு மற்றும் ஆரோக்கியம்",
          "hold": "எதைத் தவிர்ப்பது",
          "remedy": "இந்த மாதத்திற்கான தீர்வு",
          "work": "வேலை மற்றும் பணம்"
        },
        "living": "மாதத்தை எப்படி வாழ்வது",
        "mudda": "Mudda அதிபதி",
        "sahamPeak": "Saham உச்சம்: {{name}}",
        "score": "மாதத்திற்கான மதிப்பெண்",
        "varsha": "{{year}} Varsha வரைபடம், Lagna {{lagna}}"
      },
      "moves": {
        "bindusRange": "பிந்துக்கள் {{min}} முதல் {{max}} வரை",
        "label": "{{planet}} 2027-ன் பன்னிரண்டு மாதங்களில்",
        "note": "ஒரு கோளுக்கு ஒரு வீடு எவ்வளவு ஆதரவாக உள்ளது என்பதை bindus காட்டுகின்றன; அதிகம் என்றால் எளிது.",
        "segment": "{{from}} முதல் {{to}} · வீடு {{house}} · ராசி {{sign}} · {{bindus}} பிந்துக்கள்",
        "segmentOne": "{{from}} · வீடு {{house}} · ராசி {{sign}} · {{bindus}} பிந்துக்கள்"
      },
      "nav": {
        "contents": "பொருளடக்கம்",
        "label": "அறிக்கை பக்கங்கள்",
        "next": "அடுத்தது",
        "page": "பக்கம் {{n}} / {{total}}",
        "prev": "முந்தையது"
      },
      "opener": {
        "1": "ஆண்டு தொடங்கும் இடம்: மதிப்பெண், ஆண்டின் அதிபதி, மற்றும் அதைச் சுற்றியுள்ள வானம்.",
        "2": "காதல், தொழில், பணம், ஆரோக்கியம், குடும்பம், வளர்ச்சி மற்றும் பயணம் — ஒன்றன் பின் ஒன்றாக.",
        "3": "எப்போது நகர வேண்டும், எப்போது காத்திருக்க வேண்டும்: உங்கள் பன்னிரண்டு மாதங்கள், உங்கள் இயல்பு, உங்கள் தேதிகள்.",
        "4": "ஒவ்வொரு மாதத்திற்கும் இரண்டு பக்கங்கள்: மாதம் ஒரு பார்வையில், மற்றும் அதை எப்படி வாழ்வது."
      },
      "page": {
        "act": "எப்போது செயல்படுவது",
        "areas": "வாழ்க்கையின் ஏழு துறைகள்",
        "birth": "உங்கள் பிறப்புக் குடிரா",
        "card": "உங்கள் ஆண்டு ஒரு கார்டில்",
        "closing": "பாபா ஜியின் ஒரு மூடிய கடிதம்",
        "contents": "பொருளடக்கம்",
        "doshas": "உங்கள் 2027-ல் உள்ள தோஷங்கள்",
        "glance": "2027 ஒரு பார்வையில்",
        "golden": "வெள்ளிச் சாளரங்கள் மற்றும் முக்கிய தேதிகள்",
        "moves": "வானத்தின் பெரிய நகர்வுகள்",
        "planets": "கிரகம் வாரியாக",
        "preparedFor": "{{name}}-க்காக தயாரிக்கப்பட்டது",
        "relief": "நீங்கள் கடந்து வந்தது, மற்றும் மாறப்போவது",
        "remedies": "எளிய தீர்வுகள்",
        "rhythm": "உங்கள் ஆண்டின் இயல்பு",
        "sky": "வான அட்டவணை 2027",
        "timing": "உங்கள் மாஸ்டர் டைமிங் ம্যாப்",
        "varsha": "உங்கள் இரண்டு வர்ஷ ஆண்டுகள்",
        "welcome": "வரவேற்பு",
        "yearLord": "உங்கள் ஆண்டு அதிபதி மற்றும் முந்தா",
        "yogas": "உங்களுக்கு ஆதரவான யோகங்கள்"
      },
      "panchadhikari": {
        "aspectsLagna": "லக்னத்தைப் பார்க்கிறது",
        "yearLord": "Year Lord"
      },
      "panchavargi": {
        "title": "கோள்களின் ஐந்து வகை பலன்கள்"
      },
      "planet": {
        "jupiter": "குரு",
        "ketu": "கேது",
        "mars": "செவ்வாய்",
        "mercury": "புதன்",
        "moon": "சந்திரன்",
        "rahu": "ராகு",
        "saturn": "சனி",
        "sun": "சூரியன்",
        "venus": "சுக்கிரன்"
      },
      "question": {
        "eases": "அது எப்போது குறையும்"
      },
      "relief": {
        "ahead": "முன்னால் உள்ள திருப்புமுனைகள்",
        "past": "நீங்கள் கடந்து வந்த காலம்"
      },
      "ring": {
        "label": "மொத்த மதிப்பெண் {{score}} / 100, {{tier}}"
      },
      "role": {
        "Dina-Ratri Pati": "நாள் மற்றும் இரவு அதிபதி",
        "Janma Lagnesha": "உங்கள் பிறப்பு Lagna அதிபதி",
        "Munthesh": "Muntha அதிபதி",
        "Tri-Rashi Pati": "மூன்று ராசிகளின் அதிபதி",
        "Varsha Lagnesha": "ஆண்டின் Lagna அதிபதி"
      },
      "sky": {
        "combust-in": "{{planet}} {{sign}} ராசியில், வீடு {{house}} இல் எரிந்து போகிறது",
        "combust-out": "{{planet}} எரிச்சலிலிருந்து வெளியேறுகிறது, {{sign}} ராசி, வீடு {{house}}",
        "eclipse-lunar": "சந்திர கிரகணம் {{sign}} ராசி, உங்கள் ஜாதக வீடு {{house}}",
        "eclipse-solar": "சூரிய கிரகணம் {{sign}} ராசி, உங்கள் ஜாதக வீடு {{house}}",
        "eclipseKey": "வெள்ளி குறியீடுகள் கிரகணங்கள்",
        "ingress": "{{planet}} {{sign}} ராசி, வீடு {{house}} இல் நுழைகிறது",
        "label": "2027 வானியல் நிகழ்வுகள்",
        "station-direct": "{{planet}} {{sign}} ராசி, வீடு {{house}} இல் நேராக மாறுகிறது",
        "station-retrograde": "{{planet}} {{sign}} ராசி, வீடு {{house}} இல் விலகிச் செல்கிறது"
      },
      "tier": {
        "go": "செல்",
        "hold": "ஓய்வு",
        "steady": "நிலைத்தன்மை",
        "weigh": "சமநிலை"
      },
      "timeline": {
        "dayReturn": "நாள் சூரிய திரும்பம்",
        "ends": "முடிவு",
        "house": "வீடு {{n}}",
        "label": "உங்கள் இரண்டு Varsha ஆண்டுகள்",
        "lagna": "Varsha Lagna",
        "muntha": "Muntha",
        "starts": "தொடக்கம்",
        "yearLord": "Year Lord"
      },
      "timing": {
        "tap": "அந்த மாதத்தைத் திறக்க எந்த கட்டத்தையும் தொடுக."
      },
      "waiting": {
        "body": "இதற்கு சில நிமிடங்கள் ஆகும். இந்தப் பக்கத்தை விட்டுச் செல்லலாம்; உங்கள் அறிக்கை காத்திருக்கும்.",
        "step": {
          "areas": "உங்கள் கிரகங்கள், ஏழு துறைகள் மற்றும் கால அளவீடு",
          "closing": "உங்கள் தீர்வுகள் மற்றும் பாபாஜியின் கடிதத்தை எழுதுதல்",
          "monthsA": "உங்கள் வருடத்தின் முதல் மாதங்களை எழுதுதல்",
          "monthsB": "உங்கள் வருடத்தின் இறுதி மாதங்களை எழுதுதல்",
          "shape": "உங்கள் ஜாதகத்தைப் படித்தல் மற்றும் உங்கள் வருடத்தின் வடிவம்"
        },
        "steps": "முன்னேற்றம்",
        "title": "உங்கள் வருடத்தை எழுதுதல்"
      },
      "wave": {
        "label": "2027-ன் தினசரி இயல்பு",
        "to": "வரை"
      },
      "welcome": {
        "babaJi": "பாபா ஜி",
        "edition": "பதிப்பு 2027",
        "editionNo": "2027 பதிப்பு · எண் {{n}}",
        "from": "இதோ ஒரு கடிதம்",
        "howToRead": "உங்கள் நிறங்களை எப்படிப் படிப்பது",
        "monthly": "ஒவ்வொரு மாதத்தின் முதல் தேதியிலும் இந்த அறிக்கையைத் திறந்து, அந்த மாதத்தின் இரண்டு பக்கங்களைப் படியுங்கள். ஆண்டு ஒரு வரைபடம்; மாதம் நீங்கள் நடக்கும் பாதை."
      },
      "yearLord": {
        "muntha": "முந்தா {{sign}}, வீடு {{house}}"
      },
      "yoga": {
        "delivers": "நிறைவேற்றும்: {{months}}",
        "group": {
          "natal": "உங்கள் பிறப்பு ஜாதகத்திலிருந்து",
          "tajika": "உங்கள் Varsha ஜாதகங்களிலிருந்து"
        },
        "noMonths": "ஜாதகத்தில் உள்ளது; எந்த மாதமும் குறிப்பிடத்தக்கது அல்ல"
      }
    },
    "varshikReport": {
      "subtitle": "உங்கள் வருங்கால ஆண்டு, மாதம் வாரியாக"
    }
  },
  gu: {
    "reports": {
      "descriptions": {
        "varshik_rashifal_2027": "આગામી સમગ્ર વર્ષ, મહિનાવાર, તમારી જાતકચાર્ટ અને તમારી બે વાર્ષિક ચાર્ટો પરથી વાંચેલું"
      },
      "labels": {
        "varshik_rashifal_2027": "Varshik Rashifal 2027"
      },
      "taglines": {
        "varshik_rashifal_2027": "2027 ના કયા મહિના તમારા માટે શ્રેષ્ઠ રહેશે?"
      }
    },
    "varshik": {
      "area": {
        "career": "કારકિર્દી",
        "family": "પરિવાર",
        "growth": "વિકાસ",
        "health": "આરોગ્ય",
        "love": "પ્રેમ",
        "money": "પૈસા",
        "travel": "પર્યટન"
      },
      "areaBars": {
        "label": "જીવનના સાત ક્ષેત્રો માટેના અંક"
      },
      "areaMonth": {
        "best": "સૌથી શુભ મહિનો",
        "label": "{{area}} માટે બાર મહિનાના અંક",
        "rest": "બાકીનો મહિનો"
      },
      "areas": {
        "best": "સૌથી શુભ મહિના",
        "intro": "જીવનના સાત ભાગ, દરેકનું ૨૦૨૭ના સમગ્ર વર્ષ માટે ૧૦૦માં સ્કોર. આગામી સાત પાના તેને એકેયે લેશે.",
        "overall": "2027 નું સમગ્ર વર્ષ",
        "rest": "શાંતતમ મહિનો"
      },
      "art": {
        "missing": "આર્ટવર્ક {{code}} ઉમેરવાનું બાકી છે"
      },
      "birth": {
        "dasha": "જન્મ દશા: {{planet}}, {{years}} વર્ષ બાકી",
        "date": "જન્મ",
        "house": "ઘર {{n}}",
        "lagna": "લગ્ન",
        "nakshatra": "નક્ષત્ર",
        "time": "સમય"
      },
      "card": {
        "eyebrow": "Varshik Rashifal ૨૦૨૭",
        "peaks": "શિખર મહિના: {{months}}",
        "yearLord": "વર્ષેશ: {{planet}}"
      },
      "chapter": {
        "0": "તમારો રિપોર્ટ",
        "1": "તમારા વર્ષનો આકાર",
        "2": "જીવનના સાત ક્ષેત્રો",
        "3": "તમારો સમય",
        "4": "મહિનાવાર",
        "5": "તમારી સાથે લઈ જાઓ",
        "6": "તમારા પ્રશ્નો, જવાબ સાથે"
      },
      "contents": {
        "chapter": "અધ્યાય {{n}}"
      },
      "cover": {
        "eyebrow": "Varshik Rashifal",
        "title": "તમારો આગામી વર્ષ"
      },
      "decision": {
        "all": "બધું",
        "best": "સૌથી શુભ સમયગાળો: {{from}} થી {{to}} ({{score}}) {{tier}}",
        "business_launch": "વ્યવસાય શરૂ કરવો",
        "commit_relationship": "સંબંધમાં સ્થિર થવું",
        "family_time": "પરિવાર સાથેનો સમય",
        "filter": "એક નિર્ણય બતાવો",
        "health_routine": "આરોગ્યની દૈનિક ક્રિયા",
        "hold": "થોભો: {{months}}",
        "main": "તમારો મુખ્ય નિર્ણય",
        "marriage": "વિવાહ",
        "money_move": "પૈસાનો નિર્ણય",
        "move_home": "ઘર બદલવું",
        "new_work": "નવું કામ",
        "noHold": "રોકવા જેવું કંઈ નથી",
        "study_exam": "પાઠ અને પરીક્ષા",
        "travel_abroad": "વિદેશ પ્રવાસ"
      },
      "dosha": {
        "activeIn": "સક્રિય: {{months}}",
        "cancelledBy": "રદ થયું કારણ કે: {{reasons}}",
        "dhaiya": "ધૈયા",
        "grahan": "ગ્રહણ દોષ",
        "guruChandal": "ગુરુચંદલ",
        "kaalSarp": "કાળસર્પ",
        "kemadruma": "કેમદ્રુમા",
        "mangal": "મંગલ દોષ",
        "pitra": "પિતૃ દોષ",
        "quiet": "૨૦૨૭ સુધી શાંત",
        "remedy": "સરળ ઉપાય",
        "sadeSati": "સાડેસાતી",
        "status": {
          "cancelled": "રદ",
          "not_present": "નથી",
          "present": "છે"
        },
        "touches": "સ્પર્શ"
      },
      "effect": {
        "helping": "સહાયક",
        "neutral": "સામાન્ય",
        "weighing": "સાવચેતી"
      },
      "error": {
        "noFacts": "આ રિપોર્ટ ખોલી શકાયો નથી. કૃપા કરીને થોડી વાર પછી ફરી પ્રયાસ કરો."
      },
      "glance": {
        "caption": "તમારું ૨૦૨૭",
        "muntha": "મુંઠા ઘર",
        "peaks": "તમારા ત્રણ શિખર મહિના",
        "rest": "વિશ્રામ માટેનો તમારો મહિનો",
        "yearLord": "વર્ષેશ"
      },
      "golden": {
        "peak": "{{date}} પર શિખર",
        "then": "પછી {{from}} – {{to}}"
      },
      "impact": {
        "house": "તમારા જન્મ ચાર્ટનો {{n}}મો ભાવ",
        "months": "સૌથી શુભ મહિનો: {{best}}. થોડો મુશ્કેલ મહિનો: {{hard}}.",
        "strength": "શક્તિ",
        "topArea": "સૌથી મજબૂત: {{area}}"
      },
      "month": {
        "glance": "મહિનો એક નજરમાં",
        "keyDates": "મહત્વની તારીખો",
        "label": {
          "do": "શું કરવું",
          "heart": "પ્રેમ અને સ્વાસ્થ્ય",
          "hold": "શું ટાળવું",
          "remedy": "આ મહિનાનો ઉપાય",
          "work": "કરિયર અને પૈસા"
        },
        "living": "મહિનો કેવી રીતે જીવવો",
        "mudda": "મુદ્દા અધિપતિ",
        "sahamPeak": "સહમ શિખર: {{name}}",
        "score": "મહિનાનું સ્કોર",
        "varsha": "{{year}} નું વર્ષ ચાર્ટ, લગ્ન {{lagna}}"
      },
      "moves": {
        "bindusRange": "બિંદુઓ {{min}} થી {{max}}",
        "label": "{{planet}} દ્વારા 2027 ના બારે મહિનાઓ",
        "note": "બિંદુઓ દર્શાવે છે કે કોઈ ઘર તે ગ્રહ માટે કેટલો સહાયક છે; વધુ હોય તો સરળ.",
        "segment": "{{from}} થી {{to}} · ભવ {{house}} · {{sign}} · {{bindus}} બિંદુઓ",
        "segmentOne": "{{from}} · ભવ {{house}} · {{sign}} · {{bindus}} બિંદુઓ"
      },
      "nav": {
        "contents": "સૂચિપત્ર",
        "label": "રિપોર્ટ પાના",
        "next": "આગળ",
        "page": "પાનું {{n}} / {{total}}",
        "prev": "પાછળ"
      },
      "opener": {
        "1": "વર્ષ ક્યાંથી શરૂ થાય છે: સ્કોર, વર્ષેશ, અને તે આકાશ જે તેને ઘેરી લે છે.",
        "2": "પ્રેમ, કરિયર, પૈસા, સ્વાસ્થ્ય, પરિવાર, વિકાસ અને પ્રવાસ — એક સાથે નહીં, એક પછી એક.",
        "3": "ક્યારે આગળ વધવું અને ક્યારે રાહ જોવી: તમારા બાર મહિના, તમારો લય, તમારી તારીખો.",
        "4": "દરેક મહિના માટે બે પાના: મહિનો એક નજરમાં, અને તેને કેવી રીતે જીવવું."
      },
      "page": {
        "act": "ક્યારે કાર્ય કરવું",
        "areas": "જીવનના સાત ક્ષેત્રો",
        "birth": "તમારો જન્મ કુંડળી",
        "card": "તમારો વર્ષ એક કાર્ડ પર",
        "closing": "બાબા જી પાસેથી વિદાય પત્ર",
        "contents": "સૂચિપત્રક",
        "doshas": "તમારા 2027 માં દોષો",
        "glance": "2027 એક નજરમાં",
        "golden": "સોનાના ખિડકીઓ અને મુખ્ય તારીખો",
        "moves": "આકાશના મોટા ફેરફારો",
        "planets": "ગ્રહ મુજબ",
        "preparedFor": "{{name}} માટે તૈયાર",
        "relief": "તમે જેમાંથી પસાર થયા છો અને શું બદલાશે",
        "remedies": "સાદા ઉપાય",
        "rhythm": "તમારા વર્ષનો લય",
        "sky": "આકાશ કેલેન્ડર 2027",
        "timing": "તમારું માસ્ટર ટાઈમિંગ મેપ",
        "varsha": "તમારા બે વર્ષ",
        "welcome": "સ્વાગત",
        "yearLord": "તમારો વર્ષ લોર્ડ અને Muntha",
        "yogas": "તમારા પક્ષે યોગો"
      },
      "panchadhikari": {
        "aspectsLagna": "લગ્નને જોય છે",
        "yearLord": "વર્ષના અધિપતિ"
      },
      "panchavargi": {
        "title": "ગ્રહોની પંચવર્ગીય શક્તિ"
      },
      "planet": {
        "jupiter": "ગુરુ",
        "ketu": "કેતુ",
        "mars": "મંગળ",
        "mercury": "બુધ",
        "moon": "ચંદ્ર",
        "rahu": "રાહુ",
        "saturn": "શનિ",
        "sun": "સૂર્ય",
        "venus": "શુક્ર"
      },
      "question": {
        "eases": "જ્યારે તે શાંત થાય"
      },
      "relief": {
        "ahead": "આગળના મુખ્ય બિંદુઓ",
        "past": "તમારા પાછળનું સમયગાળું"
      },
      "ring": {
        "label": "કુલ અંક {{score}} માંથી 100, {{tier}}"
      },
      "role": {
        "Dina-Ratri Pati": "દિવસ અને રાતના અધિપતિ",
        "Janma Lagnesha": "જન્મ લગ્નના અધિપતિ",
        "Munthesh": "મુંઠાના અધિપતિ",
        "Tri-Rashi Pati": "ત્રણ રાશિના અધિપતિ",
        "Varsha Lagnesha": "વર્ષના લગ્નના અધિપતિ"
      },
      "sky": {
        "combust-in": "{{planet}} {{sign}}માં, ભાવ {{house}}માં અસ્ત થાય છે",
        "combust-out": "{{planet}} {{sign}}માં, ભાવ {{house}}માં અસ્તમાંથી બહાર આવે છે",
        "eclipse-lunar": "ચંદ્રગ્રહણ {{sign}}માં, તમારા જન્મકુંડળીના ભવ {{house}}માં",
        "eclipse-solar": "સૂર્યગ્રહણ {{sign}}માં, તમારા જન્મકુંડળીના ભવ {{house}}માં",
        "eclipseKey": "સોનાના નિશાન ગ્રહણ દર્શાવે છે",
        "ingress": "{{planet}} {{sign}}માં પ્રવેશે છે, ભવ {{house}}",
        "label": "આકાશી ઘટનાઓ ૨૦૨૭ સુધી",
        "station-direct": "{{planet}} {{sign}}માં, ભાવ {{house}}માં માર્ગી થાય છે",
        "station-retrograde": "{{planet}} {{sign}}માં, ભાવ {{house}}માં વક્રી થાય છે"
      },
      "tier": {
        "go": "આગળ વધો",
        "hold": "વિશ્રામ",
        "steady": "સ્થિર",
        "weigh": "વિચારો"
      },
      "timeline": {
        "dayReturn": "સૂર્ય પરતવણ દિવસ દ્વારા",
        "ends": "સમાપ્ત",
        "house": "ઘર {{n}}",
        "label": "તમારા બે વર્ષા વર્ષ",
        "lagna": "વર્ષા લગ્ન",
        "muntha": "મુંઠો",
        "starts": "શરૂ",
        "yearLord": "વર્ષના અધિપતિ"
      },
      "timing": {
        "tap": "કોઈપણ ટાઈલ પર ક્લિક કરો તે મહિનો ખોલવા માટે."
      },
      "waiting": {
        "body": "આમાં થોડો સમય લાગશે. તમે આ પૃષ્ઠ છોડી શકો છો; તમારી રિપોર્ટ તૈયાર થતાં સુધી રાહ જોશે.",
        "step": {
          "areas": "તમારા ગ્રહો, સાત ક્ષેત્રો અને સમયગાળાનું મૂલ્યાંકન",
          "closing": "તમારા ઉપાયો અને બાબા જીનો પત્ર લખવો",
          "monthsA": "તમારા વર્ષના પ્રથમ મહિનાઓ લખવા",
          "monthsB": "તમારા વર્ષના છેલ્લા મહિનાઓ લખવા",
          "shape": "તમારી જાતકચાર્ટ અને તમારા વર્ષનો આકાર વાંચવો"
        },
        "steps": "પ્રગતિ",
        "title": "તમારા વર્ષનો અહેવાલ તૈયાર કરી રહ્યા છીએ"
      },
      "wave": {
        "label": "વર્ષ 2027 નો દૈનિક લય",
        "to": "થી"
      },
      "welcome": {
        "babaJi": "બાબા જી",
        "edition": "સંસ્કરણ 2027",
        "editionNo": "સંસ્કરણ 2027 · નં. {{n}}",
        "from": "પત્ર",
        "howToRead": "તમારા રંગો કેવી રીતે વાંચવા",
        "monthly": "દર મહિનાની 1 તારીખે આ રિપોર્ટ ખોલો અને તે મહિનાના બે પાના વાંચો. વર્ષ એ નકશો છે; મહિનો એ જગ્યા છે જ્યાં તમે ચાલો છો."
      },
      "yearLord": {
        "muntha": "Muntha {{sign}} માં, હાઉસ {{house}}"
      },
      "yoga": {
        "delivers": "પૂરું કરે છે: {{months}}",
        "group": {
          "natal": "તમારા જન્મ કુંડળીમાંથી",
          "tajika": "તમારા વર્ષા કુંડળીઓમાંથી"
        },
        "noMonths": "કુંડળીમાં હાજર; કોઈ મહિનો અલગ નથી"
      }
    },
    "varshikReport": {
      "subtitle": "તમારો આગામી વર્ષ, મહિના મુજબ"
    }
  },
};
