import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, subDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Activity, BarChart2, BookOpen, CalendarDays, Check,
  Database, Download, FileText, Filter, History as HistoryIcon,
  ImageOff, Loader2, Pencil, Save, ShieldAlert, ShieldCheck,
  Trash2, TrendingUp, UserCheck, UserX, Users, X,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip as RechartTooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DISEASES, type DiseaseId } from "@/data/diseases";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
type ScanHistory = Tables<"scan_history">;
type UserRow     = Tables<"users">;
type DiseaseRow  = Tables<"diseases">;
type TabId = "stats" | "users" | "history" | "diseases" | "export";

// ─── Constants ────────────────────────────────────────────────────────────────
const PIE_COLORS = ["#5a8a4f", "#e67e22", "#8e44ad", "#2980b9", "#c0392b"];
const ALL_KEYS   = [
  "Healthy", "Dryness", "Fungal_Disease",
  "Magnesium_Deficiency", "Scale_Insect",
];

const getDiseaseName = (key: string) =>
  DISEASES[key as DiseaseId]?.name ?? key.replace(/_/g, " ");

// ─── Export helpers ───────────────────────────────────────────────────────────

async function urlToBlob(url: string): Promise<Blob | null> {
  try {
    const r = await fetch(url);
    return r.ok ? r.blob() : null;
  } catch { return null; }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadCSV(rows: Record<string, any>[], filename: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv  = [keys.join(","), ...rows.map(r => keys.map(k => escape(r[k])).join(","))].join("\n");
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8;" }), filename);
}

async function downloadImagesAsZip(
  items: ScanHistory[],
  zipName: string,
  onProgress: (done: number, total: number) => void,
) {
  // Coba load JSZip dari CDN
  let JSZip: any = null;
  try {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject();
      document.head.appendChild(s);
    });
    JSZip = (window as any).JSZip;
  } catch { /* tidak ada JSZip */ }

  const withImg = items.filter(i => i.image_url);

  if (!JSZip) {
    // Fallback: download satu per satu (max 20)
    const limited = withImg.slice(0, 20);
    toast.warning(`JSZip tidak tersedia. Mengunduh ${limited.length} gambar satu per satu.`);
    for (const item of limited) {
      const blob = await urlToBlob(item.image_url!);
      if (blob) {
        const ext = item.image_url!.split(".").pop()?.split("?")[0] ?? "jpg";
        triggerDownload(blob, `${item.disease_key}_${item.id.slice(0, 8)}.${ext}`);
        await new Promise(r => setTimeout(r, 400));
      }
      onProgress(limited.indexOf(item) + 1, limited.length);
    }
    return;
  }

  const zip   = new JSZip();
  const total = withImg.length;
  let done    = 0;

  for (const item of withImg) {
    const blob = await urlToBlob(item.image_url!);
    if (blob) {
      const ext  = item.image_url!.split(".").pop()?.split("?")[0] ?? "jpg";
      const conf = Math.round(Number(item.confidence) * 100);
      zip.file(`${item.disease_key}/${item.id.slice(0, 8)}_${conf}pct.${ext}`, blob);
    }
    done++;
    onProgress(done, total);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  triggerDownload(zipBlob, zipName);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabBtn({ id, active, icon: Icon, label, onClick }: {
  id: TabId; active: boolean; icon: React.ElementType; label: string;
  onClick: (id: TabId) => void;
}) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap
        ${active
          ? "bg-primary-deep text-primary-foreground shadow-soft"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/70"}`}
    >
      <Icon className="h-4 w-4" />{label}
    </button>
  );
}

function StatCard({ icon: Icon, label, value, sub }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string;
}) {
  return (
    <Card className="gradient-card border-border/40 shadow-soft">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
            <p className="font-display text-3xl font-bold text-primary-deep">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="h-10 w-10 rounded-2xl gradient-leaf flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ConfirmDialog({ open, title, desc, onConfirm, onCancel }: {
  open: boolean; title: string; desc: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm">
      <div className="gradient-card border border-border/40 shadow-elegant rounded-3xl p-8 max-w-sm w-full mx-4 animate-fade-up">
        <h3 className="font-display text-xl font-bold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{desc}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>Batal</Button>
          <Button size="sm" className="bg-destructive hover:bg-destructive/90 text-white" onClick={onConfirm}>
            Hapus
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const Dashboard = () => {
  const [loading, setLoading]     = useState(true);
  const [authed, setAuthed]       = useState(false);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("stats");

  // Data
  const [history, setHistory]   = useState<ScanHistory[]>([]);
  const [users, setUsers]       = useState<UserRow[]>([]);
  const [diseases, setDiseases] = useState<DiseaseRow[]>([]);

  // UI — umum
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // UI — edit disease
  const [editingDisease, setEditingDisease] = useState<DiseaseRow | null>(null);
  const [editForm, setEditForm]             = useState<Partial<DiseaseRow>>({});
  const [saving, setSaving]                 = useState(false);

  // UI — export
  const [exportKeys, setExportKeys]               = useState<string[]>([...ALL_KEYS]);
  const [exportOnlyWithImg, setExportOnlyWithImg] = useState(true);
  const [exportMinConf, setExportMinConf]         = useState(0);
  const [exporting, setExporting]                 = useState(false);
  const [exportProgress, setExportProgress]       = useState<{ done: number; total: number } | null>(null);

  // ── Load ─────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const { data: sd } = await supabase.auth.getSession();
      const user = sd.session?.user;
      if (!mounted) return;

      setAuthed(Boolean(user));
      if (!user) { setLoading(false); return; }

      const { data: ud } = await supabase
        .from("users").select("role").eq("id", user.id).maybeSingle();
      const admin = (ud as any)?.role === "admin";
      if (!mounted) return;
      setIsAdmin(admin);
      if (!admin) { setLoading(false); return; }

      const [{ data: hd }, { data: usd }, { data: dd }] = await Promise.all([
        supabase.from("scan_history").select("*").order("scanned_at", { ascending: false }),
        supabase.from("users").select("*").order("created_at", { ascending: false }),
        supabase.from("diseases").select("*").order("key"),
      ]);

      if (!mounted) return;
      setHistory(hd ?? []);
      setUsers(usd ?? []);
      setDiseases(dd ?? []);
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, []);

  // ── Computed ─────────────────────────────────────────────────────
  const userMap = useMemo(() => {
    const m = new Map<string, UserRow>();
    users.forEach(u => m.set(u.id, u));
    return m;
  }, [users]);

  const totalScans  = history.length;
  const totalUsers  = users.length;
  const activeUsers = users.filter(u => u.is_active).length;
  const latestScan  = history[0];

  const avgConf = useMemo(() => {
    if (!history.length) return 0;
    return Math.round(
      history.reduce((s, h) => s + Number(h.confidence), 0) / history.length * 100
    );
  }, [history]);

  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    history.forEach(h => { counts[h.disease_key] = (counts[h.disease_key] ?? 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => ({ name: getDiseaseName(key), value, key }));
  }, [history]);

  const lineData = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = subDays(new Date(), 13 - i);
      return { date: format(d, "dd/MM"), count: 0 };
    });
    history.forEach(h => {
      const day   = format(new Date(h.scanned_at), "dd/MM");
      const found = days.find(d => d.date === day);
      if (found) found.count++;
    });
    return days;
  }, [history]);

  // Export filtered items
  const exportItems = useMemo(() => {
    return history.filter(h => {
      if (!exportKeys.includes(h.disease_key)) return false;
      if (exportOnlyWithImg && !h.image_url) return false;
      if (Number(h.confidence) < exportMinConf / 100) return false;
      return true;
    });
  }, [history, exportKeys, exportOnlyWithImg, exportMinConf]);

  const exportWithImg    = exportItems.filter(h => !!h.image_url).length;
  const exportWithoutImg = exportItems.filter(h => !h.image_url).length;

  // ── Actions ──────────────────────────────────────────────────────

  const toggleUser = async (u: UserRow) => {
    setTogglingId(u.id);
    const next = !u.is_active;
    const { error } = await supabase.from("users").update({ is_active: next }).eq("id", u.id);
    if (error) { toast.error("Gagal: " + error.message); }
    else {
      setUsers(p => p.map(x => x.id === u.id ? { ...x, is_active: next } : x));
      toast.success(next
        ? `${u.full_name ?? "User"} diaktifkan.`
        : `${u.full_name ?? "User"} dinonaktifkan.`
      );
    }
    setTogglingId(null);
  };

  const deleteScan = async (id: string) => {
    const { error } = await supabase.from("scan_history").delete().eq("id", id);
    if (error) { toast.error("Gagal menghapus: " + error.message); }
    else {
      setHistory(p => p.filter(h => h.id !== id));
      toast.success("Data scan dihapus.");
    }
    setDeletingId(null);
  };

  const openEdit = (d: DiseaseRow) => {
    setEditingDisease(d);
    setEditForm({
      name_id     : d.name_id,
      severity    : d.severity,
      description : d.description ?? "",
      treatment   : d.treatment,
      prevention  : d.prevention,
    });
  };

  const saveDisease = async () => {
    if (!editingDisease) return;
    setSaving(true);
    const toArr = (v: any): string[] => {
      if (Array.isArray(v)) return v;
      if (typeof v === "string") return v.split("\n").map(s => s.trim()).filter(Boolean);
      return [];
    };
    const payload = {
      name_id     : editForm.name_id,
      severity    : editForm.severity,
      description : editForm.description,
      treatment   : toArr(editForm.treatment),
      prevention  : toArr(editForm.prevention),
      updated_at  : new Date().toISOString(),
    };
    const { error } = await supabase.from("diseases").update(payload).eq("key", editingDisease.key);
    if (error) { toast.error("Gagal: " + error.message); }
    else {
      setDiseases(p => p.map(d => d.key === editingDisease.key ? { ...d, ...payload } : d));
      toast.success("Info penyakit diperbarui.");
      setEditingDisease(null);
    }
    setSaving(false);
  };

  const arrToText = (v: any): string => {
    if (Array.isArray(v)) return v.join("\n");
    if (typeof v === "string") return v;
    try { return JSON.parse(v).join("\n"); } catch { return ""; }
  };

  // ── Export actions ────────────────────────────────────────────────

  const handleExportCSV = () => {
    if (!exportItems.length) { toast.error("Tidak ada data yang sesuai filter."); return; }
    const rows = exportItems.map((h, idx) => ({
      no          : idx + 1,
      id          : h.id,
      label       : h.disease_key,
      label_name  : getDiseaseName(h.disease_key),
      confidence  : Number(h.confidence).toFixed(4),
      has_image   : h.image_url ? "yes" : "no",
      image_url   : h.image_url ?? "",
      scanned_at  : h.scanned_at,
      user_id     : h.user_id,
    }));
    const ts = format(new Date(), "yyyyMMdd_HHmm");
    downloadCSV(rows, `nyakwit_metadata_${ts}.csv`);
    toast.success(`CSV ${rows.length} baris diunduh.`);
  };

  const handleExportImages = async () => {
    const withImg = exportItems.filter(h => h.image_url);
    if (!withImg.length) { toast.error("Tidak ada gambar yang sesuai filter."); return; }
    setExporting(true);
    setExportProgress({ done: 0, total: withImg.length });
    toast.info(`Mengunduh ${withImg.length} gambar… Mohon tunggu.`);
    try {
      const ts = format(new Date(), "yyyyMMdd_HHmm");
      await downloadImagesAsZip(
        withImg,
        `nyakwit_images_${ts}.zip`,
        (done, total) => setExportProgress({ done, total }),
      );
      toast.success(`Berhasil mengunduh ${withImg.length} gambar.`);
    } catch (e: any) {
      toast.error("Gagal: " + e.message);
    } finally {
      setExporting(false);
      setExportProgress(null);
    }
  };

  const handleExportFull = async () => {
    handleExportCSV();
    await handleExportImages();
  };

  // ── Severity helpers ──────────────────────────────────────────────
  const sevBadge: Record<string, string> = {
    none: "bg-emerald-100 text-emerald-800", low: "bg-yellow-100 text-yellow-800",
    medium: "bg-orange-100 text-orange-800", high: "bg-red-100 text-red-800",
  };
  const sevLabel: Record<string, string> = {
    none: "Aman", low: "Ringan", medium: "Sedang", high: "Berat",
  };

  // ── Guards ────────────────────────────────────────────────────────
  const GuardLayout = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0">
      <Header />
      <main className="container flex-1 flex items-center justify-center py-20">{children}</main>
      <Footer />
    </div>
  );

  if (loading) return (
    <GuardLayout>
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" /><span>Memuat dashboard…</span>
      </div>
    </GuardLayout>
  );
  if (!authed) return (
    <GuardLayout>
      <div className="rounded-3xl border border-border/40 gradient-card p-8 text-center max-w-sm">
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="font-display text-2xl font-bold">Login diperlukan</h2>
        <Button asChild variant="hero" className="mt-6"><Link to="/auth">Login</Link></Button>
      </div>
    </GuardLayout>
  );
  if (!isAdmin) return (
    <GuardLayout>
      <div className="rounded-3xl border border-border/40 gradient-card p-8 text-center max-w-sm">
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="font-display text-2xl font-bold">Akses ditolak</h2>
        <p className="text-sm text-muted-foreground mt-2">Halaman ini hanya untuk admin.</p>
        <Button asChild variant="hero" className="mt-6"><Link to="/history">Riwayat Saya</Link></Button>
      </div>
    </GuardLayout>
  );

  // ── Main render ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0">
      <Header />

      <main className="container py-8 md:py-12 flex-1">

        {/* Page header */}
        <div className="mb-6 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-xs font-semibold mb-3">
            <ShieldCheck className="h-3.5 w-3.5 text-primary-deep" /> ADMIN PANEL
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Dashboard Admin</h1>
          <p className="mt-2 text-muted-foreground">
            Kelola pengguna, riwayat scan, konten penyakit, dan ekspor dataset untuk pengembangan model.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <StatCard icon={Users}       label="Total Pengguna" value={totalUsers}    sub={`${activeUsers} aktif`} />
          <StatCard icon={HistoryIcon} label="Total Scan"     value={totalScans}    sub="semua user" />
          <StatCard icon={Activity}    label="Avg Confidence" value={`${avgConf}%`} sub="seluruh scan" />
          <StatCard
            icon={CalendarDays} label="Scan Terakhir"
            value={latestScan ? format(new Date(latestScan.scanned_at), "dd MMM", { locale: idLocale }) : "-"}
            sub={latestScan ? format(new Date(latestScan.scanned_at), "HH:mm") : ""}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          <TabBtn id="stats"    active={activeTab === "stats"}    icon={BarChart2}   label="Statistik"     onClick={setActiveTab} />
          <TabBtn id="users"    active={activeTab === "users"}    icon={Users}       label="Pengguna"      onClick={setActiveTab} />
          <TabBtn id="history"  active={activeTab === "history"}  icon={HistoryIcon} label="Riwayat Scan"  onClick={setActiveTab} />
          <TabBtn id="diseases" active={activeTab === "diseases"} icon={BookOpen}    label="Info Penyakit" onClick={setActiveTab} />
          <TabBtn id="export"   active={activeTab === "export"}   icon={Database}    label="Export Dataset" onClick={setActiveTab} />
        </div>

        {/* ══ STATISTIK ══════════════════════════════════════════════════════════ */}
        {activeTab === "stats" && (
          <div className="space-y-6 animate-fade-up">
            <div className="grid md:grid-cols-2 gap-6">

              {/* Pie chart */}
              <Card className="gradient-card border-border/40 shadow-soft">
                <CardHeader>
                  <CardTitle className="font-display text-lg font-bold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary-deep" /> Distribusi Penyakit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!pieData.length
                    ? <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">Belum ada data scan.</div>
                    : (
                      <div className="flex flex-col items-center gap-4">
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                              {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                            </Pie>
                            <RechartTooltip
                              formatter={(v: number, n: string) => [`${v} scan`, n]}
                              contentStyle={{ borderRadius: "12px", border: "1px solid hsl(90 14% 80%)", fontSize: "12px" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center">
                          {pieData.map((d, i) => (
                            <div key={d.key} className="flex items-center gap-1.5 text-xs">
                              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                              <span className="text-muted-foreground">{d.name} <b className="text-foreground">({d.value})</b></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  }
                </CardContent>
              </Card>

              {/* Line chart */}
              <Card className="gradient-card border-border/40 shadow-soft">
                <CardHeader>
                  <CardTitle className="font-display text-lg font-bold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary-deep" /> Tren Scan 14 Hari
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={252}>
                    <LineChart data={lineData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(90 14% 85%)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(140 8% 38%)" }} interval={1} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(140 8% 38%)" }} allowDecimals={false} />
                      <RechartTooltip
                        formatter={(v: number) => [`${v} scan`, "Jumlah"]}
                        contentStyle={{ borderRadius: "12px", border: "1px solid hsl(90 14% 80%)", fontSize: "12px" }}
                      />
                      <Line type="monotone" dataKey="count" stroke="hsl(138 22% 28%)" strokeWidth={2.5}
                        dot={{ r: 3, fill: "hsl(138 22% 28%)" }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Ringkasan tabel */}
            <Card className="gradient-card border-border/40 shadow-soft">
              <CardHeader>
                <CardTitle className="font-display text-lg font-bold">Ringkasan Per Penyakit</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Penyakit</TableHead>
                      <TableHead className="text-center">Jumlah</TableHead>
                      <TableHead className="text-center">Persentase</TableHead>
                      <TableHead>Proporsi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pieData.map((d, i) => (
                      <TableRow key={d.key}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                            {d.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-display font-bold">{d.value}</TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {totalScans > 0 ? Math.round(d.value / totalScans * 100) : 0}%
                        </TableCell>
                        <TableCell>
                          <div className="h-2 bg-muted rounded-full overflow-hidden w-32">
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${totalScans > 0 ? d.value / totalScans * 100 : 0}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!pieData.length && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Belum ada data.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ══ PENGGUNA ══════════════════════════════════════════════════════════ */}
        {activeTab === "users" && (
          <div className="animate-fade-up">
            <Card className="gradient-card border-border/40 shadow-soft">
              <CardHeader>
                <CardTitle className="font-display text-lg font-bold">
                  Daftar Pengguna
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({totalUsers} total · {activeUsers} aktif)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Mobile */}
                <ul className="md:hidden divide-y divide-border/40">
                  {users.map(u => (
                    <li key={u.id} className="py-4 flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full gradient-leaf flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                        {(u.full_name ?? u.email ?? "U")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{u.full_name ?? "-"}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-[10px]">{u.role}</Badge>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${u.is_active ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                            {u.is_active ? "Aktif" : "Nonaktif"}
                          </span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" disabled={togglingId === u.id || u.role === "admin"}
                        onClick={() => toggleUser(u)} className="shrink-0 text-xs">
                        {togglingId === u.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : u.is_active
                            ? <><UserX className="h-3 w-3 mr-1" />Nonaktif</>
                            : <><UserCheck className="h-3 w-3 mr-1" />Aktifkan</>
                        }
                      </Button>
                    </li>
                  ))}
                </ul>
                {/* Desktop */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead>
                        <TableHead>Status</TableHead><TableHead>Bergabung</TableHead><TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map(u => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full gradient-leaf flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                                {(u.full_name ?? u.email ?? "U")[0].toUpperCase()}
                              </div>
                              {u.full_name ?? <span className="text-muted-foreground">-</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                          <TableCell><Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge></TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${u.is_active ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                              {u.is_active ? "Aktif" : "Nonaktif"}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(u.created_at), "dd MMM yyyy", { locale: idLocale })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm"
                              disabled={togglingId === u.id || u.role === "admin"}
                              onClick={() => toggleUser(u)}>
                              {togglingId === u.id
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : u.is_active
                                  ? <><UserX className="h-4 w-4 mr-1" />Nonaktifkan</>
                                  : <><UserCheck className="h-4 w-4 mr-1" />Aktifkan</>
                              }
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!users.length && (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Belum ada pengguna.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ══ RIWAYAT SCAN ══════════════════════════════════════════════════════ */}
        {activeTab === "history" && (
          <div className="animate-fade-up">
            <Card className="gradient-card border-border/40 shadow-soft">
              <CardHeader>
                <CardTitle className="font-display text-lg font-bold">
                  Semua Riwayat Scan
                  <span className="ml-2 text-sm font-normal text-muted-foreground">({totalScans} entri)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Mobile */}
                <ul className="md:hidden divide-y divide-border/40">
                  {history.map(item => {
                    const u = userMap.get(item.user_id);
                    return (
                      <li key={item.id} className="flex items-center gap-3 py-3">
                        {item.image_url
                          ? <img src={item.image_url} alt="" className="h-14 w-14 rounded-xl object-cover shrink-0" loading="lazy" />
                          : <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center shrink-0"><ImageOff className="h-4 w-4 text-muted-foreground" /></div>
                        }
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{getDiseaseName(item.disease_key)}</p>
                          <p className="text-xs text-muted-foreground">
                            {u?.full_name ?? "—"} · {format(new Date(item.scanned_at), "dd MMM HH:mm", { locale: idLocale })}
                          </p>
                          <p className="text-xs font-bold text-primary-deep">{Math.round(Number(item.confidence) * 100)}%</p>
                        </div>
                        <button onClick={() => setDeletingId(item.id)}
                          aria-label="Hapus entri"
                          title="Hapus entri"
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {/* Desktop */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead><TableHead>Pengguna</TableHead><TableHead>Gambar</TableHead>
                        <TableHead>Prediksi</TableHead><TableHead className="text-center">Conf.</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map(item => {
                        const u = userMap.get(item.user_id);
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                              {format(new Date(item.scanned_at), "dd MMM yyyy, HH:mm", { locale: idLocale })}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {u?.full_name ?? item.user_id.slice(0, 8) + "…"}
                            </TableCell>
                            <TableCell>
                              {item.image_url
                                ? <img src={item.image_url} alt="" className="h-14 w-16 rounded-lg object-cover" loading="lazy" />
                                : <div className="h-14 w-16 flex items-center justify-center rounded-lg bg-muted"><ImageOff className="h-5 w-5 text-muted-foreground" /></div>
                              }
                            </TableCell>
                            <TableCell className="font-medium">{getDiseaseName(item.disease_key)}</TableCell>
                            <TableCell className="text-center font-display font-bold text-primary-deep">
                              {Math.round(Number(item.confidence) * 100)}%
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="outline" size="sm" onClick={() => setDeletingId(item.id)}
                                className="text-destructive border-destructive/30 hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4 mr-1" />Hapus
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {!history.length && (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Belum ada riwayat.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ══ INFO PENYAKIT ══════════════════════════════════════════════════════ */}
        {activeTab === "diseases" && (
          <div className="animate-fade-up space-y-4">
            {!diseases.length && (
              <div className="rounded-3xl border border-border/40 gradient-card p-10 text-center text-muted-foreground">
                Tidak ada data. Pastikan seed data sudah dijalankan di Supabase.
              </div>
            )}
            {diseases.map(d => (
              <Card key={d.key} className="gradient-card border-border/40 shadow-soft">
                <CardContent className="p-5 md:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full ${sevBadge[d.severity] ?? ""}`}>
                          {sevLabel[d.severity] ?? d.severity}
                        </span>
                        <code className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">{d.key}</code>
                      </div>
                      <h3 className="font-display text-lg font-bold">{d.name_id}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{d.description}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openEdit(d)} className="shrink-0">
                      <Pencil className="h-4 w-4 mr-1" />Edit
                    </Button>
                  </div>
                  <div className="mt-4 grid sm:grid-cols-2 gap-3">
                    {(["treatment", "prevention"] as const).map(field => (
                      <div key={field}>
                        <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1.5">
                          {field === "treatment" ? "Penanganan" : "Pencegahan"}
                        </p>
                        <ul className="space-y-1">
                          {(Array.isArray(d[field]) ? d[field] as string[] : []).slice(0, 2).map((t, i) => (
                            <li key={i} className="text-xs text-foreground/80 flex gap-1.5">
                              <Check className="h-3 w-3 text-primary shrink-0 mt-0.5" />{t}
                            </li>
                          ))}
                          {(Array.isArray(d[field]) ? d[field] as string[] : []).length > 2 && (
                            <li className="text-xs text-muted-foreground">
                              +{(d[field] as string[]).length - 2} lainnya…
                            </li>
                          )}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ══ EXPORT DATASET ════════════════════════════════════════════════════ */}
        {activeTab === "export" && (
          <div className="animate-fade-up space-y-6">

            {/* Banner info */}
            <div className="rounded-2xl bg-primary-deep/5 border border-primary-deep/20 p-4 flex gap-3">
              <Database className="h-5 w-5 text-primary-deep shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-primary-deep">Export Dataset untuk Pengembangan Model</p>
                <p className="text-muted-foreground mt-0.5">
                  Download foto scan dari pengguna beserta label kelasnya untuk menambah dataset training ResNet-50.
                  File ZIP diorganisir per kelas sehingga langsung bisa dipakai oleh PyTorch <code className="text-xs bg-muted px-1 rounded">ImageFolder</code>.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">

              {/* ── Panel Filter ─────────────────────── */}
              <div className="md:col-span-1">
                <Card className="gradient-card border-border/40 shadow-soft sticky top-20">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Filter className="h-4 w-4 text-primary-deep" /> Filter Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">

                    {/* Kelas */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Kelas Penyakit</p>
                      <div className="space-y-3">
                        {ALL_KEYS.map((key, i) => {
                          const total  = history.filter(h => h.disease_key === key).length;
                          const hasImg = history.filter(h => h.disease_key === key && h.image_url).length;
                          return (
                            <div key={key} className="flex items-start gap-2.5">
                              <Checkbox
                                id={`k-${key}`}
                                checked={exportKeys.includes(key)}
                                onCheckedChange={v =>
                                  setExportKeys(p => v ? [...p, key] : p.filter(k => k !== key))
                                }
                                className="mt-0.5"
                              />
                              <Label htmlFor={`k-${key}`} className="cursor-pointer leading-tight">
                                <div className="flex items-center gap-1.5">
                                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                  <span className="font-medium text-sm">{getDiseaseName(key)}</span>
                                </div>
                                <span className="text-[11px] text-muted-foreground ml-4">
                                  {total} scan · {hasImg} ada foto
                                </span>
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-3 mt-3">
                        <button onClick={() => setExportKeys([...ALL_KEYS])} className="text-xs text-primary underline">Semua</button>
                        <button onClick={() => setExportKeys([])} className="text-xs text-muted-foreground underline">Hapus</button>
                      </div>
                    </div>

                    {/* Hanya yang punya foto */}
                    <div className="flex items-start gap-2.5">
                      <Checkbox id="chk-img" checked={exportOnlyWithImg}
                        onCheckedChange={v => setExportOnlyWithImg(Boolean(v))} className="mt-0.5" />
                      <Label htmlFor="chk-img" className="cursor-pointer text-sm leading-tight">
                        Hanya yang punya foto
                        <br /><span className="text-[11px] text-muted-foreground">Scan tanpa foto tetap bisa di-export via CSV</span>
                      </Label>
                    </div>

                    {/* Min confidence */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Min. Confidence</p>
                      <div className="flex items-center gap-2">
                        <Input type="number" min={0} max={100} value={exportMinConf}
                          onChange={e => setExportMinConf(Math.min(100, Math.max(0, Number(e.target.value))))}
                          className="h-9 w-24 text-sm rounded-xl" />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Hanya data dengan confidence ≥ nilai ini
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ── Panel Hasil & Download ────────────── */}
              <div className="md:col-span-2 space-y-5">

                {/* Ringkasan angka */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Total Data", value: exportItems.length,    color: "text-primary-deep" },
                    { label: "Ada Foto",   value: exportWithImg,         color: "text-emerald-700" },
                    { label: "Tanpa Foto", value: exportWithoutImg,      color: "text-orange-600" },
                  ].map(s => (
                    <div key={s.label} className="gradient-card rounded-2xl border border-border/40 p-4 text-center shadow-soft">
                      <p className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Distribusi kelas */}
                <Card className="gradient-card border-border/40 shadow-soft">
                  <CardHeader>
                    <CardTitle className="text-base font-bold">Distribusi Kelas (setelah filter)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {ALL_KEYS.filter(k => exportKeys.includes(k)).map((key, i) => {
                      const cnt     = exportItems.filter(h => h.disease_key === key).length;
                      const imgCnt  = exportItems.filter(h => h.disease_key === key && h.image_url).length;
                      const pct     = exportItems.length > 0 ? Math.round(cnt / exportItems.length * 100) : 0;
                      return (
                        <div key={key}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium">{getDiseaseName(key)}</span>
                            <span className="text-muted-foreground">{cnt} data · {imgCnt} foto · {pct}%</span>
                          </div>
                          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          </div>
                        </div>
                      );
                    })}
                    {!exportKeys.length && (
                      <p className="text-sm text-muted-foreground text-center py-4">Pilih minimal satu kelas.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Preview thumbnail */}
                {exportWithImg > 0 && (
                  <Card className="gradient-card border-border/40 shadow-soft">
                    <CardHeader>
                      <CardTitle className="text-base font-bold">
                        Preview Gambar
                        <span className="ml-2 text-sm font-normal text-muted-foreground">(20 pertama)</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
                        {exportItems.filter(h => h.image_url).slice(0, 20).map(h => (
                          <div key={h.id} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                            <img src={h.image_url!} alt={h.disease_key}
                              className="w-full h-full object-cover" loading="lazy" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
                              <span className="text-[8px] text-white font-medium leading-tight line-clamp-2">
                                {h.disease_key.replace(/_/g, " ")}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {exportWithImg > 20 && (
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          +{exportWithImg - 20} gambar lainnya tidak ditampilkan
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Progress download */}
                {exportProgress && (
                  <div className="rounded-2xl border border-border/40 gradient-card p-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">Mengunduh gambar…</span>
                      <span className="text-muted-foreground">{exportProgress.done}/{exportProgress.total}</span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary-deep rounded-full transition-all duration-300"
                        style={{ width: `${exportProgress.total > 0 ? exportProgress.done / exportProgress.total * 100 : 0}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round(exportProgress.done / exportProgress.total * 100)}% selesai
                    </p>
                  </div>
                )}

                {/* Tombol download */}
                <div className="grid sm:grid-cols-3 gap-3">
                  <Button variant="outline" onClick={handleExportCSV}
                    disabled={!exportItems.length || exporting}
                    className="flex-col h-auto py-4 gap-1.5">
                    <FileText className="h-5 w-5 text-primary-deep" />
                    <span className="font-semibold text-sm">Download CSV</span>
                    <span className="text-[11px] text-muted-foreground font-normal">Metadata label saja</span>
                  </Button>

                  <Button variant="outline" onClick={handleExportImages}
                    disabled={!exportWithImg || exporting}
                    className="flex-col h-auto py-4 gap-1.5">
                    {exporting
                      ? <Loader2 className="h-5 w-5 animate-spin text-primary-deep" />
                      : <Download className="h-5 w-5 text-primary-deep" />
                    }
                    <span className="font-semibold text-sm">Download ZIP</span>
                    <span className="text-[11px] text-muted-foreground font-normal">Gambar per kelas</span>
                  </Button>

                  <Button variant="hero" onClick={handleExportFull}
                    disabled={!exportItems.length || exporting}
                    className="flex-col h-auto py-4 gap-1.5">
                    {exporting
                      ? <Loader2 className="h-5 w-5 animate-spin" />
                      : <Database className="h-5 w-5" />
                    }
                    <span className="font-semibold text-sm">Export Lengkap</span>
                    <span className="text-[11px] font-normal opacity-80">CSV + ZIP gambar</span>
                  </Button>
                </div>

                {/* Info struktur ZIP */}
                <div className="rounded-2xl bg-muted/60 border border-border/40 p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Struktur ZIP — kompatibel dengan PyTorch ImageFolder
                  </p>
                  <pre className="text-xs text-foreground/70 leading-relaxed font-mono whitespace-pre">{`nyakwit_images_YYYYMMDD.zip
├── Healthy/
│   ├── abc12345_92pct.jpg
│   └── ...
├── Dryness/
├── Fungal_Disease/
├── Magnesium_Deficiency/
└── Scale_Insect/`}</pre>
                  <div className="mt-3 pt-3 border-t border-border/40 grid sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <p>📄 <b>CSV:</b> id, label, confidence, image_url, scanned_at, user_id</p>
                    <p>🖼️ <b>Nama file:</b> <code className="bg-muted px-1 rounded">id_confpct.ext</code></p>
                    <p>🗂️ <b>Folder:</b> nama kelas = nama folder PyTorch</p>
                    <p>✅ <b>Langsung pakai:</b> <code className="bg-muted px-1 rounded">ImageFolder("zip_path")</code></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
      <Footer />

      {/* ══ MODAL EDIT PENYAKIT ══════════════════════════════════════════════════ */}
      {editingDisease && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/30 backdrop-blur-sm py-8 px-4">
          <div className="gradient-card border border-border/40 shadow-elegant rounded-3xl w-full max-w-2xl animate-fade-up">
            <div className="flex items-center justify-between p-6 border-b border-border/40">
              <div>
                <h2 className="font-display text-xl font-bold">Edit Info Penyakit</h2>
                <p className="text-xs text-muted-foreground mt-0.5"><code>{editingDisease.key}</code></p>
              </div>
              <button type="button" onClick={() => setEditingDisease(null)}
                className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-accent transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="e-name">Nama (Indonesia)</Label>
                  <Input id="e-name" value={editForm.name_id ?? ""}
                    onChange={e => setEditForm(f => ({ ...f, name_id: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="e-sev">Tingkat Keparahan</Label>
                  <select id="e-sev" value={editForm.severity ?? "none"}
                    onChange={e => setEditForm(f => ({ ...f, severity: e.target.value as any }))}
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="none">Aman (none)</option>
                    <option value="low">Ringan (low)</option>
                    <option value="medium">Sedang (medium)</option>
                    <option value="high">Berat (high)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-desc">Deskripsi</Label>
                <Textarea id="e-desc" rows={3} value={editForm.description ?? ""}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  className="rounded-xl resize-none" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-treat">
                  Penanganan <span className="text-xs text-muted-foreground font-normal">(satu baris = satu poin)</span>
                </Label>
                <Textarea id="e-treat" rows={4} value={arrToText(editForm.treatment)}
                  onChange={e => setEditForm(f => ({ ...f, treatment: e.target.value }))}
                  className="rounded-xl resize-none font-mono text-xs" placeholder={"Poin 1\nPoin 2"} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-prev">
                  Pencegahan <span className="text-xs text-muted-foreground font-normal">(satu baris = satu poin)</span>
                </Label>
                <Textarea id="e-prev" rows={3} value={arrToText(editForm.prevention)}
                  onChange={e => setEditForm(f => ({ ...f, prevention: e.target.value }))}
                  className="rounded-xl resize-none font-mono text-xs" placeholder={"Poin 1\nPoin 2"} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border/40">
              <Button variant="outline" onClick={() => setEditingDisease(null)}>Batal</Button>
              <Button onClick={saveDisease} disabled={saving} variant="hero">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Simpan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══ CONFIRM DELETE ══════════════════════════════════════════════════════ */}
      <ConfirmDialog
        open={Boolean(deletingId)}
        title="Hapus data scan?"
        desc="Data scan ini akan dihapus permanen dan tidak bisa dikembalikan."
        onConfirm={() => deletingId && deleteScan(deletingId)}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};

export default Dashboard;