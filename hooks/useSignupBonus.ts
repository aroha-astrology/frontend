"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/**
 * The live new-user wallet bonus, in paise, for the signed-out sign-in and
 * sign-up screens. `null` until it has loaded, or if the lookup failed, and
 * `0` when an admin has switched the bonus off. Callers show the bonus line
 * only for a positive amount, so the screen never advertises a figure the
 * server won't actually credit.
 */
export function useSignupBonus(): number | null {
  const [amountPaise, setAmountPaise] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .signupBonus()
      .then(({ amountPaise }) => {
        if (!cancelled) setAmountPaise(amountPaise);
      })
      .catch(() => {
        // Leave it null: no bonus line beats a wrong one.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return amountPaise;
}
