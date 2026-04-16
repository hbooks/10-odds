import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import GamesPage from "./pages/GamesPage.tsx";
import TenOddsPage from "./pages/TenOddsPage.tsx";
import StatusPage from "./pages/StatusPage.tsx";
import PreviousPage from "./pages/PreviousPage.tsx";
import AnalyticsPage from "./pages/AnalyticsPage.tsx";
import AboutPage from "./pages/AboutPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/ten-odds" element={<TenOddsPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/previous" element={<PreviousPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
