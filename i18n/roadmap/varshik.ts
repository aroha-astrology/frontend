import type { RoadmapBundle } from "./types";

/**
 * Varshik Rashifal 2027 chart text (components/reports/varshik): area, planet, tier, dosha and
 * decision names, labels, and the sky-event sentences. English plus the six bundle languages; the
 * other eight are in i18n/generated/*.json. Translated through apinex (free/gemini-3.8-flash).
 */
export const varshikBundle: RoadmapBundle = {
  en: {
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
      "art": {
        "missing": "Artwork {{code}} to be added"
      },
      "decision": {
        "best": "Best window: {{from}} to {{to}} ({{score}}) {{tier}}",
        "business_launch": "Business launch",
        "commit_relationship": "Commit to a relationship",
        "family_time": "Family time",
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
      "impact": {
        "house": "House {{n}} in your birth chart",
        "months": "Best month: {{best}}. Harder month: {{hard}}.",
        "strength": "Strength",
        "topArea": "Strongest on: {{area}}"
      },
      "moves": {
        "bindusRange": "Bindus {{min}} to {{max}}",
        "label": "{{planet}} through the twelve months of 2027",
        "note": "Bindus show how supportive a house is for that planet; more is easier.",
        "segment": "{{from}} to {{to}} · house {{house}} · {{sign}} · {{bindus}} bindus",
        "segmentOne": "{{from}} · house {{house}} · {{sign}} · {{bindus}} bindus"
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
      "wave": {
        "label": "Daily rhythm of the year 2027",
        "to": "to"
      },
      "yoga": {
        "delivers": "Delivers in: {{months}}",
        "group": {
          "natal": "From your birth chart",
          "tajika": "From your Varsha charts"
        },
        "noMonths": "Present in the chart; no month stands out"
      }
    }
  },
  hi: {
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
      "art": {
        "missing": "कलाकृति {{code}} जोड़ी जानी है"
      },
      "decision": {
        "best": "शुभ अवधि: {{from}} से {{to}} ({{score}}) {{tier}}",
        "business_launch": "व्यापार की शुरुआत",
        "commit_relationship": "संबंध में स्थिर रहें",
        "family_time": "परिवार के साथ समय",
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
      "impact": {
        "house": "जन्म कुंडली का {{n}}वाँ भाव",
        "months": "शुभ माह: {{best}}. चुनौतीपूर्ण माह: {{hard}}.",
        "strength": "शक्ति",
        "topArea": "सबसे प्रबल: {{area}}"
      },
      "moves": {
        "bindusRange": "Bindus {{min}} से {{max}}",
        "label": "{{planet}} का 2027 के बारह महीनों में संचार",
        "note": "Bindus दर्शाते हैं कि कोई भव आपके ग्रह के लिए कितना सहयोगी है; जितने अधिक, उतना आसान।",
        "segment": "{{from}} से {{to}} · भाव {{house}} · राशि {{sign}} · {{bindus}} bindus",
        "segmentOne": "{{from}} · भाव {{house}} · राशि {{sign}} · {{bindus}} bindus"
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
      "wave": {
        "label": "वर्ष 2027 की दैनिक लय",
        "to": "से"
      },
      "yoga": {
        "delivers": "प्रदान करता है: {{months}}",
        "group": {
          "natal": "आपके जन्म कुंडली से",
          "tajika": "आपकी Varsha कुंडली से"
        },
        "noMonths": "कुंडली में मौजूद; कोई महीना विशेष नहीं"
      }
    }
  },
  bn: {
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
      "art": {
        "missing": "আর্টওয়ার্ক {{code}} যোগ করতে বাকি"
      },
      "decision": {
        "best": "সেরা সময়: {{from}} থেকে {{to}} ({{score}}) {{tier}}",
        "business_launch": "ব্যবসা শুরু",
        "commit_relationship": "সম্পর্কে স্থায়ী হওয়া",
        "family_time": "পরিবারের সময়",
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
      "impact": {
        "house": "জন্ম চার্টের {{n}} তম ভবন",
        "months": "সেরা মাস: {{best}}. চ্যালেঞ্জিং মাস: {{hard}}.",
        "strength": "শক্তি",
        "topArea": "সবচেয়ে শক্তিশালী: {{area}}"
      },
      "moves": {
        "bindusRange": "বিন্দু {{min}} থেকে {{max}}",
        "label": "{{planet}} 2027 সালের বারো মাসে",
        "note": "Bindus দেখায় একটি ভবন কতটা সেই গ্রহের জন্য সহায়ক; বেশি হলে কাজ সহজ হয়।",
        "segment": "{{from}} থেকে {{to}} · ভবন {{house}} · রাশি {{sign}} · {{bindus}} বিন্দু",
        "segmentOne": "{{from}} · ভবন {{house}} · রাশি {{sign}} · {{bindus}} বিন্দু"
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
      "wave": {
        "label": "2027 সালের দৈনন্দিন লয়",
        "to": "থেকে"
      },
      "yoga": {
        "delivers": "ফল দেবে: {{months}}",
        "group": {
          "natal": "আপনার জন্ম চার্ট থেকে",
          "tajika": "আপনার বর্ষ চার্ট থেকে"
        },
        "noMonths": "চার্টে আছে; কোনো মাস বিশেষ নয়"
      }
    }
  },
  mr: {
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
      "art": {
        "missing": "कलाकृती {{code}} जोडणे बाकी आहे"
      },
      "decision": {
        "best": "सर्वात योग्य कालावधी: {{from}} ते {{to}} ({{score}}) {{tier}}",
        "business_launch": "व्यवसाय सुरू करा",
        "commit_relationship": "संबंधात स्थिर राहा",
        "family_time": "कुटुंबासोबत वेळ",
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
      "impact": {
        "house": "तुमच्या जन्मचार्टमधील {{n}} घर",
        "months": "सर्वात चांगला महिना: {{best}}. कठीण महिना: {{hard}}.",
        "strength": "बल",
        "topArea": "सर्वात प्रबळ: {{area}}"
      },
      "moves": {
        "bindusRange": "बिंदू {{min}} ते {{max}}",
        "label": "{{planet}} यांचे 2027 च्या बारा महिन्यांतले प्रवास",
        "note": "Bindus दर्शवतात की घर त्या ग्रहासाठी किती अनुकूल आहे; जास्त bindus म्हणजे सोपे.",
        "segment": "{{from}} ते {{to}} · घर {{house}} · {{sign}} · {{bindus}} बिंदू",
        "segmentOne": "{{from}} · घर {{house}} · {{sign}} · {{bindus}} बिंदू"
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
      "ring": {
        "label": "एकूण गुण {{score}} पैकी 100, {{tier}}"
      },
      "role": {
        "Dina-Ratri Pati": "दिनरात्राधिपती",
        "Janma Lagnesha": "जन्म लagna च्या स्वामी",
        "Munthesh": "मुंठाधिपती",
        "Tri-Rashi Pati": "तीन राशींचा स्वामी",
        "Varsha Lagnesha": "वर्षाच्या लagna च्या स्वामी"
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
        "lagna": "वर्षाधिपती लagna",
        "muntha": "मुंठा",
        "starts": "सुरू होते",
        "yearLord": "वर्षाधिपती"
      },
      "wave": {
        "label": "2027 चे दैनिक लय",
        "to": "ते"
      },
      "yoga": {
        "delivers": "दिले जाते: {{months}}",
        "group": {
          "natal": "तुमच्या जन्म कुंडलीतून",
          "tajika": "तुमच्या वर्षाधिपती कुंडल्यांतून"
        },
        "noMonths": "कुंडलीत उपस्थित; कोणताही महिना वेगळा नाही"
      }
    }
  },
  te: {
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
      "art": {
        "missing": "ఆర్ట్‌వర్క్ {{code}} చేర్చాల్సి ఉంది"
      },
      "decision": {
        "best": "ఉత్తమ సమయం: {{from}} నుండి {{to}} వరకు ({{score}}) {{tier}}",
        "business_launch": "వ్యాపార ప్రారంభం",
        "commit_relationship": "బంధానికి అంగీకరించండి",
        "family_time": "కుటుంబ సమయం",
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
      "impact": {
        "house": "మీ జన్మ కుండలిలో {{n}}వ భావం",
        "months": "ఉత్తమ నెల: {{best}}. కష్టమైన నెల: {{hard}}.",
        "strength": "బలం",
        "topArea": "బలంగా ఉంది: {{area}}"
      },
      "moves": {
        "bindusRange": "బిందువులు {{min}} నుండి {{max}}",
        "label": "{{planet}} 2027 సంవత్సరం పన్నెండు నెలల పాటు",
        "note": "బిందువులు ఒక గృహం ఆ గ్రహానికి ఎంత సహకారంగా ఉంటుందో చూపిస్తాయి; ఎక్కువ ఉంటే సులభం.",
        "segment": "{{from}} నుండి {{to}} · భవనం {{house}} · రాశి {{sign}} · {{bindus}} బిందువులు",
        "segmentOne": "{{from}} · భవనం {{house}} · రాశి {{sign}} · {{bindus}} బిందువులు"
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
      "wave": {
        "label": "2027 సంవత్సరం రోజువారీ లయం",
        "to": "నుండి"
      },
      "yoga": {
        "delivers": "ఫలితం ఇస్తుంది: {{months}}",
        "group": {
          "natal": "మీ జన్మ జాతకం నుండి",
          "tajika": "మీ వర్ష జాతకాల నుండి"
        },
        "noMonths": "జాతకంలో ఉంది; ఏ నెలనూ ప్రత్యేకంగా లేదు"
      }
    }
  },
  ta: {
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
      "art": {
        "missing": "கலைப்பொருள் {{code}} சேர்க்கப்பட வேண்டும்"
      },
      "decision": {
        "best": "சிறந்த காலம்: {{from}} முதல் {{to}} வரை ({{score}}) {{tier}}",
        "business_launch": "வணிகத் தொடக்கம்",
        "commit_relationship": "உறவில் நிலைத்தன்மை",
        "family_time": "குடும்ப நேரம்",
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
      "impact": {
        "house": "உங்கள் ஜாதகத்தில் {{n}}-ஆம் வீடு",
        "months": "சிறந்த மாதம்: {{best}}. சற்று சவாலான மாதம்: {{hard}}.",
        "strength": "வலிமை",
        "topArea": "மிகவும் வலுவானது: {{area}}"
      },
      "moves": {
        "bindusRange": "பிந்துக்கள் {{min}} முதல் {{max}} வரை",
        "label": "{{planet}} 2027-ன் பன்னிரண்டு மாதங்களில்",
        "note": "ஒரு கோளுக்கு ஒரு வீடு எவ்வளவு ஆதரவாக உள்ளது என்பதை bindus காட்டுகின்றன; அதிகம் என்றால் எளிது.",
        "segment": "{{from}} முதல் {{to}} · வீடு {{house}} · ராசி {{sign}} · {{bindus}} பிந்துக்கள்",
        "segmentOne": "{{from}} · வீடு {{house}} · ராசி {{sign}} · {{bindus}} பிந்துக்கள்"
      },
      "panchadhikari": {
        "aspectsLagna": "Lagnவைப் பார்க்கிறது",
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
      "wave": {
        "label": "2027-ன் தினசரி இயல்பு",
        "to": "வரை"
      },
      "yoga": {
        "delivers": "நிறைவேற்றும்: {{months}}",
        "group": {
          "natal": "உங்கள் பிறப்பு ஜாதகத்திலிருந்து",
          "tajika": "உங்கள் Varsha ஜாதகங்களிலிருந்து"
        },
        "noMonths": "ஜாதகத்தில் உள்ளது; எந்த மாதமும் குறிப்பிடத்தக்கது அல்ல"
      }
    }
  },
  gu: {
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
      "art": {
        "missing": "આર્ટવર્ક {{code}} ઉમેરવાનું બાકી છે"
      },
      "decision": {
        "best": "સૌથી શુભ સમયગાળો: {{from}} થી {{to}} ({{score}}) {{tier}}",
        "business_launch": "વ્યવસાય શરૂ કરવો",
        "commit_relationship": "સંબંધમાં સ્થિર થવું",
        "family_time": "પરિવાર સાથેનો સમય",
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
      "impact": {
        "house": "તમારા જન્મ ચાર્ટનો {{n}}મો ભાવ",
        "months": "સૌથી શુભ મહિનો: {{best}}. થોડો મુશ્કેલ મહિનો: {{hard}}.",
        "strength": "શક્તિ",
        "topArea": "સૌથી મજબૂત: {{area}}"
      },
      "moves": {
        "bindusRange": "બિંદુઓ {{min}} થી {{max}}",
        "label": "{{planet}} દ્વારા 2027 ના બારે મહિનાઓ",
        "note": "બિંદુઓ દર્શાવે છે કે કોઈ ઘર તે ગ્રહ માટે કેટલો સહાયક છે; વધુ હોય તો સરળ.",
        "segment": "{{from}} થી {{to}} · ભવ {{house}} · {{sign}} · {{bindus}} બિંદુઓ",
        "segmentOne": "{{from}} · ભવ {{house}} · {{sign}} · {{bindus}} બિંદુઓ"
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
      "wave": {
        "label": "વર્ષ 2027 નો દૈનિક લય",
        "to": "થી"
      },
      "yoga": {
        "delivers": "પૂરું કરે છે: {{months}}",
        "group": {
          "natal": "તમારા જન્મ કુંડળીમાંથી",
          "tajika": "તમારા વર્ષા કુંડળીઓમાંથી"
        },
        "noMonths": "કુંડળીમાં હાજર; કોઈ મહિનો અલગ નથી"
      }
    }
  },
};
