/**
 * (C) Cloudflare Turnstile, shared by /contact and the funnel's S7 (spec §13.4): one script, loaded once per page,
 * and a box that hands out the widget's token. A token is single use and lasts 300 s; the widget renews it itself.
 */
export const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** The public half of the key, read at build time. Without it there is no widget and no third-party request. */
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

export interface TurnstileRenderOptions {
  sitekey: string;
  action?: string;
  appearance?: "always" | "execute" | "interaction-only";
  theme?: "light" | "dark" | "auto";
  callback(token: string): void;
  "expired-callback"(): void;
  "error-callback"(): void;
}

export interface TurnstileApi {
  render(host: HTMLElement, options: TurnstileRenderOptions): string;
  reset(widgetId?: string): void;
  remove(widgetId?: string): void;
}

type TurnstileWindow = Window & { turnstile?: TurnstileApi };
let loading: Promise<TurnstileApi | null> | null = null;

/** Loads the script once per page, or never without a site key. After a failed load, the next call tries again. */
export function loadTurnstile(siteKey: string | undefined, doc: Document = document): Promise<TurnstileApi | null> {
  if (!siteKey) return Promise.resolve(null);
  const api = () => (doc.defaultView as TurnstileWindow | null)?.turnstile ?? null;
  const ready = api();
  if (ready) return Promise.resolve(ready);
  if (loading) return loading;
  loading = new Promise<TurnstileApi | null>((resolve, reject) => {
    const existing = doc.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SRC}"]`);
    const script = existing ?? doc.createElement("script");
    script.addEventListener("load", () => resolve(api()));
    script.addEventListener("error", () => {
      loading = null;
      script.remove();
      reject(new Error("Turnstile did not load"));
    });
    if (!existing) {
      script.src = TURNSTILE_SRC;
      script.async = true;
      script.defer = true;
      doc.head.appendChild(script);
    }
  });
  return loading;
}

export interface TokenBox {
  get(): string;
  set(token: string): void;
  /** The token now, or the next one within ms; "" if none comes (Review Focus 4). */
  wait(ms: number): Promise<string>;
}

export function createTokenBox(): TokenBox {
  let token = "";
  let waiting: ReadonlyArray<(token: string) => void> = [];
  return {
    get: () => token,
    set(next) {
      token = next;
      if (!next) return;
      const ready = waiting;
      waiting = [];
      ready.forEach((resolve) => resolve(next));
    },
    wait(ms) {
      if (token) return Promise.resolve(token);
      return new Promise<string>((resolve) => {
        const done = (value: string) => {
          clearTimeout(timer);
          resolve(value);
        };
        const timer = setTimeout(() => {
          waiting = waiting.filter((waiter) => waiter !== done);
          resolve("");
        }, Math.max(0, ms));
        waiting = [...waiting, done];
      });
    },
  };
}
