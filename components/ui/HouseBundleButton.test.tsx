import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import HouseBundleButton from "./HouseBundleButton";

// The "Unlock all houses" button on the house-unlock screen: what it says, what it costs, what it
// saves, and that it cannot be tapped twice while it is working.

// The attribute itself: the styling class "disabled:opacity-50" also contains the word.
const DISABLED_ATTR = /\sdisabled=""/;

const base = {
  label: "Unlock all 10 houses",
  priceText: "🪙 149",
  savingText: "Save 🪙 101" as string | null,
  busy: false,
  disabled: false,
  onClick: () => {},
};

describe("HouseBundleButton", () => {
  it("shows the label, the price and the saving", () => {
    const html = renderToStaticMarkup(<HouseBundleButton {...base} />);
    expect(html).toContain("Unlock all 10 houses");
    expect(html).toContain("🪙 149");
    expect(html).toContain('data-testid="house-bundle-saving"');
    expect(html).toContain("Save 🪙 101");
  });

  it("is a real, enabled button by default", () => {
    const html = renderToStaticMarkup(<HouseBundleButton {...base} />);
    expect(html).toMatch(/^<button[^>]*type="button"/);
    expect(html).toContain('data-testid="house-bundle"');
    expect(html).not.toMatch(DISABLED_ATTR);
    expect(html).not.toContain("animate-spin");
  });

  it("leaves out the saving line when there is no saving", () => {
    const html = renderToStaticMarkup(<HouseBundleButton {...base} savingText={null} />);
    expect(html).not.toContain("house-bundle-saving");
  });

  it("while busy it shows the spinner and cannot be tapped", () => {
    const html = renderToStaticMarkup(<HouseBundleButton {...base} busy />);
    expect(html).toContain("animate-spin");
    expect(html).toMatch(DISABLED_ATTR);
  });

  it("when disabled it cannot be tapped and shows no spinner", () => {
    const html = renderToStaticMarkup(<HouseBundleButton {...base} disabled />);
    expect(html).toMatch(DISABLED_ATTR);
    expect(html).not.toContain("animate-spin");
  });

  it("keeps the gold button styling", () => {
    const html = renderToStaticMarkup(<HouseBundleButton {...base} />);
    expect(html).toContain("border-gold/40");
    expect(html).toContain("text-emerald-400");
  });
});
