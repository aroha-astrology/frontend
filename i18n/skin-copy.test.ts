import { describe, expect, it } from "vitest";
import i18next from "i18next";
import { COSMIC_COPY, applySkinCopy } from "./skin-copy";

async function instance() {
  const i18n = i18next.createInstance();
  await i18n.init({
    lng: "en",
    resources: {
      en: { translation: { nav: { home: "Home", askAI: "Ask Baba Ji" }, other: { keep: "Untouched" } } },
      hi: { translation: { nav: { home: "होम" } } },
    },
  });
  return i18n;
}

describe("applySkinCopy", () => {
  it("swaps the labels to the Cosmic wording and back to exactly the Classic wording", async () => {
    const i18n = await instance();
    applySkinCopy(i18n, true);
    expect(i18n.t("nav.home")).toBe(COSMIC_COPY.en!["nav.home"]);
    expect(i18n.t("nav.askAI")).toBe("Ask Orion");
    expect(i18n.t("other.keep")).toBe("Untouched");
    applySkinCopy(i18n, false);
    expect(i18n.t("nav.home")).toBe("Home");
    expect(i18n.t("nav.askAI")).toBe("Ask Baba Ji");
  });

  it("applying twice, or restoring without applying, changes nothing", async () => {
    const i18n = await instance();
    applySkinCopy(i18n, false);
    expect(i18n.t("nav.home")).toBe("Home");
    applySkinCopy(i18n, true);
    applySkinCopy(i18n, true);
    applySkinCopy(i18n, false);
    expect(i18n.t("nav.home")).toBe("Home");
  });

  it("a language with no Cosmic wording keeps its own labels", async () => {
    const i18n = await instance();
    await i18n.changeLanguage("hi");
    applySkinCopy(i18n, true);
    expect(i18n.t("nav.home")).toBe("होम");
  });

  it("a key that has no base string is left out rather than invented", async () => {
    const i18n = await instance();
    applySkinCopy(i18n, true);
    expect(i18n.exists("nav.kundli")).toBe(false);
    applySkinCopy(i18n, false);
    expect(i18n.exists("nav.kundli")).toBe(false);
  });

  it("tells subscribed components to re-render", async () => {
    const i18n = await instance();
    let fired = 0;
    i18n.on("languageChanged", () => fired++);
    applySkinCopy(i18n, true);
    expect(fired).toBe(1);
  });
});
