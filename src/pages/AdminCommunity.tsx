import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import {
  Send,
  Pencil,
  Trash2,
  CheckCircle,
  X,
  RefreshCw,
  ShieldCheck,
  MessageSquarePlus,
  Users,
  Clock,
  Check,
  Ban,
  Newspaper,
  Wrench,
  ImageUp,
  Shuffle,
  Upload,
} from "lucide-react";

// ──────────────────────────────────────────────────────────────────────────────
// Supabase client – uses service_role key for admin operations (update/delete)
// Falls back to anon key if the service key is not set in .env
// ──────────────────────────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  (import.meta.env.VITE_SUPABASE_SERVICE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string,
);

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET as string;
// Telegram edge function URL (must be set in env)
const NOTIFY_TELEGRAM_URL = import.meta.env.VITE_NOTIFY_TELEGRAM_URL || "";
const NOTIFY_SECRET = import.meta.env.VITE_NOTIFY_SECRET || "";

// ─── Types ────────────────────────────────────────────────────────────────────
interface NewsMessage {
  id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

interface CommunityMember {
  id: number;
  real_name: string;
  username: string;
  avatar: string;
  is_supporter: boolean;
  terms_agreed: boolean;
  status: "pending" | "approved" | "rejected" | "banned";
  created_at: string;
}

type Tab = "news" | "community" | "betSlip" | "settings";
type CommunityFilter = "pending" | "approved" | "rejected" | "banned";

// ─── Random bet slip captions (120+ engaging, short, with emojis) ────────────
const BET_CAPTIONS = [
  "💰 Lock of the day! Let's eat.", "🎯 Another one for the collection.", "🏆 Bet slip loaded — let's ride.",
  "📈 Printer go brrrrrr.", "🔥 Green screen incoming.", "🚀 To the moon with this slip.",
  "💎 Hands on this parlay.", "🧠 Big brain energy.", "⚡ Lightning strike? We'll see.",
  "🍀 Lucky charm activated.", "🔒 Safe bet? Nothing is safe. We ride.", "🐺 Lone wolf pick.",
  "🎲 Dice roll – but the odds are ours.", "📊 Data says yes. Heart says yes.", "💸 Free money? Almost.",
  "🕯️ Manifesting the win.", "🐉 Dragon slip – high risk, high reward.", "🃏 Wildcard parlay.",
  "🛡️ Shield up – defensive play.", "🗡️ Go for the throat.", "🏅 Medal worthy prediction.",
  "🎰 Slot machine style. Pray.", "📉 Buy low, sell high? Not here.", "📈 This slip prints.",
  "🧧 Good luck charm included.", "🍀 Four leaf clover slip.", "⭐ Five star lock.",
  "🔮 Crystal ball says…", "🎯 Bullseye pick.", "🧨 Explosive payout potential.",
  "💣 Bomb of the day.", "⚔️ Battle tested slip.", "🏰 Fortress defence.", "🦅 Eagle eye pick.",
  "🐅 Tiger blood.", "🐘 Elephant in the room? We bet on it.", "🦁 Lionheart parlay.",
  "🐺 Wolf pack slip.", "🐍 Snake bite – underdog special.", "🐎 Dark horse ride.",
  "🦄 Unicorn slip (rare, but why not).", "🐧 Cold blooded value.", "🐨 No stress, just value.",
  "🐢 Slow and steady cash.", "🐇 Quick money? Maybe.", "🦊 Fox clever pick.",
  "🐻 Bear market? We fade.", "🐂 Bull run slip.", "🦏 Rhino charge.", "🐘 Heavyweight parlay.",
  "🦍 Gorilla grip lock.", "🐒 Monkey pick (random but fun).", "🐔 Chicken dinner slip.",
  "🐣 Baby steps to profit.", "🦜 Parrot says win.", "🐙 Octopus tentacle pick.",
  "🦞 Lobster – red hot.", "🦀 Crab walk to profit.", "🐚 Seashell selection.",
  "🌊 Wave of green.", "⛰️ Mountain mover.", "🏔️ Peak confidence.", "🌋 Eruption of wins.",
  "🌈 Rainbow after rain.", "☀️ Sunny slip.", "🌙 Moonshot parlay.", "🌟 Star pick.",
  "💫 Shooting star luck.", "✨ Magic dust sprinkled.", "🎆 Fireworks slip.",
  "🎇 Sparkler bet.", "🧨 Cracker jack.", "🎉 Celebration incoming.", "🎊 Confetti mode.",
  "🎈 Balloon pop profit.", "🎁 Gift wrapped win.", "📦 Box of chocolates (you never know).",
  "🔧 Tool of destruction.", "⚙️ Gears grinding.", "🔩 Bolt of confidence.", "🔗 Chain reaction.",
  "⛓️ Unbreakable slip.", "🧲 Magnetic pick.", "🔭 Telescope view – clear value.",
  "🔬 Micro analysis done.", "⚗️ Potion brewing.", "🧪 Experiment slip.", "🧫 Petri dish pick.",
  "🩺 Doctor’s orders.", "💊 Pill of profit.", "💉 Injection of value.", "🩹 Band‑aid bet.",
  "🚑 Ambulance to the bank.", "🏥 Hospital visit – for the bookies.",
  "🚒 Firefighter slip (putting out fires).", "🚓 Police line – don't cross.", "🚔 Cop lock.",
  "🚕 Taxi to payout.", "🚗 Drive to glory.", "🚀 Rocket slip.", "🛸 Alien value.",
  "🚁 Helicopter view.", "✈️ Fly high slip.", "🛩️ Quick takeoff.", "⛵ Sail smooth.",
  "🚢 Ship of fortune.", "🛥️ Yacht money.", "🚤 Speedboat slip.", "🛶 Paddle your own canoe.",
  "🚲 Bike lane to profit.", "🏍️ Motorcycle madness.", "🚂 Train of thought.", "🚆 Express payout.",
  "🚇 Subway slip (underground value).", "🚉 All aboard.", "🚀 To the stars.", "🛰️ Satellite lock.",
  "🛸 Out of this world.", "🌍 Earth shattering pick.", "🌎 Global domination.",
  "🌏 One world, one bet.", "🔮 Prophecy slip.", "📜 Scroll of fortune.", "📖 Chapter of wins.",
  "📚 Book of value.", "📓 Notebook pick.", "📔 Journal of profit.", "📕 Closed book? No.",
  "📗 Green book.", "📘 Blueprint slip.", "📙 Orange crush.", "📒 Ledger of locks.",
  "📰 Headline pick.", "🏷️ Tagged for profit.", "🔖 Bookmark this slip.", "📎 Paperclip value.",
  "📏 Measure twice, bet once.", "📐 Right angle lock.", "✂️ Cut through the noise.",
  "🔫 Water gun? More like money gun.", "🔪 Sharp pick.", "⚔️ Sword of truth.",
  "🛡️ Shield of confidence.", "🏹 Arrow of fortune.", "🔨 Hammer lock.", "⛏️ Pickaxe profit.",
  "🔧 Wrench of value.", "🔩 Screwdriver slip.", "⚙️ Cog in the machine.", "🔗 Chain lock.",
  "🧰 Toolbox slip.", "🪚 Saw through the odds.", "🪛 Hex key pick.", "🧲 Magnetic attraction.",
  "⚡ Thunder strike.", "🌩️ Lightning bolt.", "☁️ Cloud nine slip.", "💨 Wind of change.",
  "🌪️ Tornado profit.", "🌀 Whirlwind pick.", "🌊 Tidal wave of wins.", "❄️ Snowball effect.",
  "☃️ Frozen lock.", "⛄ Melt the bookies.", "🔥 Heat check.", "💧 Drop of value.",
  "💦 Splash profit.", "💨 Breath of fresh air.", "🍃 Leaf of luck.", "🌿 Herb of profit.",
  "🍀 Shamrock slip.", "🌻 Sunflower money.", "🌷 Tulip value.", "🌹 Rose lock.",
  "🌸 Cherry blossom pick.", "🌼 Daisy chain parlay.", "🌺 Hibiscus heat.",
  "🌾 Harvest time.", "🍂 Autumn slip.", "🍁 Maple leaf lock.", "🍄 Mushroom profit.",
  "🌰 Chestnut value.", "🍎 Apple of my eye.", "🍐 Pear shaped? No, perfect.",
  "🍊 Orange you glad you bet?", "🍋 Lemonade from lemons.", "🍌 Banana slip.",
  "🍉 Watermelon win.", "🍇 Grape value.", "🍓 Strawberry lock.", "🫐 Blueberry pick.",
  "🍒 Cherry on top.", "🥝 Kiwi slip.", "🍅 Tomato toss.", "🥑 Avocado toast profit.",
  "🍆 Eggplant emoji? Sure.", "🥔 Potato value.", "🥕 Carrot of cash.", "🌽 Corn of confidence.",
  "🌶️ Hot pepper pick.", "🫑 Pepper lock.", "🥒 Cucumber cool slip.", "🥬 Lettuce leaf profit.",
  "🥦 Broccoli bounty.", "🧄 Garlic guard.", "🧅 Onion layers of value.", "🍄 Truffle treasure.",
  "🥜 Peanut butter profit.", "🌰 Chestnut lock.", "🍞 Breadwinner slip.", "🥐 Croissant cash.",
  "🥖 Baguette value.", "🥨 Pretzel pick.", "🥞 Pancake stack profit.", "🧇 Waffle win.",
  "🍔 Burger and fries slip.", "🍟 Fry day lock.", "🍕 Pizza slice value.", "🌭 Hot dog heat.",
  "🥪 Sandwich profit.", "🌮 Taco Tuesday slip.", "🥙 Wrap it up.", "🥗 Salad of success.",
  "🍲 Soup of the day.", "🍜 Noodle value.", "🍝 Pasta pick.", "🍛 Curry profit.",
  "🍚 Rice lock.", "🍣 Sushi slip.", "🍤 Shrimp value.", "🍥 Fish cake profit.",
  "🥟 Dumpling lock.", "🥠 Fortune cookie slip.", "🥡 Takeout value.", "🍦 Ice cream win.",
  "🍧 Shaved ice lock.", "🍨 Sundae slip.", "🍩 Donut value.", "🍪 Cookie profit.",
  "🎂 Birthday cake lock.", "🍰 Slice of success.", "🧁 Cupcake pick.", "🥧 Pie in the sky? No, profit.",
  "🍫 Chocolate bar slip.", "🍬 Candy lock.", "🍭 Lollipop value.", "🍮 Pudding profit.",
  "🍯 Honey pot slip.", "☕ Coffee lock.", "🍵 Tea time value.", "🥤 Soda profit.",
  "🧃 Juice slip.", "🥛 Milk lock.", "🍼 Baby bottle value.", "🥂 Cheers to profit.",
  "🍻 Beer money slip.", "🥃 Whiskey value.", "🍷 Wine lock.", "🍸 Martini profit.",
  "🍹 Cocktail slip.", "🍾 Champagne lock.", "🧉 Mate value.", "🧋 Boba profit.",
  "🍽️ Fork and knife slip.", "🥄 Spoon value.", "🔪 Knife lock.", "🍴 Cutlery profit.",
  "🏆 Trophy slip.", "🥇 Gold medal lock.", "🥈 Silver value.", "🥉 Bronze profit.",
  "🏅 Medal slip.", "🎖️ Military lock.", "🏆 Champions pick.", "🎫 Ticket to cash.",
  "🎟️ Entry slip.", "🎯 Dart board value.", "🎳 Bowling strike lock.", "⚽ Football profit.",
  "🏀 Basketball slip.", "🏈 Football (American) value.", "⚾ Baseball lock.",
  "🥎 Softball profit.", "🎾 Tennis slip.", "🏐 Volleyball value.", "🏉 Rugby lock.",
  "🎱 Pool profit.", "🏸 Badminton slip.", "🏒 Hockey lock.", "🥍 Lacrosse value.",
  "🏑 Field hockey profit.", "⛳ Golf slip.", "🏹 Archery lock.", "🤺 Fencing value.",
  "🥊 Boxing profit.", "🥋 Martial arts slip.", "⛸️ Skating lock.", "🥌 Curling value.",
  "🏂 Snowboard profit.", "⛷️ Ski slip.", "🏋️ Weightlifting lock.", "🤸 Gymnastics value.",
  "🏊 Swimming profit.", "🚣 Rowing slip.", "🏄 Surfing lock.", "🧗 Climbing value.",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const STATUS_STYLES: Record<CommunityMember["status"], string> = {
  pending:  "bg-amber-500/15 text-amber-400 border-amber-500/25",
  approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  rejected: "bg-red-500/15 text-red-400 border-red-500/25",
  banned:   "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const AdminCommunity = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ── Auth gate – requires ?key=ADMIN_SECRET ────────────────────────────────
  useEffect(() => {
    const key = searchParams.get("key");
    if (!ADMIN_SECRET || key !== ADMIN_SECRET) {
      navigate("/", { replace: true });
    }
  }, [navigate, searchParams]);

  // ── Tab state ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>("news");

  // ── Toast ───────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Maintenance mode state ──────────────────────────────────────────────
  const [maintenanceOn, setMaintenanceOn] = useState(false);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);

  // Fetch current maintenance state on mount
  useEffect(() => {
    supabase
      .from("site_settings")
      .select("maintenance_mode")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data) setMaintenanceOn(data.maintenance_mode);
      });
  }, []);

  const handleToggleMaintenance = async () => {
    setTogglingMaintenance(true);
    const next = !maintenanceOn;
    const { error } = await supabase
      .from("site_settings")
      .upsert({ id: 1, maintenance_mode: next }, { onConflict: "id" })
      .select("maintenance_mode")
      .single();

    if (!error) {
      setMaintenanceOn(next);
      showToast("ok", next ? "Maintenance mode enabled. Site locked." : "Maintenance mode disabled. Site open.");
    } else {
      showToast("err", "Failed to toggle maintenance mode.");
    }
    setTogglingMaintenance(false);
  };

  // ════════════════════════════════════════════════════════════════════════
  // NEWS TAB STATE
  // ════════════════════════════════════════════════════════════════════════
  const [messages,   setMessages]   = useState<NewsMessage[]>([]);
  const [loadingMsg, setLoadingMsg] = useState(true);
  const [newText,    setNewText]    = useState("");
  const [sending,    setSending]    = useState(false);
  const [editId,     setEditId]     = useState<number | null>(null);
  const [editText,   setEditText]   = useState("");
  const [saving,     setSaving]     = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchMessages = async () => {
    setLoadingMsg(true);
    const { data, error } = await supabase
      .from("news_messages")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setMessages((data as NewsMessage[]) ?? []);
    setLoadingMsg(false);
  };

  useEffect(() => { fetchMessages(); }, []);

  const handleCreate = async () => {
    if (!newText.trim()) return;
    setSending(true);
    const { error } = await supabase.from("news_messages").insert({ content: newText.trim() });
    setSending(false);
    if (error) { showToast("err", "Failed to send message."); }
    else { setNewText(""); showToast("ok", "Message sent!"); fetchMessages(); }
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || editId === null) return;
    setSaving(true);
    const { error } = await supabase
      .from("news_messages").update({ content: editText.trim() }).eq("id", editId);
    setSaving(false);
    if (error) { showToast("err", "Failed to update message."); }
    else { setEditId(null); setEditText(""); showToast("ok", "Message updated."); fetchMessages(); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this message?")) return;
    setDeletingId(id);
    const { error } = await supabase.from("news_messages").delete().eq("id", id);
    setDeletingId(null);
    if (error) { showToast("err", "Failed to delete."); }
    else { showToast("ok", "Deleted."); fetchMessages(); }
  };

  // ════════════════════════════════════════════════════════════════════════
  // COMMUNITY TAB STATE
  // ════════════════════════════════════════════════════════════════════════
  const [communityFilter, setCommunityFilter] = useState<CommunityFilter>("pending");
  const [members,         setMembers]         = useState<CommunityMember[]>([]);
  const [loadingMembers,  setLoadingMembers]  = useState(false);
  const [updatingId,      setUpdatingId]      = useState<number | null>(null);

  const fetchMembers = async (status?: CommunityFilter) => {
    const s = status ?? communityFilter;
    setLoadingMembers(true);
    const { data, error } = await supabase
      .from("community_members")
      .select("*")
      .eq("status", s)
      .order("created_at", { ascending: false });
    if (!error) setMembers((data as CommunityMember[]) ?? []);
    setLoadingMembers(false);
  };

  useEffect(() => {
    if (activeTab === "community") fetchMembers(communityFilter);
  }, [activeTab, communityFilter]);

  const updateStatus = async (id: number, status: CommunityMember["status"]) => {
    setUpdatingId(id);
    const { error } = await supabase
      .from("community_members")
      .update({ status })
      .eq("id", id);
    setUpdatingId(null);
    if (error) { showToast("err", `Failed to ${status} member.`); }
    else {
      showToast("ok", `Member ${status}.`);
      fetchMembers();
    }
  };

  const FILTERS: { key: CommunityFilter; label: string; icon: React.ReactNode }[] = [
    { key: "pending",  label: "Pending",  icon: <Clock className="h-3.5 w-3.5" /> },
    { key: "approved", label: "Approved", icon: <CheckCircle className="h-3.5 w-3.5" /> },
    { key: "rejected", label: "Rejected", icon: <X className="h-3.5 w-3.5" /> },
    { key: "banned",   label: "Banned",   icon: <Ban className="h-3.5 w-3.5" /> },
  ];

  // ════════════════════════════════════════════════════════════════════════
  // BET SLIP TAB STATE
  // ════════════════════════════════════════════════════════════════════════
  const [betSlipFile, setBetSlipFile] = useState<File | null>(null);
  const [betSlipPreview, setBetSlipPreview] = useState<string | null>(null);
  const [betSlipCaption, setBetSlipCaption] = useState("");
  const [betSlipSending, setBetSlipSending] = useState(false);
  const [randomCaptionUsed, setRandomCaptionUsed] = useState(false);

  const handleBetSlipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBetSlipFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setBetSlipPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const shuffleRandomCaption = () => {
    const randomIndex = Math.floor(Math.random() * BET_CAPTIONS.length);
    setBetSlipCaption(BET_CAPTIONS[randomIndex]);
    setRandomCaptionUsed(true);
  };

  const sendBetSlip = async () => {
    if (!betSlipFile) {
      showToast("err", "Please select a bet slip image.");
      return;
    }
    if (!betSlipCaption.trim()) {
      showToast("err", "Please enter a caption or generate a random one.");
      return;
    }

    setBetSlipSending(true);

    try {
      // 1. Upload image to Supabase Storage bucket "bet_slips"
      const fileExt = betSlipFile.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("bet_slips")
        .upload(fileName, betSlipFile, { cacheControl: "3600", upsert: false });

      if (uploadError) throw new Error(uploadError.message);

      // 2. Get public URL
      const { data: publicUrlData } = supabase.storage.from("bet_slips").getPublicUrl(fileName);
      const imageUrl = publicUrlData.publicUrl;

      // 3. Call notify-telegram edge function with type "raw" and media
      const payload = {
        type: "raw",
        text: betSlipCaption,
        bot: "tECH_BOT", // must match the bot key in your notify-telegram env
        media: {
          type: "photo",
          url: imageUrl,
        },
      };

      const response = await fetch(NOTIFY_TELEGRAM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${NOTIFY_SECRET}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Telegram send failed: ${errText}`);
      }

      showToast("ok", "Bet slip sent to Telegram!");
      // Reset form
      setBetSlipFile(null);
      setBetSlipPreview(null);
      setBetSlipCaption("");
      setRandomCaptionUsed(false);
    } catch (err: any) {
      console.error(err);
      showToast("err", err.message || "Failed to send bet slip.");
    } finally {
      setBetSlipSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">

        {/* ── Page header ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-gold">
            <ShieldCheck className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">Admin Panel</h1>
            <p className="text-xs text-muted-foreground">10 Odds management console</p>
          </div>
        </div>

        {/* ── Tab switcher ───────────────────────────────────────────────── */}
        <div className="flex gap-1 rounded-xl bg-muted/40 border border-border p-1 mb-6 flex-wrap">
          {(
            [
              { key: "news",      label: "News",      icon: <Newspaper className="h-3.5 w-3.5" /> },
              { key: "community", label: "Community", icon: <Users className="h-3.5 w-3.5" /> },
              { key: "betSlip",   label: "Bet Slip",  icon: <ImageUp className="h-3.5 w-3.5" /> },
              { key: "settings",  label: "Settings",  icon: <Wrench className="h-3.5 w-3.5" /> },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg transition-colors duration-150 ${
                activeTab === t.key
                  ? "gradient-gold text-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* NEWS TAB                                                         */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === "news" && (
          <>
            {/* Refresh */}
            <div className="flex justify-end mb-4">
              <button
                onClick={fetchMessages}
                disabled={loadingMsg}
                className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground"
              >
                <RefreshCw className={`h-4 w-4 ${loadingMsg ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Compose */}
            <div className="rounded-xl border border-border bg-card p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquarePlus className="h-4 w-4 text-gold" />
                <p className="text-sm font-semibold text-foreground">New Message</p>
              </div>
              <textarea
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Type a message for the community…"
                rows={4}
                className="w-full rounded-lg bg-muted/40 border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/40 resize-none"
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleCreate}
                  disabled={sending || !newText.trim()}
                  className="flex items-center gap-2 gradient-gold text-accent-foreground font-semibold px-5 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            </div>

            {/* Message list */}
            {loadingMsg ? (
              <div className="flex justify-center py-16">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {messages.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-12">No messages yet.</p>
                )}
                <AnimatePresence>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      className="rounded-xl border border-border bg-card overflow-hidden"
                    >
                      {editId === msg.id ? (
                        <div className="p-4 space-y-3">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={4}
                            className="w-full rounded-lg bg-muted/40 border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/40 resize-none"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => { setEditId(null); setEditText(""); }}
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border"
                            >
                              <X className="h-3.5 w-3.5" /> Cancel
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              disabled={saving || !editText.trim()}
                              className="flex items-center gap-1.5 text-xs gradient-gold text-accent-foreground font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
                            >
                              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4">
                          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed mb-3">
                            {msg.content}
                          </p>
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] text-muted-foreground/60">
                              {formatDate(msg.created_at)}
                              {msg.updated_at !== msg.created_at && " (edited)"}
                            </p>
                            <div className="flex gap-1">
                              <button
                                onClick={() => { setEditId(msg.id); setEditText(msg.content); }}
                                className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(msg.id)}
                                disabled={deletingId === msg.id}
                                className="p-1.5 rounded-md hover:bg-red-500/15 text-muted-foreground hover:text-red-400 transition-colors"
                              >
                                {deletingId === msg.id
                                  ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                  : <Trash2 className="h-3.5 w-3.5" />
                                }
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* COMMUNITY TAB                                                    */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === "community" && (
          <>
            {/* Filter bar */}
            <div className="flex gap-1.5 flex-wrap mb-5">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setCommunityFilter(f.key)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                    communityFilter === f.key
                      ? "gradient-gold text-accent-foreground border-transparent"
                      : "bg-muted/30 text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {f.icon}
                  {f.label}
                </button>
              ))}
              <button
                onClick={() => fetchMembers()}
                disabled={loadingMembers}
                className="ml-auto p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground"
              >
                <RefreshCw className={`h-4 w-4 ${loadingMembers ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Member list */}
            {loadingMembers ? (
              <div className="flex justify-center py-16">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-12">
                No {communityFilter} submissions.
              </p>
            ) : (
              <AnimatePresence>
                <div className="space-y-3">
                  {members.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      className="rounded-xl border border-border bg-card overflow-hidden"
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="h-11 w-11 shrink-0 rounded-xl bg-muted/40 flex items-center justify-center overflow-hidden">
                            <img
                              src={m.avatar}
                              alt=""
                              className="w-8 h-8 object-contain"
                              onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
                            />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-foreground truncate">
                                {m.username}
                              </span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[m.status]}`}>
                                {m.status}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {m.real_name}
                            </p>
                            <div className="flex gap-3 mt-1.5">
                              <span className={`text-[10px] flex items-center gap-1 ${m.is_supporter ? "text-emerald-400" : "text-red-400"}`}>
                                {m.is_supporter ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                Supporter
                              </span>
                              <span className={`text-[10px] flex items-center gap-1 ${m.terms_agreed ? "text-emerald-400" : "text-red-400"}`}>
                                {m.terms_agreed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                Terms
                              </span>
                              <span className="text-[10px] text-muted-foreground/60 ml-auto">
                                {formatDate(m.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                          {m.status !== "approved" && (
                            <button
                              onClick={() => updateStatus(m.id, "approved")}
                              disabled={updatingId === m.id}
                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                            >
                              {updatingId === m.id
                                ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                : <CheckCircle className="h-3.5 w-3.5" />
                              }
                              Approve
                            </button>
                          )}
                          {m.status !== "rejected" && (
                            <button
                              onClick={() => updateStatus(m.id, "rejected")}
                              disabled={updatingId === m.id}
                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                            >
                              {updatingId === m.id
                                ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                : <X className="h-3.5 w-3.5" />
                              }
                              Reject
                            </button>
                          )}
                          {m.status !== "banned" && (
                            <button
                              onClick={() => {
                                if (confirm("Ban this user permanently?")) updateStatus(m.id, "banned");
                              }}
                              disabled={updatingId === m.id}
                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-zinc-500/15 text-zinc-400 border border-zinc-500/25 hover:bg-zinc-500/25 transition-colors disabled:opacity-50 ml-auto"
                            >
                              <Ban className="h-3.5 w-3.5" />
                              Ban
                            </button>
                          )}
                          {m.status === "banned" && (
                            <span className="text-xs text-zinc-500 italic">Banned</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* BET SLIP TAB – NEW FEATURE                                      */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === "betSlip" && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <ImageUp className="h-4 w-4 text-gold" />
              <p className="text-sm font-semibold text-foreground">Send Bet Slip to Telegram</p>
            </div>

            {/* File upload area */}
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-gold/50 transition-colors">
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif"
                onChange={handleBetSlipFileChange}
                className="hidden"
                id="bet-slip-upload"
              />
              <label htmlFor="bet-slip-upload" className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Click to select a bet slip image (JPG, PNG, GIF)</span>
              </label>
            </div>

            {/* Preview */}
            {betSlipPreview && (
              <div className="rounded-lg overflow-hidden border border-border bg-muted/20 p-2">
                <img src={betSlipPreview} alt="Preview" className="max-h-64 w-auto mx-auto object-contain" />
              </div>
            )}

            {/* Caption input with random generator */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Caption / Message</label>
              <div className="flex gap-2">
                <textarea
                  value={betSlipCaption}
                  onChange={(e) => setBetSlipCaption(e.target.value)}
                  placeholder="Write a caption or generate one randomly..."
                  rows={3}
                  className="flex-1 rounded-lg bg-muted/40 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/40 resize-none"
                />
                <button
                  onClick={shuffleRandomCaption}
                  className="shrink-0 px-3 py-2 rounded-lg bg-muted/50 border border-border text-muted-foreground hover:text-foreground transition-colors"
                  title="Generate random caption"
                >
                  <Shuffle className="h-5 w-5" />
                </button>
              </div>
              {randomCaptionUsed && (
                <p className="text-[11px] text-gold/70">✨ Random caption applied – you can edit it further.</p>
              )}
            </div>

            {/* Send button */}
            <div className="flex justify-end">
              <button
                onClick={sendBetSlip}
                disabled={betSlipSending || !betSlipFile || !betSlipCaption.trim()}
                className="flex items-center gap-2 gradient-gold text-accent-foreground font-semibold px-5 py-2.5 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {betSlipSending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {betSlipSending ? "Sending..." : "Send to Telegram"}
              </button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Image will be uploaded to Supabase Storage (public) and sent via <strong>tECH_BOT</strong> to the configured channel.
            </p>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SETTINGS TAB – Maintenance Mode Toggle                           */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === "settings" && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="h-4 w-4 text-gold" />
              <p className="text-sm font-semibold text-foreground">Site Settings</p>
            </div>

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-medium text-foreground">Maintenance Mode</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When enabled, all visitors see a "We'll be right back" screen.
                  You can still access the site with the admin key.
                </p>
              </div>
              <button
                disabled={togglingMaintenance}
                onClick={handleToggleMaintenance}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all disabled:opacity-60 ${
                  maintenanceOn
                    ? "bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25"
                    : "bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25"
                }`}
              >
                {togglingMaintenance ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : maintenanceOn ? (
                  <Ban className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {maintenanceOn ? "Disable Maintenance" : "Enable Maintenance"}
              </button>
            </div>

            {maintenanceOn && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/25 px-4 py-3 text-xs text-amber-300">
                <strong>Maintenance is currently ON.</strong> Visitors are locked out. Turn it off when you're done.
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2 ${
              toast.type === "ok"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-red-500/20 text-red-400 border border-red-500/30"
            }`}
          >
            {toast.type === "ok"
              ? <CheckCircle className="h-4 w-4" />
              : <X className="h-4 w-4" />
            }
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminCommunity;