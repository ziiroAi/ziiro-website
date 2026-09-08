import { Toaster } from "@/shared/ui/toaster";
import { Toaster as Sonner } from "@/shared/ui/sonner";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { lazy, Suspense, useEffect } from "react";
import Navbar from "@/shared/components/Navbar";
import Footer from "@/shared/components/Footer";
import Preloader from "@/shared/components/Preloader";
import PageAtmosphere from "@/shared/components/PageAtmosphere";
import SmoothScroll, { scrollTo } from "@/shared/motion/SmoothScroll";
import ScrollProgress from "@/shared/motion/ScrollProgress";
import Index from "@/pages/Index";

// Secondary routes are code-split so they don't ship in the homepage's
// critical bundle. Each loads on demand when its route is visited.
const Contact = lazy(() => import("@/pages/Contact"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const Audit = lazy(() => import("@/pages/Audit"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Mission = lazy(() => import("@/pages/Mission"));
const WhoWeAre = lazy(() => import("@/pages/WhoWeAre"));
const Products = lazy(() => import("@/pages/Products"));
const Process = lazy(() => import("@/pages/Process"));
const Watch = lazy(() => import("@/pages/Watch"));
const NotFound = lazy(() => import("@/pages/NotFound"));

/**
 * Every page opens from the top, with no inherited scroll positions.
 *
 * This goes through `scrollTo` rather than `window.scrollTo` because Lenis is
 * driving the scroller: a raw `window.scrollTo` sets the document position
 * while Lenis still believes it is somewhere else, and the next frame it eases
 * the page back to where it thought it was. `immediate` jumps without easing,
 * which is what a route change wants.
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    scrollTo(0, { immediate: true });
  }, [pathname]);
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
      <Route path="/audit" element={<Audit />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/mission" element={<Mission />} />
      <Route path="/who-we-are" element={<WhoWeAre />} />
      <Route path="/products" element={<Products />} />
      <Route path="/process" element={<Process />} />
      {/* One watch page per video: Google only indexes a video that owns its URL. */}
      <Route path="/watch/:slug" element={<Watch />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      {/* Redirects from old routes */}
      <Route path="/services" element={<Navigate to="/" replace />} />
      <Route path="/about" element={<Navigate to="/who-we-are" replace />} />
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
