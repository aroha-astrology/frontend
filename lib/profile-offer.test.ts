import { describe, expect, it } from "vitest";
import { profileCreationQuote } from "./profile-offer";

// What adding a profile costs. Mirrors the server (backend createProfile): with the offer off the
// price is the old one; with it on the first free slots cost nothing, then a Pass member adds them
// free, and anyone else pays the extra price.

const base = { offerOn: true, freeLeft: 0, hasPass: false, legacyPaise: 20000, extraPaise: 9900 };

describe("profileCreationQuote", () => {
  it("with the offer off it is the old price, whatever the slots or the Pass say", () => {
    expect(profileCreationQuote({ ...base, offerOn: false })).toEqual({ kind: "paid", pricePaise: 20000 });
    expect(profileCreationQuote({ ...base, offerOn: false, freeLeft: 3, hasPass: true })).toEqual({
      kind: "paid",
      pricePaise: 20000,
    });
  });

  it("a free slot is used first, even for a Pass member", () => {
    expect(profileCreationQuote({ ...base, freeLeft: 3 })).toEqual({ kind: "free-slot" });
    expect(profileCreationQuote({ ...base, freeLeft: 1, hasPass: true })).toEqual({ kind: "free-slot" });
  });

  it("with the slots used up a Pass member adds a profile free", () => {
    expect(profileCreationQuote({ ...base, hasPass: true })).toEqual({ kind: "free-pass" });
  });

  it("with the slots used up and no Pass the price is the extra price", () => {
    expect(profileCreationQuote(base)).toEqual({ kind: "paid", pricePaise: 9900 });
  });

  it("a negative or zero slot count is not a free slot", () => {
    expect(profileCreationQuote({ ...base, freeLeft: 0 })).toEqual({ kind: "paid", pricePaise: 9900 });
    expect(profileCreationQuote({ ...base, freeLeft: -1 })).toEqual({ kind: "paid", pricePaise: 9900 });
  });
});
