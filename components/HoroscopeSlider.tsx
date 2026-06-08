"use client";

import { Star } from "lucide-react";
import { GiAries, GiTaurus, GiAquarius } from "react-icons/gi";
import Card from "@/components/ui/Card";

// Map zodiac names directly to highly-detailed solid vector silhouettes from react-icons!
const getZodiacIcon = (name: string) => {
  if (name === "Aries") return <GiAries className="w-7 h-7" />;
  if (name === "Taurus") return <GiTaurus className="w-7 h-7" />;
  if (name === "Aquarius") return <GiAquarius className="w-7 h-7" />;
  return <Star className="w-6 h-6" />; // fallback
};

const mockHoroscopes = [
  { name: "Aries", dates: "Mar 21 - Apr 19", rating: 4, text: "A day of new beginnings and positive energy." },
  { name: "Taurus", dates: "Apr 20 - May 20", rating: 4, text: "Focus on stability and long-term growth." },
  { name: "Aquarius", dates: "Jan 20 - Feb 18", rating: 5, text: "Innovation flows naturally today. Trust your visions." },
];

export default function HoroscopeSlider() {
  const displayCards = mockHoroscopes;

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide pr-5">
      {displayCards.map((sign, index) => (
        <Card
          key={sign.name}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="min-w-[160px] max-w-[160px] p-4 border-gold/10 hover:border-gold/30 flex-shrink-0"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full border border-gold/40 flex items-center justify-center text-gold drop-shadow-[0_0_5px_rgba(223,181,100,0.3)]">
              {getZodiacIcon(sign.name)}
            </div>
            <div>
              <h3 className="text-foreground text-sm font-semibold tracking-wide font-display">{sign.name}</h3>
              <p className="text-[9px] text-muted leading-tight">{sign.dates}</p>
            </div>
          </div>
          
          <div className="flex gap-0.5 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={10}
                className={i < (sign.rating || 4) ? "fill-gold text-gold" : "text-gold/20"}
              />
            ))}
          </div>
          
          <p className="text-xs text-muted leading-relaxed">
            {sign.text}
          </p>
        </Card>
      ))}
    </div>
  );
}
