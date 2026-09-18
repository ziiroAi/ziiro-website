/**
 * useMarket: which market's hourly rate the visitor sees.
 *
 * The market is always the one the visitor's IP maps to. It is looked up on
 * every page load (see geoService), and there is deliberately no way to pick
 * another region. When no country can be found, the GLOBAL rate applies.
 *
 * SSR-safe: nothing touches the browser during render. The server render and
 * the first client render are GLOBAL with `resolving: true`, and the lookup
 * runs in an effect.
 *
 * State lives in one module-level store, so every component that calls
 * useMarket() shares the same market and the lookup runs once per page load,
 * not once per caller.
 */
import { useEffect, useSyncExternalStore } from "react";

import {
  MARKETS,
  marketForCountry,
  type Market,
  type MarketCode,
} from "@/features/pricing/entities/rates";
import { detectCountry } from "@/features/pricing/services/geoService";

export type MarketSource = "geo" | "default";

interface MarketState {
  code: MarketCode;
  source: MarketSource;
  resolving: boolean;
}

const INITIAL: MarketState = { code: "GLOBAL", source: "default", resolving: true };

let state = INITIAL;
let started = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;
const getServerSnapshot = () => INITIAL;

function resolveMarket() {
  if (started) return;
  started = true;

  detectCountry().then((country) => {
    state = country
      ? { code: marketForCountry(country), source: "geo", resolving: false }
      : { code: "GLOBAL", source: "default", resolving: false };
    listeners.forEach((listener) => listener());
  });
}

export function useMarket(): {
  market: Market;
  code: MarketCode;
  source: MarketSource;
  resolving: boolean;
} {
  const { code, source, resolving } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    resolveMarket();
  }, []);

  return { market: MARKETS[code], code, source, resolving };
}
