import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { Download, Calendar, Trophy, Loader } from "lucide-react";
import { toPng } from "html-to-image";
import Layout from "@/components/Layout";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

interface Team {
  id: number;
  name: string;
  tla: string | null;
  crest_url: string | null;
}

interface Match {
  id: number;
  utc_date: string;
  home_team: Team;
  away_team: Team;
  competition: { name: string; code: string };
}

const AdvertPage = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchBigTeamMatches = async () => {
      try {
        // get today and tomorrow in UTC range
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 2); // inclusive of day after tomorrow
        const endStr = tomorrow.toISOString().split("T")[0];

        // first get big team ids
        const { data: bigTeams } = await supabase
          .from("teams")
          .select("id")
          .eq("is_big_team", true);

        if (!bigTeams?.length) {
          setMatches([]);
          return;
        }

        const bigIds = bigTeams.map((t) => t.id);

        // get matches where both teams are in bigIds
        const { data: matchData, error: matchErr } = await supabase
          .from("matches")
          .select(`
            id,
            utc_date,
            home_team:teams!matches_home_team_id_fkey ( id, name, tla, crest_url ),
            away_team:teams!matches_away_team_id_fkey ( id, name, tla, crest_url ),
            competition:competitions ( name, code )
          `)
          .gte("utc_date", `${todayStr}T00:00:00Z`)
          .lte("utc_date", `${endStr}T23:59:59Z`)
          .in("home_team_id", bigIds)
          .in("away_team_id", bigIds)
          .order("utc_date", { ascending: true });

        if (matchErr) throw matchErr;
        setMatches((matchData as unknown as Match[]) ?? []);
      } catch (e) {
        setError("Failed to load big team fixtures.");
      } finally {
        setLoading(false);
      }
    };

    fetchBigTeamMatches();
  }, []);

  const handleDownload = async () => {
    if (cardRef.current) {
      try {
        const dataUrl = await toPng(cardRef.current, {
          quality: 0.95,
          cacheBust: true,
        });
        const link = document.createElement("a");
        link.download = "10odds_blockbuster.png";
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error("Download failed", err);
      }
    }
  };

  const formatDate = (utc: string) =>
    new Date(utc).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-heading font-bold">Blockbuster Advert</h1>
            <p className="text-muted-foreground text-sm">
              Download a branded image of upcoming big‑team clashes
            </p>
          </div>
          {matches.length > 0 && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 gradient-gold text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold shadow-lg"
            >
              <Download className="h-4 w-4" />
              Download Image
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-muted-foreground">{error}</div>
        ) : matches.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            No blockbuster fixtures found for today or tomorrow.
          </div>
        ) : (
          /* The actual ad card – this is what gets downloaded */
          <div
            ref={cardRef}
            className="relative w-full max-w-2xl mx-auto rounded-3xl overflow-hidden shadow-2xl"
            style={{
              background: `linear-gradient(135deg, #0a1f2f 0%, #152b3c 40%, #1a3a50 100%)`,
              backgroundSize: "cover",
            }}
          >
            {/* Subtle pitch texture overlay */}
            <div className="absolute inset-0 bg-[url('/assets/pitch-bg.png')] opacity-10" />

            {/* Header */}
            <div className="relative z-10 px-8 py-6 flex items-center justify-between border-b border-white/10">
              <img
                src="/assets/logo.png"
                alt="10 Odds"
                className="h-10 w-10 object-contain"
              />
              <div className="text-right">
                <p className="text-white/70 text-xs uppercase tracking-widest font-mono">
                  10 <span className="text-gold">Odds</span>
                </p>
                <p className="text-white/40 text-[10px] font-mono">Blockbuster Fixtures</p>
              </div>
            </div>

            {/* Matches list */}
            <div className="relative z-10 px-8 py-6 space-y-5">
              {matches.map((match) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {match.home_team.crest_url && (
                      <img
                        src={match.home_team.crest_url}
                        alt=""
                        className="h-8 w-8 object-contain drop-shadow"
                      />
                    )}
                    <span className="text-white font-semibold text-sm truncate">
                      {match.home_team.tla || match.home_team.name}
                    </span>
                  </div>
                  <div className="text-xs text-white/40 font-mono">VS</div>
                  <div className="flex items-center gap-3 flex-1 min-w-0 justify-end text-right">
                    <span className="text-white font-semibold text-sm truncate">
                      {match.away_team.tla || match.away_team.name}
                    </span>
                    {match.away_team.crest_url && (
                      <img
                        src={match.away_team.crest_url}
                        alt=""
                        className="h-8 w-8 object-contain drop-shadow"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="relative z-10 px-8 py-4 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/50 text-xs">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(matches[0]?.utc_date)} – {formatDate(matches[matches.length-1]?.utc_date)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Trophy className="h-3 w-3 text-gold" />
                <span className="text-gold text-xs font-semibold">10 Odds</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdvertPage;