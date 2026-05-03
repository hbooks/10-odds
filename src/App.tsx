import { Suspense, lazy, createContext, useContext, useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import GlobalLoader from "@/components/GlobalLoader";
import SupportPortal from "@/components/SupportPortal";
import AdminCommunity from "@/pages/AdminCommunity";
import { PageTracker } from "@/hooks/usePageTracking";

const IndexPage        = lazy(() => import("@/pages/Index"));
const GamesPage        = lazy(() => import("@/pages/GamesPage"));
const TenOddsPage      = lazy(() => import("@/pages/TenOddsPage"));
const StatusPage       = lazy(() => import("@/pages/StatusPage"));
const PreviousPage     = lazy(() => import("@/pages/PreviousPage"));
const AnalyticsPage    = lazy(() => import("@/pages/AnalyticsPage"));
const ScoreboardPage   = lazy(() => import("@/pages/ScoreboardPage"));
const PatternPage      = lazy(() => import("@/pages/Patternanalyserpage"));
const AboutPage        = lazy(() => import("@/pages/AboutPage"));
const TermsPage        = lazy(() => import("@/pages/Terms"));
const CommunityTermsPage = lazy(() => import("@/pages/CommunityTermsPage"));
const PrivacyPage      = lazy(() => import("@/pages/Privacy"));
const NewsPage         = lazy(() => import("@/pages/NewsPage"));
const CommunityPage    = lazy(() => import("@/pages/CommunityPage"));
const GuidePage        = lazy(() => import("@/pages/GuidePage"));
const NotFound         = lazy(() => import("@/pages/NotFound"));
const AdminAnalyticsPage = lazy(() => import("@/pages/AdminAnalytics"));

interface LoadingCtx {
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}
const LoadingContext = createContext<LoadingCtx>({ isLoading: false, setIsLoading: () => {} });
export const useLoading = () => useContext(LoadingContext);

const LazyFallback = () => <GlobalLoader />;
const queryClient = new QueryClient();

// ── Minimum display time for the boot loader (ms) ────────────────────────────
const BOOT_LOADER_MS = 4500; 

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const loaderStartRef = useRef<number>(0);

  // ── Delayed hide function for manual loading states ────────────────────────
  const delayedSetIsLoading = (v: boolean) => {
    if (v) {
      loaderStartRef.current = Date.now();
      setIsLoading(true);
    } else {
      const elapsed = Date.now() - loaderStartRef.current;
      const remaining = Math.max(0, BOOT_LOADER_MS - elapsed);
      if (remaining > 0) {
        setTimeout(() => setIsLoading(false), remaining);
      } else {
        setIsLoading(false);
      }
    }
  };

  // ── One‑time boot loader ───────────────────────────────────────────────────
  const [showBootLoader, setShowBootLoader] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowBootLoader(false);
    }, BOOT_LOADER_MS);

    return () => clearTimeout(timer);
  }, []); // runs only once when the app mounts

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <LoadingContext.Provider value={{ isLoading, setIsLoading: delayedSetIsLoading }}>
          <BrowserRouter>
             <PageTracker />
            <AnimatePresence>
              {showBootLoader && <GlobalLoader key="boot-loader" />}
              {!showBootLoader && isLoading && <GlobalLoader key="global-loader" />}
            </AnimatePresence>

            <Suspense fallback={<LazyFallback />}>
              <Routes>
                <Route path="/"                element={<IndexPage />} />
                <Route path="/games"           element={<GamesPage />} />
                <Route path="/ten-odds"        element={<TenOddsPage />} />
                <Route path="/status"          element={<StatusPage />} />
                <Route path="/previous"        element={<PreviousPage />} />
                <Route path="/analytics"       element={<AnalyticsPage />} />
                <Route path="/scoreboard"      element={<ScoreboardPage />} />
                <Route path="/patterns"        element={<PatternPage />} />
                <Route path="/about"           element={<AboutPage />} />
                <Route path="/terms"           element={<TermsPage />} />
                <Route path="/community-terms" element={<CommunityTermsPage />} />    
                <Route path="/privacy"         element={<PrivacyPage />} />
                <Route path="/guide"           element={<GuidePage />} /> 
                <Route path="/community"       element={<CommunityPage />} />
                <Route path="/news"            element={<NewsPage />} />
                <Route path="/admin/news"      element={<AdminCommunity />} />
                <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
                <Route path="*"               element={<NotFound />} />
              </Routes>
            </Suspense>

            <SupportPortal />
          </BrowserRouter>
        </LoadingContext.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;