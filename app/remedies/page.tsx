import { remedies } from "@/data/remedies";
import SectionTitle from "@/components/SectionTitle";

export default function RemediesPage() {
  return (
    <main className="min-h-screen pb-28" style={{ background: "var(--background)" }}>
      <div className="px-5 pt-10">
        <SectionTitle
          title="🪔 Daily Remedies"
          subtitle="Vedic remedies to harmonise your planetary energies"
        />

        <div className="mt-2 space-y-4">
          {remedies.map((item) => (
            <div
              key={item.title}
              className="p-5 rounded-3xl border transition-colors"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{item.icon}</span>
                <h3 className="text-base font-semibold text-gold">{item.title}</h3>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {item.remedy}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
