import { Toaster } from "@/shared/ui/toaster";
import { Toaster as Sonner } from "@/shared/ui/sonner";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { lazy, Suspense, useEffect, useRef } from "react";
import Navbar from "@/shared/components/Navbar";
import Footer from "@/shared/components/Footer";
import Preloader from "@/shared/components/Preloader";
import PageAtmosphere from "@/shared/components/PageAtmosphere";
import SmoothScroll, { easeInOutCubic, headerOffset, scrollTo } from "@/shared/motion/SmoothScroll";
import ScrollProgress from "@/shared/motion/ScrollProgress";
import Index from "@/pages/Index";

// Secondary routes are code-split so they don't ship in the homepage's
// critical bundle. Each loads on demand when its route is visited.
const Contact = lazy(() => import("@/pages/Contact"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Mission = lazy(() => import("@/pages/Mission"));
const WhoWeAre = lazy(() => import("@/pages/WhoWeAre"));
const Products = lazy(() => import("@/pages/Products"));
const Docs = lazy(() => import("@/pages/Docs"));
const Watch = lazy(() => import("@/pages/Watch"));
const NotFound = lazy(() => import("@/pages/NotFound"));

/**
 * Every page opens from the top, with no inherited scroll positions, unless the
 * URL names a section (`/who-we-are#process`). Then it opens on that section.
 *
 * This goes through `scrollTo` rather than `window.scrollTo` because Lenis is
 * driving the scroller: a raw `window.scrollTo` sets the document position
 * while Lenis still believes it is somewhere else, and the next frame it eases
 * the page back to where it thought it was. `immediate` jumps without easing,
 * which is what a route change wants.
 *
 * Landing on a hash target takes five precautions:
 *
 *   1. **Wait for the element.** Secondary pages are lazy, so it only exists
 *      once the chunk has loaded. The effect polls once a frame, capped, so a
 *      hash that names nothing gives up with the page at the top.
 *   2. **Only a rendered match counts.** A suspended page stays mounted but
 *      hidden (display: none) while the next one loads, and it can hold an
 *      element with the same id: Docs has its own #process.
 *   3. **Resync Lenis first.** It caches the page height and its own idea of
 *      where it is, and both go stale when a page swaps in under it. A scroll
 *      then clamps to the old page's height, or is skipped outright because
 *      Lenis believes it is already there.
 *   4. **Measure layout, not the box.** Scroll-linked scenes hold sections
 *      translated until they arrive, and a transformed box would land the page
 *      off by that distance. The landing keeps the header offset so the
 *      section's heading isn't under the fixed navbar.
 *   5. **Correct while layout settles.** Fonts, media and sections that swap
 *      their first render can still move the target after the jump. Any
 *      wheel, touch, key or pointer input ends that correction at once.
 *
 * A hash change on the page you're already on travels there instead of
 * jumping.
 */
const HASH_WAIT_MS = 8000;
/** How long a landing keeps correcting for layout that is still moving. */
const SETTLE_MS = 3000;
/** Stop correcting once the target has held still for this long. */
const STABLE_MS = 1000;
const READER_INPUT = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

/** Re-measure the page and sync Lenis to the real scroll position (see 3 above). */
const resyncScroller = () => window.__lenis?.resize();

/** Document Y of an element's layout box, ignoring CSS transforms. */
function layoutTop(el: HTMLElement): number {
  let top = 0;
  for (let node: HTMLElement | null = el; node; node = node.offsetParent as HTMLElement | null) {
    top += node.offsetTop;
  }
  return top;
}

/** Where the page must sit for `el` to land under the navbar, within what the page can scroll. */
function restingY(el: HTMLElement): number {
  const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
  return Math.min(Math.max(layoutTop(el) + headerOffset(), 0), max);
}

function ScrollToTop() {
  const { pathname, hash, key } = useLocation();
  const lastPathname = useRef<string | null>(null);
  // Re-run when the same #section link is clicked again, which changes only
  // the location key. Plain navigations still key on the pathname alone.
  const hashVisit = hash ? key : "";

  useEffect(() => {
    const samePage = lastPathname.current === pathname;
    lastPathname.current = pathname;

    if (!hash || !samePage) {
      resyncScroller();
      scrollTo(0, { immediate: true });
    }
    if (!hash) return;

    let id = hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      /* malformed escape: look the id up as written */
    }
    const travel = samePage && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let interrupted = false;
    const interrupt = () => {
      interrupted = true;
    };
    const release = () => {
      for (const type of READER_INPUT) window.removeEventListener(type, interrupt);
    };
    for (const type of READER_INPUT) window.addEventListener(type, interrupt, { passive: true });

    const started = performance.now();
    let target: HTMLElement | null = null;
    let landedAt = 0;
    let stillSince = 0;
    let frame = 0;

    const tick = () => {
      const now = performance.now();
      if (!target) {
        const el = document.getElementById(id);
        if (!el || el.getClientRects().length === 0) {
          if (now - started < HASH_WAIT_MS) frame = requestAnimationFrame(tick);
          else release();
          return;
        }
        target = el;
        resyncScroller();
        const y = restingY(el);
        if (travel) {
          scrollTo(y, {
            duration: Math.min(1.7, 0.7 + Math.abs(y - window.scrollY) / 2600),
            easing: easeInOutCubic,
          });
          release();
          return;
        }
        scrollTo(y, { immediate: true });
        landedAt = stillSince = now;
      } else {
        if (interrupted || now - landedAt > SETTLE_MS || now - stillSince > STABLE_MS) {
          release();
          return;
        }
        const y = restingY(target);
        if (Math.abs(window.scrollY - y) > 2) {
          resyncScroller();
          scrollTo(y, { immediate: true });
          stillSince = now;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      release();
    };
  }, [pathname, hash, hashVisit]);

  return null;
}

const queryClient = new QueryClient();

/** App-wide providers, shared by the client entry and the SSG server entry. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>{children}</TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

/** The route table (shared shape; server entry imports pages eagerly). */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/mission" element={<Mission />} />
      <Route path="/who-we-are" element={<WhoWeAre />} />
      <Route path="/products" element={<Products />} />
      <Route path="/docs" element={<Docs />} />
      {/* One watch page per video: Google only indexes a video that owns its URL. */}
      <Route path="/watch/:slug" element={<Watch />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      {/* Redirects from old routes */}
      <Route path="/services" element={<Navigate to="/" replace />} />
      <Route path="/about" element={<Navigate to="/who-we-are" replace />} />
      <Route path="/audit" element={<Navigate to="/contact" replace />} />
      <Route path="/process" element={<Navigate to="/who-we-are" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <Providers>
    <Preloader />
    <PageAtmosphere />
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <SmoothScroll />
      <ScrollProgress />
      <ScrollToTop />
      <Navbar />
      <Suspense fallback={<div className="min-h-screen" />}>
        <AppRoutes />
      </Suspense>
      <Footer />
    </BrowserRouter>
  </Providers>
);

export default App;
