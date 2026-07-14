import { Toaster } from "@/shared/ui/toaster";
import { Toaster as Sonner } from "@/shared/ui/sonner";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { lazy, Suspense, useEffect } from "react";
import Navbar from "@/shared/components/Navbar";
import Footer from "@/shared/components/Footer";
import Index from "@/pages/Index";
import Contact from "@/pages/Contact";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import Audit from "@/pages/Audit";
import Pricing from "@/pages/Pricing";
import Mission from "@/pages/Mission";
import Products from "@/pages/Products";
import Process from "@/pages/Process";
import NotFound from "@/pages/NotFound";

const CinematicParticles = lazy(() => import("@/ogl/CinematicParticles"));

function ParticleBackground() {
  const location = useLocation();
  if (location.pathname !== "/") return null;
  return (
    <Suspense fallback={null}>
      <CinematicParticles />
    </Suspense>
  );
}

// Every page opens from the top — no inherited scroll positions
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <ParticleBackground />
          <Navbar />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/audit" element={<Audit />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/mission" element={<Mission />} />
            <Route path="/products" element={<Products />} />
            <Route path="/process" element={<Process />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            {/* Redirects from old routes */}
            <Route path="/services" element={<Navigate to="/" replace />} />
            <Route path="/about" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Footer />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
