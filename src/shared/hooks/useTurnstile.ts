/** (C) The Turnstile widget as a hook, for /contact and the funnel's S7 (spec §13.4). */
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { createTokenBox, loadTurnstile, type TurnstileApi, type TurnstileRenderOptions } from "@/shared/lib/turnstile";

export interface TurnstileOptions {
  siteKey: string | undefined;
  action?: string;
  appearance?: TurnstileRenderOptions["appearance"];
  theme?: TurnstileRenderOptions["theme"];
}

export interface TurnstileHandle {
  hostRef: RefObject<HTMLDivElement>;
  token: string;
  /** The token, waiting up to ms for one. "" at once when there's no site key. */
  waitForToken(ms: number): Promise<string>;
  /** Clears the token and asks the widget for a fresh one, because a token is single use. */
  reset(): void;
}

export function useTurnstile({ siteKey, action, appearance, theme = "auto" }: TurnstileOptions): TurnstileHandle {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<TurnstileApi | null>(null);
  const widgetRef = useRef<string | null>(null);
  const [box] = useState(createTokenBox);
  const [token, setToken] = useState("");

  const take = useCallback(
    (next: string) => {
      box.set(next);
      setToken(next);
    },
    [box],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!siteKey || !host) return;
    let cancelled = false;
    loadTurnstile(siteKey)
      .then((api) => {
        if (cancelled || !api || widgetRef.current) return;
        apiRef.current = api;
        widgetRef.current = api.render(host, {
          sitekey: siteKey,
          ...(action ? { action } : {}),
          ...(appearance ? { appearance } : {}),
          theme,
          callback: take,
          "expired-callback": () => take(""),
          "error-callback": () => take(""),
        });
      })
      // No script means no token. The send goes without one, and the server treats that as a failed check (§10).
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (apiRef.current && widgetRef.current) apiRef.current.remove(widgetRef.current);
      widgetRef.current = null;
    };
  }, [siteKey, action, appearance, theme, take]);

  const waitForToken = useCallback((ms: number) => (siteKey ? box.wait(ms) : Promise.resolve("")), [box, siteKey]);
  const reset = useCallback(() => {
    take("");
    if (apiRef.current && widgetRef.current) apiRef.current.reset(widgetRef.current);
  }, [take]);

  return { hostRef, token, waitForToken, reset };
}
