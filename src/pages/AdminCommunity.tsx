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
  ChevronDown,
  ChevronUp,
  Newspaper,
} from "lucide-react";
import Layout from "@/components/Layout";

// ── Supabase ─────────────────────────────────────────────────────────────────
// For admin operations (UPDATE / DELETE) on community_members you need the
// service-role key. Store it as VITE_SUPABASE_SERVICE_KEY in your .env and
// never expose it publicly – only the admin page (behind secret key) uses it.
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  // Prefer service key for admin; fall back to anon key if not set.
  (import.meta.env.VITE_SUPABASE_SERVICE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string,
);

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET as string;

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

type Tab = "news" | "community";
type CommunityFilter = "pending" | "approved" | "rejected" | "banned";

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

  // ── Auth gate ───────────────────────────────────────────────────────────
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
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    approved: true,
    rejected: true,
    banned:   true,
  });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const toggleSection = (s: string) =>
    setCollapsedSections((prev) => ({ ...prev, [s]: !prev[s] }));

  // ─── Tab filter buttons for community ────────────────────────────────────
  const FILTERS: { key: CommunityFilter; label: string; icon: React.ReactNode }[] = [
    { key: "pending",  label: "Pending",  icon: <Clock className="h-3.5 w-3.5" /> },
    { key: "approved", label: "Approved", icon: <CheckCircle className="h-3.5 w-3.5" /> },
    { key: "rejected", label: "Rejected", icon: <X className="h-3.5 w-3.5" /> },
    { key: "banned",   label: "Banned",   icon: <Ban className="h-3.5 w-3.5" /> },
  ];

  return (
    <Layout>
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
        <div className="flex gap-1 rounded-xl bg-muted/40 border border-border p-1 mb-6">
          {(
            [
              { key: "news",      label: "News",      icon: <Newspaper className="h-3.5 w-3.5" /> },
              { key: "community", label: "Community", icon: <Users className="h-3.5 w-3.5" /> },
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
    </Layout>
  );
};

export default AdminCommunity;