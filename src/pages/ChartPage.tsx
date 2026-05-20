import { useSearchParams, useNavigate, Link } from "react-router-dom";
import CandlestickChart from "@/components/CandlestickChart";
import { TrendingUp, CheckCircle } from "lucide-react";

export default function ChartPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const matchId = parseInt(searchParams.get("match") || "0");
  const type = decodeURIComponent(searchParams.get("type") || "");
  const sel = decodeURIComponent(searchParams.get("sel") || "");
  const name = decodeURIComponent(searchParams.get("name") || "");

  if (!matchId || !type || !sel) {
    return (
      <div
        className="min-h-screen bg-[#05050a] flex items-center justify-center text-center px-4"
        style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif" }}
      >
        <div>
          <p className="text-white/50 mb-4">Invalid or missing market parameters.</p>
          <button
            onClick={() => navigate("/markets")}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-black"
            style={{ background: "linear-gradient(135deg, #D4AF37, #b8972a)" }}
          >
            Back to Markets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#05050a] text-white"
      style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif" }}
    >
      {/* ── Navbar ── */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3 backdrop-blur-md"
        style={{
          background: "rgba(5,5,10,0.85)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-2">
          <Link
            to="/markets"
            className="flex items-center gap-1.5 text-sm font-bold"
            style={{ color: "#D4AF37" }}
          >
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Live Markets</span>
          </Link>
          <span className="text-white/20 text-sm hidden sm:inline">›</span>
          <span className="text-white/50 text-sm hidden sm:inline truncate max-w-[200px]">
            {name || "Chart"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/closed"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/50 hover:text-white hover:bg-white/5 transition"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Closed</span>
          </Link>
        </div>
      </header>

      {/* ── Chart ── */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-5">
        <CandlestickChart
          bsd_match_id={matchId}
          market_type={type}
          market_selection={sel}
          match_name={name}
          onClose={() => navigate("/markets")}
        />
      </div>
    </div>
  );
}