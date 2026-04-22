/**
 * AdminNews.tsx  —  tECH Admin Panel  (/admin/news)
 * ───────────────────────────────────────────────────
 * Protected by URL key: ?key=VITE_ADMIN_SECRET
 * If key is wrong or missing, redirects to /.
 *
 * Uses Supabase service-role key is NOT available in the browser, so
 * this panel uses the anon key but relies on you granting INSERT/UPDATE/DELETE
 * to the anon role via Supabase policies — OR you switch to the service role
 * key stored as VITE_SUPABASE_SERVICE_KEY if you keep this page private.
 *
 * Recommended: add Supabase policies for anon:
 *   CREATE POLICY "Admin can write news" ON news_messages
 *     FOR ALL USING (true) WITH CHECK (true);
 * and protect this page solely by the URL key.
 */

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
} from "lucide-react";
import Layout from "@/components/Layout";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET as string;

// ─── Types ────────────────────────────────────────────────────────────────────
interface NewsMessage {
  id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const AdminNewsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ── Auth gate ───────────────────────────────────────────────────────────
  useEffect(() => {
    const key = searchParams.get("key");
    if (!ADMIN_SECRET || key !== ADMIN_SECRET) {
      navigate("/", { replace: true });
    }
  }, [navigate, searchParams]);

  // ── State ───────────────────────────────────────────────────────────────
  const [messages,  setMessages]  = useState<NewsMessage[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [newText,   setNewText]   = useState("");
  const [sending,   setSending]   = useState(false);
  const [editId,    setEditId]    = useState<number | null>(null);
  const [editText,  setEditText]  = useState("");
  const [saving,    setSaving]    = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast,     setToast]     = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch ───────────────────────────────────────────────────────────────
  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("news_messages")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setMessages((data as NewsMessage[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchMessages(); }, []);

  // ── Create ──────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!newText.trim()) return;
    setSending(true);
    const { error } = await supabase
      .from("news_messages")
      .insert({ content: newText.trim() });
    setSending(false);
    if (error) {
      showToast("err", "Failed to send message.");
    } else {
      setNewText("");
      showToast("ok", "Message sent!");
      fetchMessages();
    }
  };

  // ── Update ──────────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editText.trim() || editId === null) return;
    setSaving(true);
    const { error } = await supabase
      .from("news_messages")
      .update({ content: editText.trim() })
      .eq("id", editId);
    setSaving(false);
    if (error) {
      showToast("err", "Failed to update message.");
    } else {
      setEditId(null);
      setEditText("");
      showToast("ok", "Message updated.");
      fetchMessages();
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    if (!confirm("Delete this message?")) return;
    setDeletingId(id);
    const { error } = await supabase
      .from("news_messages")
      .delete()
      .eq("id", id);
    setDeletingId(null);
    if (error) {
      showToast("err", "Failed to delete.");
    } else {
      showToast("ok", "Deleted.");
      fetchMessages();
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-3xl">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-gold">
            <ShieldCheck className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">News Admin</h1>
            <p className="text-xs text-muted-foreground">Manage tECH channel messages</p>
          </div>
          <button
            onClick={fetchMessages}
            disabled={loading}
            className="ml-auto p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* ── Compose new message ────────────────────────────────────────── */}
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
              {sending
                ? <RefreshCw className="h-4 w-4 animate-spin" />
                : <Send className="h-4 w-4" />
              }
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>

        {/* ── Messages list ─────────────────────────────────────────────── */}
        {loading && (
          <div className="flex justify-center py-16">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && (
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
                    /* Edit mode */
                    <div className="p-4 space-y-3">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={4}
                        className="w-full rounded-lg bg-muted/40 border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/40 resize-none"
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
                          {saving
                            ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            : <CheckCircle className="h-3.5 w-3.5" />
                          }
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display mode */
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
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(msg.id)}
                            disabled={deletingId === msg.id}
                            className="p-1.5 rounded-md hover:bg-red-500/15 text-muted-foreground hover:text-red-400 transition-colors"
                            title="Delete"
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

export default AdminNewsPage;