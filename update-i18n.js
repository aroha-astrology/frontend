const fs = require('fs');
const path = 'c:/Users/subir/.gemini/antigravity-ide/scratch/aroha-astrology/i18n/resources.ts';
let content = fs.readFileSync(path, 'utf8');

const replacements = [
  ['whatYouWillFeel: "What you will feel"', 'whatYouWillFeel: "Key Themes"'],
  ['whatYouWillFeel: "आप क्या महसूस करेंगे"', 'whatYouWillFeel: "मुख्य विषय"'],
  ['whatYouWillFeel: "আপনি কী অনুভব করবেন"', 'whatYouWillFeel: "প্রধান বিষয়"'],
  ['whatYouWillFeel: "तुम्हाला काय जाणवेल"', 'whatYouWillFeel: "मुख्य विषय"'],
  ['whatYouWillFeel: "మీరు ఏమి అనుభవిస్తారు"', 'whatYouWillFeel: "ముఖ్య అంశాలు"'],
  ['whatYouWillFeel: "நீங்கள் என்ன உணருவீர்கள்"', 'whatYouWillFeel: "முக்கிய அம்சங்கள்"'],
  ['whatYouWillFeel: "તમે શું અનુભવશો"', 'whatYouWillFeel: "મુખ્ય વિષયો"']
];

for (const [oldVal, newVal] of replacements) {
  content = content.replace(oldVal, newVal);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Translations updated!');
