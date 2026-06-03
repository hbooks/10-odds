import { Suspense, lazy, createContext, useContext, useState, useRef } from "react";
import { BrowserRouter, Routes, Route, useSearchParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import GlobalLoader from "@/components/GlobalLoader";
import SupportPortal from "@/components/SupportPortal";
import AdminCommunity from "@/pages/AdminCommunity";
import { PageTracker } from "@/hooks/usePageTracking";
import CustomerCare from "@/components/CustomerCare";
import ChartPage from "./pages/ChartPage";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import MaintenancePage from "@/pages/Maintenance";
import { useDevToolsProtection } from "@/hooks/Usedevtoolsprotection";



const IndexPage          = lazy(() => import("@/pages/Index"));
const GamesPage          = lazy(() => import("@/pages/GamesPage"));
const TenOddsPage        = lazy(() => import("@/pages/TenOddsPage"));
const StatusPage         = lazy(() => import("@/pages/StatusPage"));
const PreviousPage       = lazy(() => import("@/pages/PreviousPage"));
const AnalyticsPage      = lazy(() => import("@/pages/AnalyticsPage"));
const ScoreboardPage     = lazy(() => import("@/pages/ScoreboardPage"));
const PatternPage        = lazy(() => import("@/pages/Patternanalyserpage"));
const AboutPage          = lazy(() => import("@/pages/AboutPage"));
const TermsPage          = lazy(() => import("@/pages/Terms"));
const CommunityTermsPage = lazy(() => import("@/pages/CommunityTermsPage"));
const PrivacyPage        = lazy(() => import("@/pages/Privacy"));
const NewsPage           = lazy(() => import("@/pages/NewsPage"));
const CommunityPage      = lazy(() => import("@/pages/CommunityPage"));
const GuidePage          = lazy(() => import("@/pages/GuidePage"));
const NotFound           = lazy(() => import("@/pages/NotFound"));
const AdminAnalyticsPage = lazy(() => import("@/pages/AdminAnalytics"));
const LiveMarketsPage    = lazy(() => import("@/pages/LiveMarkets"));
const MarketsPage        = lazy(() => import("@/pages/Markets"));
const ClosedMarketsPage  = lazy(() => import("@/pages/ClosedMarkets"));

// ── Loading context ──────────────────────────────────────────────────────────
interface LoadingCtx {
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}
const LoadingContext = createContext<LoadingCtx>({ isLoading: false, setIsLoading: () => {} });
export const useLoading = () => useContext(LoadingContext);

const LazyFallback = () => <GlobalLoader />;
const queryClient  = new QueryClient();

const BOOT_LOADER_MS = 4500;

// ══════════════════════════════════════════════════════════════════════════════
//  MaintenanceGuard
// ══════════════════════════════════════════════════════════════════════════════
function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const { isMaintenance, isChecking } = useMaintenanceMode();
  const [searchParams] = useSearchParams();
  const bypassMaintenance =
    searchParams.get("key") === import.meta.env.VITE_ADMIN_SECRET;

  if (isChecking) return <>{children}</>;

  if (isMaintenance && !bypassMaintenance) {
    return (
      <AnimatePresence mode="wait">
        <MaintenancePage key="maintenance" />
      </AnimatePresence>
    );
  }

  return <>{children}</>;
}

// ══════════════════════════════════════════════════════════════════════════════
//  App
// ══════════════════════════════════════════════════════════════════════════════
function App() {
  // ✅ Must be the very first hook — runs on mount, redirects to /blank.html
  //    if DevTools is open. Admin sessions (?key=VITE_ADMIN_SECRET) bypass it.
  useDevToolsProtection();

  const [isLoading, setIsLoading]     = useState(false);
  const [bootComplete, setBootComplete] = useState(false);
  const loaderStartRef                = useRef<number>(0);

  const delayedSetIsLoading = (v: boolean) => {
    if (v) {
      loaderStartRef.current = Date.now();
      setIsLoading(true);
    } else {
      const elapsed   = Date.now() - loaderStartRef.current;
      const remaining = Math.max(0, BOOT_LOADER_MS - elapsed);
      if (remaining > 0) {
        setTimeout(() => setIsLoading(false), remaining);
      } else {
        setIsLoading(false);
      }
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <LoadingContext.Provider value={{ isLoading, setIsLoading: delayedSetIsLoading }}>
          <BrowserRouter>
            {/* ✅ No <DevToolsBlocker /> — hook handles everything via redirect */}

            <PageTracker />

            {!bootComplete && (
              <GlobalLoader
                key="boot-loader"
                minLoadTime={BOOT_LOADER_MS}
                onReady={() => setBootComplete(true)}
              />
            )}

            <AnimatePresence>
              {bootComplete && isLoading && <GlobalLoader key="transition-loader" />}
            </AnimatePresence>

            <MaintenanceGuard>
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
                  <Route path="/live-markets"    element={<LiveMarketsPage />} />
                  <Route path="/markets"         element={<MarketsPage />} />
                  <Route path="/closed"          element={<ClosedMarketsPage />} />
                  <Route path="/chart"           element={<ChartPage />} />
                  <Route path="/admin/news"      element={<AdminCommunity />} />
                  <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
                  <Route path="*"               element={<NotFound />} />
                </Routes>
              </Suspense>
            </MaintenanceGuard>

            <CustomerCare />
            <SupportPortal />
          </BrowserRouter>
        </LoadingContext.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;