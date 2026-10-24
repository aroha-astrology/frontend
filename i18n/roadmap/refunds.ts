import type { RoadmapBundle } from "./types";

/**
 * Google Play refunds (backend billing/play-refunds.service.ts): the notice on the
 * recharge screen, the "wallet owes" note, the blocked-account message, a report
 * locked until the debt is paid, and the payment-history labels.
 */
export const refundsBundle: RoadmapBundle = {
  en: {
    refunds: {
      notice: "If Google Play refunds a payment, the money it put in your wallet is taken back.",
      walletOwes:
        "Your wallet owes {{amount}} from a refunded Google Play payment. Rewards and recharges pay this off first.",
      purchasesBlocked:
        "Payments are turned off for this account after repeated Google Play refunds. Please contact support.",
      reportLockedTitle: "This report is locked",
      reportLockedBody:
        "It was bought with money Google Play refunded. It opens again once your wallet is back to zero ({{amount}} to go).",
      addMoney: "Add money",
    },
    paymentHistory: {
      playRefund: "Google Play refund taken back",
      statusRefunded: "Refunded",
    },
  },
  hi: {
    refunds: {
      notice: "अगर Google Play किसी भुगतान का रिफ़ंड करता है, तो उससे वॉलेट में जुड़ी राशि वापस ले ली जाती है।",
      walletOwes:
        "Google Play के रिफ़ंड किए गए भुगतान की वजह से आपके वॉलेट पर {{amount}} बाकी है। इनाम और रिचार्ज पहले इसे चुकाएँगे।",
      purchasesBlocked:
        "बार-बार Google Play रिफ़ंड के कारण इस खाते के लिए भुगतान बंद हैं। कृपया सहायता से संपर्क करें।",
      reportLockedTitle: "यह रिपोर्ट बंद है",
      reportLockedBody:
        "यह उस पैसे से ली गई थी जिसका Google Play ने रिफ़ंड किया। आपका वॉलेट शून्य पर लौटते ही यह फिर खुल जाएगी (अभी {{amount}} बाकी)।",
      addMoney: "पैसे जोड़ें",
    },
    paymentHistory: {
      playRefund: "Google Play रिफ़ंड वापस लिया गया",
      statusRefunded: "रिफ़ंड हुआ",
    },
  },
  bn: {
    refunds: {
      notice: "Google Play কোনো পেমেন্ট ফেরত দিলে, তাতে ওয়ালেটে যা যোগ হয়েছিল তা ফেরত নেওয়া হয়।",
      walletOwes:
        "ফেরত দেওয়া একটি Google Play পেমেন্টের জন্য আপনার ওয়ালেটে {{amount}} বাকি আছে। পুরস্কার আর রিচার্জ আগে এটা শোধ করবে।",
      purchasesBlocked:
        "বারবার Google Play রিফান্ডের কারণে এই অ্যাকাউন্টে পেমেন্ট বন্ধ আছে। অনুগ্রহ করে সহায়তায় যোগাযোগ করুন।",
      reportLockedTitle: "এই রিপোর্টটি বন্ধ আছে",
      reportLockedBody:
        "এটি এমন টাকায় কেনা হয়েছিল যা Google Play ফেরত দিয়েছে। আপনার ওয়ালেট শূন্যে ফিরলেই এটি আবার খুলবে (এখনও {{amount}} বাকি)।",
      addMoney: "টাকা যোগ করুন",
    },
    paymentHistory: {
      playRefund: "Google Play রিফান্ড ফেরত নেওয়া হয়েছে",
      statusRefunded: "ফেরত হয়েছে",
    },
  },
  mr: {
    refunds: {
      notice: "Google Play ने एखाद्या पेमेंटचा परतावा दिल्यास, त्याने वॉलेटमध्ये जोडलेली रक्कम परत घेतली जाते.",
      walletOwes:
        "परत केलेल्या Google Play पेमेंटमुळे तुमच्या वॉलेटवर {{amount}} बाकी आहे. बक्षिसे आणि रिचार्ज आधी हे फेडतील.",
      purchasesBlocked:
        "वारंवार Google Play परताव्यांमुळे या खात्यासाठी पेमेंट बंद आहेत. कृपया सहाय्याशी संपर्क साधा.",
      reportLockedTitle: "हा अहवाल बंद आहे",
      reportLockedBody:
        "तो Google Play ने परत केलेल्या पैशांनी घेतला होता. तुमचे वॉलेट शून्यावर येताच तो पुन्हा उघडेल (अजून {{amount}} बाकी).",
      addMoney: "पैसे जोडा",
    },
    paymentHistory: {
      playRefund: "Google Play परतावा परत घेतला",
      statusRefunded: "परत केले",
    },
  },
  te: {
    refunds: {
      notice: "Google Play ఏదైనా చెల్లింపును తిరిగి ఇస్తే, దానితో వాలెట్‌లో చేరిన మొత్తం తిరిగి తీసుకోబడుతుంది.",
      walletOwes:
        "తిరిగి ఇచ్చిన ఒక Google Play చెల్లింపు వల్ల మీ వాలెట్‌పై {{amount}} బాకీ ఉంది. బహుమతులు, రీఛార్జ్‌లు ముందుగా దీన్ని తీరుస్తాయి.",
      purchasesBlocked:
        "పదే పదే Google Play రీఫండ్‌ల వల్ల ఈ ఖాతాకు చెల్లింపులు ఆపివేయబడ్డాయి. దయచేసి సహాయాన్ని సంప్రదించండి.",
      reportLockedTitle: "ఈ రిపోర్ట్ లాక్ అయింది",
      reportLockedBody:
        "ఇది Google Play తిరిగి ఇచ్చిన డబ్బుతో కొనబడింది. మీ వాలెట్ సున్నాకు చేరగానే ఇది మళ్లీ తెరుచుకుంటుంది (ఇంకా {{amount}} మిగిలి ఉంది).",
      addMoney: "డబ్బు జోడించండి",
    },
    paymentHistory: {
      playRefund: "Google Play రీఫండ్ తిరిగి తీసుకోబడింది",
      statusRefunded: "తిరిగి ఇవ్వబడింది",
    },
  },
  ta: {
    refunds: {
      notice: "Google Play ஒரு கட்டணத்தைத் திருப்பிக் கொடுத்தால், அதனால் வாலட்டில் சேர்ந்த தொகை திரும்ப எடுக்கப்படும்.",
      walletOwes:
        "திருப்பிக் கொடுக்கப்பட்ட ஒரு Google Play கட்டணத்தால் உங்கள் வாலட்டில் {{amount}} நிலுவையில் உள்ளது. வெகுமதிகளும் ரீசார்ஜ்களும் முதலில் இதைச் சரிசெய்யும்.",
      purchasesBlocked:
        "மீண்டும் மீண்டும் Google Play பணத்திரும்பல்களால் இந்தக் கணக்கிற்குக் கட்டணங்கள் நிறுத்தப்பட்டுள்ளன. உதவியைத் தொடர்பு கொள்ளவும்.",
      reportLockedTitle: "இந்த அறிக்கை பூட்டப்பட்டுள்ளது",
      reportLockedBody:
        "இது Google Play திருப்பிக் கொடுத்த பணத்தில் வாங்கப்பட்டது. உங்கள் வாலட் பூஜ்ஜியத்திற்குத் திரும்பியதும் இது மீண்டும் திறக்கும் (இன்னும் {{amount}} உள்ளது).",
      addMoney: "பணம் சேர்க்கவும்",
    },
    paymentHistory: {
      playRefund: "Google Play பணத்திரும்பல் திரும்ப எடுக்கப்பட்டது",
      statusRefunded: "திருப்பித் தரப்பட்டது",
    },
  },
  gu: {
    refunds: {
      notice: "જો Google Play કોઈ ચુકવણી પરત કરે, તો તેનાથી વૉલેટમાં ઉમેરાયેલી રકમ પાછી લેવાય છે.",
      walletOwes:
        "પરત કરાયેલી Google Play ચુકવણીને કારણે તમારા વૉલેટ પર {{amount}} બાકી છે. ઇનામ અને રિચાર્જ પહેલાં આ ચૂકવશે.",
      purchasesBlocked:
        "વારંવાર Google Play રિફંડને કારણે આ ખાતા માટે ચુકવણી બંધ છે. કૃપા કરીને સહાયનો સંપર્ક કરો.",
      reportLockedTitle: "આ રિપોર્ટ બંધ છે",
      reportLockedBody:
        "તે Google Play એ પરત કરેલા પૈસાથી લેવાયો હતો. તમારું વૉલેટ શૂન્ય પર આવતાં જ તે ફરી ખૂલશે (હજી {{amount}} બાકી).",
      addMoney: "પૈસા ઉમેરો",
    },
    paymentHistory: {
      playRefund: "Google Play રિફંડ પાછું લેવાયું",
      statusRefunded: "પરત થયું",
    },
  },
};
