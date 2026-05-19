import { useSearchParams } from "react-router-dom";
import CandlestickChart from "@/components/CandlestickChart";
import { useNavigate } from "react-router-dom";

export default function ChartPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const matchId = parseInt(searchParams.get("match") || "0");
  const type = searchParams.get("type") || "";
  const sel = searchParams.get("sel") || "";
  const name = searchParams.get("name") || "";

  if (!matchId || !type || !sel) return <div className="text-center py-20 text-white">Invalid market.</div>;

  return (
    <div className="min-h-screen bg-[#05050a] p-4">
      <CandlestickChart
        bsd_match_id={matchId}
        market_type={type}
        market_selection={sel}
        match_name={name}
        onClose={() => navigate("/markets")}
      />
    </div>
  );
}