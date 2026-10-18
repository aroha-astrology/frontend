export type ProfileQuote =
  | { kind: "free-slot" }
  | { kind: "free-pass" }
  | { kind: "paid"; pricePaise: number };

export interface ProfileQuoteInput {
  offerOn: boolean;
  freeLeft: number;
  hasPass: boolean;
  legacyPaise: number;
  extraPaise: number;
}

export function profileCreationQuote(input: ProfileQuoteInput): ProfileQuote {
  if (input.offerOn === false) {
    return { kind: "paid", pricePaise: input.legacyPaise };
  } else if (input.freeLeft > 0) {
    return { kind: "free-slot" };
  } else if (input.hasPass) {
    return { kind: "free-pass" };
  } else {
    return { kind: "paid", pricePaise: input.extraPaise };
  }
}
