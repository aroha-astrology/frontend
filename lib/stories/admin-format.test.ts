import { describe, expect, it } from "vitest";
import { formatShares, sortedChannels } from "./admin-format";

describe("sortedChannels", () => {
  it("lists the channels that were used, most used first, by their dashboard names", () => {
    expect(sortedChannels({ x: 6, whatsapp: 20, instagramStory: 8 })).toEqual([
      { name: "WhatsApp", count: 20 },
      { name: "Instagram Story", count: 8 },
      { name: "X", count: 6 },
    ]);
  });

  it("drops channels nobody used and breaks ties by name", () => {
    expect(sortedChannels({ sms: 3, copy: 3, instagram: 0 })).toEqual([
      { name: "Copy", count: 3 },
      { name: "SMS", count: 3 },
    ]);
  });

  it("shows a channel it has no name for as it was recorded", () => {
    expect(sortedChannels({ telegram: 2 })).toEqual([{ name: "telegram", count: 2 }]);
  });
});

describe("formatShares", () => {
  it("is just the number when nothing was shared", () => {
    expect(formatShares(0, {})).toBe("0");
    expect(formatShares(0, { whatsapp: 0 })).toBe("0");
  });

  it("names the one place every share went to", () => {
    expect(formatShares(12, { whatsapp: 12 })).toBe("12 (WhatsApp)");
  });

  it("puts each place and its count in brackets when there are several", () => {
    expect(formatShares(34, { x: 6, whatsappStatus: 20, instagramStory: 8 })).toBe(
      "34 (WhatsApp Status 20, Instagram Story 8, X 6)",
    );
  });
});
