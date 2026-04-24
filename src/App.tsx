import { Suspense, lazy, createContext, useContext, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import GlobalLoader from "@/components/GlobalLoader";
import SupportPortal from "@/components/SupportPortal"; // <-- new

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
const PrivacyPage      = lazy(() => import("@/pages/Privacy"));
const NewsPage         = lazy(() => import("@/pages/NewsPage"));
const AdminNewsPage    = lazy(() => import("@/pages/AdminNewsPage"));
const NotFound         = lazy(() => import("@/pages/NotFound"));

interface LoadingCtx {
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}
const LoadingContext = createContext<LoadingCtx>({ isLoading: false, setIsLoading: () => {} });
export const useLoading = () => useContext(LoadingContext);

const LazyFallback = () => <GlobalLoader />;
const queryClient = new QueryClient();

function App() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
          <BrowserRouter>
            <AnimatePresence>
              {isLoading && <GlobalLoader key="global-loader" />}
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
                <Route path="/pattern-analyser" element={<PatternPage />} />
                <Route path="/about"           element={<AboutPage />} />
                <Route path="/terms"           element={<TermsPage />} />
                <Route path="/privacy"         element={<PrivacyPage />} />
                <Route path="/news"            element={<NewsPage />} />
                <Route path="/admin/news"      element={<AdminNewsPage />} />
                <Route path="*"                element={<NotFound />} />
              </Routes>
            </Suspense>

            {/* Floating support portal – appears on every page */}
            <SupportPortal />
          </BrowserRouter>
        </LoadingContext.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;