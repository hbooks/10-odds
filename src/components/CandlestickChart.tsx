import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft } from "lucide-react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

// ─── Types ────────────────────────────────────────────────────────────────────
type Candle = { minute: number; open: number; high: number; low: number; close: number };

type MarketRow = {
  bsd_match_id: number;
  market_type: string;
  market_selection: string;
  match_name: string;
  status: "active" | "won" | "lost" | "void";
  confidence: number;
  candles: Candle[] | null;
  home_score?: number;
  away_score?: number;
  current_minute?: number;
};

type Props = {
  bsd_match_id: number;
  market_type: string;
  market_selection: string;
  match_name: string;
  onClose?: () => void;
};

// ─── Colours (TradingView-inspired) ─────────────────────────────────────────
const GREEN      = "#26a69a";  // teal-green bullish
const GREEN_FILL = "#26a69a";
const RED        = "#ef5350";  // red bearish
const RED_FILL   = "#ef5350";
const DOJI_COL   = "#94a3b8";
const GRID_COL   = "rgba(255,255,255,0.06)";
const AXIS_COL   = "rgba(255,255,255,0.45)";
const BG         = "#131722";  // TradingView dark bg
const BORDER_COL = "#1e222d";

// ─── Chart layout ─────────────────────────────────────────────────────────────
const CHART_W = 960;
const CHART_H = 440;
const M = { top: 12, right: 72, bottom: 36, left: 8 };
const PLOT_W = CHART_W - M.left - M.right;
const PLOT_H = CHART_H - M.top - M.bottom;

// ─── Skeleton ────────────────────────────────────────────────────────────────
function SkeletonChart() {
  return (
    <div
      style={{
        background: BG,
        borderRadius: 4,
        border: `1px solid ${BORDER_COL}`,
        padding: 16,
      }}
    >
      <div style={{ height: 440, background: "rgba(255,255,255,0.03)", borderRadius: 4 }} />
    </div>
  );
}

// ─── Crosshair + Tooltip state ───────────────────────────────────────────────
type CrosshairState = {
  x: number;      // svg coords
  y: number;
  candle: Candle | null;
};

// ─── Main SVG chart ───────────────────────────────────────────────────────────
function CandleChart({
  candles,
  currentMinute,
}: {
  candles: Candle[];
  currentMinute: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [crosshair, setCrosshair] = useState<CrosshairState | null>(null);

  if (candles.length === 0) return null;

  // Dynamic Y range – pad 8% above/below
  const allVals = candles.flatMap(c => [c.high, c.low]);
  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  const pad = (rawMax - rawMin) * 0.08 || 2;
  const yMin = Math.max(0, rawMin - pad);
  const yMax = Math.min(100, rawMax + pad);
  const yRange = yMax - yMin;

  // Dynamic X range – 0 to 90
  const xMin = 0;
  const xMax = 90;

  const sx = (minute: number) => M.left + ((minute - xMin) / (xMax - xMin)) * PLOT_W;
  const sy = (val: number) => M.top + PLOT_H - ((val - yMin) / yRange) * PLOT_H;

  // Candle width
  const totalMinutes = xMax - xMin;
  const slotW = PLOT_W / totalMinutes;
  const bodyW = Math.max(slotW * 0.6, 2);

  // Grid: ~6 horizontal lines, 7 vertical
  const yTickCount = 6;
  const yTickStep = yRange / yTickCount;
  const yTicks: number[] = [];
  for (let i = 0; i <= yTickCount; i++) {
    yTicks.push(parseFloat((yMin + i * yTickStep).toFixed(1)));
  }
  const xTicks = [0, 15, 30, 45, 60, 75, 90];

  // Current (last) candle
  const lastCandle = candles[candles.length - 1];
  const lastClose = lastCandle?.close ?? 0;
  const lastCloseY = sy(lastClose);
  const lastIsUp = lastCandle ? lastCandle.close >= lastCandle.open : true;
  const lastPriceColor = lastIsUp ? GREEN : RED;

  // Mouse → SVG coordinate conversion
  const getSvgCoords = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const scaleX2 = CHART_W / rect.width;
    const scaleY2 = CHART_H / rect.height;
    return {
      svgX: (e.clientX - rect.left) * scaleX2,
      svgY: (e.clientY - rect.top) * scaleY2,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const coords = getSvgCoords(e);
    if (!coords) return;
    const { svgX, svgY } = coords;

    // Only show crosshair inside plot area
    if (
      svgX < M.left || svgX > M.left + PLOT_W ||
      svgY < M.top || svgY > M.top + PLOT_H
    ) {
      setCrosshair(null);
      return;
    }

    // Find closest candle
    const minuteAtX = xMin + ((svgX - M.left) / PLOT_W) * (xMax - xMin);
    let closest: Candle | null = null;
    let minDist = Infinity;
    for (const c of candles) {
      const d = Math.abs(c.minute - minuteAtX);
      if (d < minDist) { minDist = d; closest = c; }
    }

    setCrosshair({ x: svgX, y: svgY, candle: closest });
  };

  const handleMouseLeave = () => setCrosshair(null);

  // Tooltip position: flip when near right edge
  const tooltipX = crosshair
    ? crosshair.x + 12 > M.left + PLOT_W - 140
      ? crosshair.x - 150
      : crosshair.x + 12
    : 0;
  const tooltipY = crosshair
    ? Math.max(M.top, Math.min(crosshair.y - 60, M.top + PLOT_H - 90))
    : 0;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full select-none"
      style={{ fontFamily: "'DM Mono','Courier New',monospace", cursor: "crosshair" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <defs>
        <clipPath id="plotClip">
          <rect x={M.left} y={M.top} width={PLOT_W} height={PLOT_H} />
        </clipPath>
        {/* Subtle area fill under last price line */}
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lastPriceColor} stopOpacity="0.06" />
          <stop offset="100%" stopColor={lastPriceColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ── Plot background ── */}
      <rect x={M.left} y={M.top} width={PLOT_W} height={PLOT_H} fill={BG} />

      {/* ── Horizontal grid lines ── */}
      {yTicks.map(v => (
        <line
          key={`hg-${v}`}
          x1={M.left} x2={M.left + PLOT_W}
          y1={sy(v)} y2={sy(v)}
          stroke={GRID_COL}
          strokeWidth={1}
        />
      ))}

      {/* ── Vertical grid lines ── */}
      {xTicks.map(m => (
        <line
          key={`vg-${m}`}
          x1={sx(m)} x2={sx(m)}
          y1={M.top} y2={M.top + PLOT_H}
          stroke={GRID_COL}
          strokeWidth={1}
        />
      ))}

      {/* ── Halftime marker ── */}
      <line
        x1={sx(45)} x2={sx(45)}
        y1={M.top} y2={M.top + PLOT_H}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth={1}
        strokeDasharray="3 3"
      />

      {/* ── Candles ── */}
      <g clipPath="url(#plotClip)">
        {candles.map((c) => {
          const cx   = sx(c.minute);
          const yH   = sy(c.high);
          const yL   = sy(c.low);
          const yO   = sy(c.open);
          const yC   = sy(c.close);
          const yTop = Math.min(yO, yC);
          const bH   = Math.max(Math.abs(yC - yO), 1.5);
          const isUp   = c.close >= c.open;
          const isHovered = crosshair?.candle?.minute === c.minute;

          const wickColor = isUp ? GREEN : RED;
          const bodyFill  = isUp ? GREEN_FILL : RED_FILL;

          return (
            <g key={c.minute} opacity={isHovered ? 1 : 0.88}>
              {/* Upper wick */}
              <line
                x1={cx} x2={cx}
                y1={yH} y2={yTop}
                stroke={wickColor}
                strokeWidth={1}
              />
              {/* Lower wick */}
              <line
                x1={cx} x2={cx}
                y1={yTop + bH} y2={yL}
                stroke={wickColor}
                strokeWidth={1}
              />
              {/* Body */}
              <rect
                x={cx - bodyW / 2}
                y={yTop}
                width={bodyW}
                height={bH}
                fill={bodyFill}
                stroke={isHovered ? "rgba(255,255,255,0.5)" : "none"}
                strokeWidth={isHovered ? 0.5 : 0}
              />
            </g>
          );
        })}
      </g>

      {/* ── Current price horizontal line ── */}
      {lastCandle && (
        <>
          <line
            x1={M.left}
            x2={M.left + PLOT_W}
            y1={lastCloseY}
            y2={lastCloseY}
            stroke={lastPriceColor}
            strokeWidth={0.8}
            strokeDasharray="3 3"
          />
          {/* Price label box on right axis */}
          <rect
            x={M.left + PLOT_W}
            y={lastCloseY - 9}
            width={M.right}
            height={18}
            fill={lastPriceColor}
            rx={2}
          />
          <text
            x={M.left + PLOT_W + M.right / 2}
            y={lastCloseY + 4.5}
            textAnchor="middle"
            fill="#fff"
            fontSize={10.5}
            fontWeight="600"
          >
            {lastClose.toFixed(1)}
          </text>
        </>
      )}

      {/* ── Right Y-axis labels ── */}
      {yTicks.map(v => {
        // Don't render if too close to current price label
        if (lastCandle && Math.abs(sy(v) - lastCloseY) < 14) return null;
        return (
          <text
            key={`yl-${v}`}
            x={M.left + PLOT_W + 6}
            y={sy(v) + 4}
            fill={AXIS_COL}
            fontSize={10}
            textAnchor="start"
          >
            {v.toFixed(1)}
          </text>
        );
      })}

      {/* ── X-axis labels ── */}
      {xTicks.map(m => (
        <text
          key={`xl-${m}`}
          x={sx(m)}
          y={M.top + PLOT_H + 22}
          textAnchor="middle"
          fill={AXIS_COL}
          fontSize={10}
        >
          {m === 45 ? "HT" : `${m}′`}
        </text>
      ))}

      {/* ── Crosshair ── */}
      {crosshair && (
        <>
          {/* Vertical line */}
          <line
            x1={crosshair.x} x2={crosshair.x}
            y1={M.top} y2={M.top + PLOT_H}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={0.8}
            strokeDasharray="3 3"
          />
          {/* Horizontal line */}
          <line
            x1={M.left} x2={M.left + PLOT_W}
            y1={crosshair.y} y2={crosshair.y}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={0.8}
            strokeDasharray="3 3"
          />
          {/* Crosshair Y label on right axis */}
          {(() => {
            const val = yMax - ((crosshair.y - M.top) / PLOT_H) * yRange;
            return (
              <>
                <rect
                  x={M.left + PLOT_W}
                  y={crosshair.y - 9}
                  width={M.right}
                  height={18}
                  fill="#363a45"
                  rx={2}
                />
                <text
                  x={M.left + PLOT_W + M.right / 2}
                  y={crosshair.y + 4.5}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={10}
                >
                  {val.toFixed(1)}
                </text>
              </>
            );
          })()}
          {/* Crosshair X label on bottom axis */}
          {(() => {
            const min = Math.round(xMin + ((crosshair.x - M.left) / PLOT_W) * (xMax - xMin));
            return (
              <>
                <rect
                  x={crosshair.x - 18}
                  y={M.top + PLOT_H + 4}
                  width={36}
                  height={16}
                  fill="#363a45"
                  rx={2}
                />
                <text
                  x={crosshair.x}
                  y={M.top + PLOT_H + 15}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={10}
                >
                  {min}′
                </text>
              </>
            );
          })()}

          {/* OHLC tooltip box */}
          {crosshair.candle && (
            <>
              <rect
                x={tooltipX}
                y={tooltipY}
                width={138}
                height={86}
                fill="#1e222d"
                stroke="#363a45"
                strokeWidth={1}
                rx={3}
              />
              {/* Colour indicator dot */}
              <circle
                cx={tooltipX + 10}
                cy={tooltipY + 13}
                r={4}
                fill={crosshair.candle.close >= crosshair.candle.open ? GREEN : RED}
              />
              <text x={tooltipX + 20} y={tooltipY + 17} fill="#d1d4dc" fontSize={10} fontWeight="600">
                {crosshair.candle.minute}′
              </text>
              {[
                ["O", crosshair.candle.open],
                ["H", crosshair.candle.high],
                ["L", crosshair.candle.low],
                ["C", crosshair.candle.close],
              ].map(([label, val], i) => {
                const isC = label === "C";
                const col = isC
                  ? crosshair.candle!.close >= crosshair.candle!.open ? GREEN : RED
                  : "#d1d4dc";
                return (
                  <g key={label as string}>
                    <text
                      x={tooltipX + 10}
                      y={tooltipY + 33 + i * 14}
                      fill="rgba(255,255,255,0.4)"
                      fontSize={9.5}
                    >
                      {label}
                    </text>
                    <text
                      x={tooltipX + 24}
                      y={tooltipY + 33 + i * 14}
                      fill={col}
                      fontSize={9.5}
                      fontWeight={isC ? "700" : "400"}
                    >
                      {(val as number).toFixed(2)}
                    </text>
                  </g>
                );
              })}
            </>
          )}
        </>
      )}

      {/* ── Live dot on last candle ── */}
      {lastCandle && (
        <>
          <circle cx={sx(lastCandle.minute)} cy={sy(lastCandle.close)} r={5} fill={lastPriceColor} opacity={0.25}>
            <animate attributeName="r" values="4;8;4" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.25;0;0.25" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={sx(lastCandle.minute)} cy={sy(lastCandle.close)} r={2.5} fill={lastPriceColor} />
        </>
      )}

      {/* ── Border ── */}
      <rect
        x={M.left} y={M.top}
        width={PLOT_W} height={PLOT_H}
        fill="none"
        stroke={BORDER_COL}
        strokeWidth={1}
      />
    </svg>
  );
}

// ─── Score badge ─────────────────────────────────────────────────────────────
function ScoreBadge({
  homeScore,
  awayScore,
  minute,
}: {
  homeScore?: number;
  awayScore?: number;
  minute?: number;
}) {
  if (homeScore === undefined || awayScore === undefined) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 20,
          fontWeight: 700,
          color: "#d1d4dc",
          letterSpacing: 2,
        }}
      >
        {homeScore}–{awayScore}
      </span>
      {minute !== undefined && minute > 0 && (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "rgba(38,166,154,0.12)",
            border: "1px solid rgba(38,166,154,0.3)",
            color: GREEN,
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 20,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: GREEN,
              animation: "pulse 1.5s infinite",
            }}
          />
          {minute}′
        </span>
      )}
    </div>
  );
}

// ─── Top bar: TradingView-style ticker header ─────────────────────────────────
function TickerBar({
  row,
  candles,
  market_type,
  market_selection,
  match_name,
  onClose,
}: {
  row: MarketRow | null;
  candles: Candle[];
  market_type: string;
  market_selection: string;
  match_name: string;
  onClose?: () => void;
}) {
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const close = last?.close ?? 0;
  const change = last && prev ? close - prev.close : 0;
  const changePct = prev && prev.close !== 0 ? (change / prev.close) * 100 : 0;
  const isUp = change >= 0;
  const changeColor = isUp ? GREEN : RED;

  const teamNames = (row?.match_name || match_name).split(" vs ");
  const homeTeam = teamNames[0] ?? "Home";
  const awayTeam = teamNames[1] ?? "Away";

  const ohlc = last
    ? [
        { label: "O", val: last.open },
        { label: "H", val: last.high },
        { label: "L", val: last.low },
        { label: "C", val: last.close },
      ]
    : [];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "6px 18px",
        padding: "10px 16px",
        borderBottom: `1px solid ${BORDER_COL}`,
        background: "#1a1e2c",
      }}
    >
      {onClose && (
        <button
          onClick={onClose}
          style={{
            width: 28,
            height: 28,
            borderRadius: 4,
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${BORDER_COL}`,
            color: "#aaa",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={14} />
        </button>
      )}

      {/* Symbol */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#d1d4dc",
            letterSpacing: 0.5,
            fontFamily: "'DM Mono', monospace",
          }}
        >
          {homeTeam} / {awayTeam}
        </span>
        <span
          style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: 1, marginTop: 1 }}
        >
          {market_type} · {market_selection} · 1′
        </span>
      </div>

      {/* Price + change */}
      {last && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: changeColor,
              fontFamily: "'DM Mono', monospace",
            }}
          >
            {close.toFixed(2)}
          </span>
          <span style={{ fontSize: 12, color: changeColor, fontWeight: 600 }}>
            {isUp ? "+" : ""}
            {change.toFixed(2)} ({isUp ? "+" : ""}
            {changePct.toFixed(2)}%)
          </span>
        </div>
      )}

      {/* OHLC chips */}
      {ohlc.map(({ label, val }) => (
        <span
          key={label}
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.45)",
            fontFamily: "'DM Mono', monospace",
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.25)", marginRight: 3 }}>{label}</span>
          {val.toFixed(2)}
        </span>
      ))}

      {/* Live score */}
      {row && (
        <div style={{ marginLeft: "auto" }}>
          <ScoreBadge
            homeScore={row.home_score}
            awayScore={row.away_score}
            minute={row.current_minute}
          />
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
function CandlestickChartInner({
  bsd_match_id,
  market_type,
  market_selection,
  match_name,
  onClose,
}: Props) {
  const [row, setRow] = useState<MarketRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("live_market_data")
        .select(
          "bsd_match_id, market_type, market_selection, match_name, status, confidence, candles, home_score, away_score, current_minute"
        )
        .eq("bsd_match_id", bsd_match_id)
        .eq("market_type", market_type)
        .eq("market_selection", market_selection)
        .maybeSingle();
      if (err) throw err;
      setRow(data as MarketRow | null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load market data");
    } finally {
      setLoading(false);
    }
  }, [bsd_match_id, market_type, market_selection]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const channelName = `chart:${bsd_match_id}:${market_type}:${market_selection}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_market_data",
          filter: `bsd_match_id=eq.${bsd_match_id}`,
        },
        (payload) => {
          const n = payload.new as MarketRow;
          if (n.market_type === market_type && n.market_selection === market_selection) {
            setRow((prev) => (prev ? { ...prev, ...n } : n));
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setTimeout(fetchData, 5000);
        }
      });
    return () => { supabase.removeChannel(channel).catch(() => {}); };
  }, [bsd_match_id, market_type, market_selection, fetchData]);

  const candles = useMemo<Candle[]>(() => {
    if (!row?.candles) return [];
    return (row.candles as Candle[])
      .filter((c) => c.minute >= 0 && c.minute <= 120)
      .sort((a, b) => a.minute - b.minute);
  }, [row]);

  const currentMinute = candles.length ? candles[candles.length - 1].minute : -1;
  const settled = row?.status === "won" || row?.status === "lost" || row?.status === "void";

  if (loading) return <SkeletonChart />;

  if (error) {
    return (
      <div
        style={{
          background: BG,
          border: `1px solid ${RED}44`,
          borderRadius: 4,
          padding: 24,
          textAlign: "center",
          color: RED,
        }}
      >
        <p style={{ marginBottom: 12 }}>{error}</p>
        <button
          onClick={fetchData}
          style={{
            padding: "6px 16px",
            background: `${RED}22`,
            border: `1px solid ${RED}44`,
            borderRadius: 4,
            color: RED,
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!row || candles.length === 0) {
    return (
      <div
        style={{
          background: BG,
          border: `1px solid ${BORDER_COL}`,
          borderRadius: 4,
          padding: 40,
          textAlign: "center",
          color: "rgba(255,255,255,0.3)",
          fontSize: 13,
        }}
      >
        Market data is being prepared. This usually takes under a minute.
        <br />
        <button
          onClick={fetchData}
          style={{
            marginTop: 12,
            padding: "6px 16px",
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${BORDER_COL}`,
            borderRadius: 4,
            color: "rgba(255,255,255,0.5)",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        background: BG,
        border: `1px solid ${BORDER_COL}`,
        borderRadius: 4,
        overflow: "hidden",
        position: "relative",
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
      }}
    >
      {/* ── TradingView-style ticker header ── */}
      <TickerBar
        row={row}
        candles={candles}
        market_type={market_type}
        market_selection={market_selection}
        match_name={match_name}
        onClose={onClose}
      />

      {/* ── Chart ── */}
      <div style={{ width: "100%", overflowX: "auto" }}>
        <div style={{ minWidth: 360 }}>
          <CandleChart candles={candles} currentMinute={currentMinute} />
        </div>
      </div>

      {/* ── Bottom status bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "6px 16px",
          borderTop: `1px solid ${BORDER_COL}`,
          background: "#1a1e2c",
          fontSize: 10,
          color: "rgba(255,255,255,0.3)",
          fontFamily: "'DM Mono', monospace",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            color: GREEN,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: GREEN,
              animation: "pulse 2s infinite",
            }}
          />
          LIVE
        </span>
        <span>Updates every ~3 min</span>
        <span style={{ marginLeft: "auto" }}>
          {candles.length} candles · min {candles[0]?.minute ?? 0}′–{currentMinute}′
        </span>
      </div>

      {/* ── Result overlay ── */}
      <AnimatePresence>
        {settled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(19,23,34,0.82)",
              backdropFilter: "blur(4px)",
              zIndex: 10,
            }}
          >
            <motion.div
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              style={{
                background: "#1e222d",
                border: `1px solid ${
                  row.status === "won" ? GREEN : row.status === "void" ? BORDER_COL : RED
                }`,
                borderRadius: 6,
                padding: "32px 48px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 44, marginBottom: 8 }}>
                {row.status === "won" ? "🏆" : row.status === "void" ? "↩️" : "❌"}
              </div>
              <p
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color:
                    row.status === "won" ? GREEN : row.status === "void" ? "#d1d4dc" : RED,
                  letterSpacing: 1,
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                MARKET {row.status === "won" ? "WON" : row.status === "void" ? "VOID" : "LOST"}
              </p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>
                Final: {row.confidence.toFixed(2)}
              </p>
              {onClose && (
                <button
                  onClick={onClose}
                  style={{
                    marginTop: 16,
                    padding: "8px 24px",
                    background: "rgba(255,255,255,0.07)",
                    border: `1px solid ${BORDER_COL}`,
                    borderRadius: 4,
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Back to Markets
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const CandlestickChart = memo(CandlestickChartInner);
export default CandlestickChart;