import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, subDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  BarChart2, BookOpen, CalendarDays, Check,
  History as HistoryIcon, ImageOff, Loader2,
  Pencil, Save, ShieldAlert, ShieldCheck,
  Trash2, Users, X, TrendingUp, Activity,
  UserX, UserCheck, Plus, Minus,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip as RechartTooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Legend,
} from "recharts";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DISEASES, type DiseaseId } from "@/data/diseases";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
type ScanHistory = Tables<"scan_history">;
type UserRow = Tables<"users">;
type DiseaseRow = Tables<"diseases">;

type TabId = "stats" | "users" | "history" | "diseases";

// ─── Constants ────────────────────────────────────────────────────────────────
const PIE_COLORS = ["#5a8a4f", "#e67e22", "#8e44ad", "#2980b9", "#c0392b"];

const getDiseaseName = (key: string) =>
  DISEASES[key as DiseaseId]?.name ?? key.replace(/_/g, " ");

// ─── Tab Button ───────────────────────────────────────────────────────────────
function TabBtn({
  id, active, icon: Icon, label, onClick,
}: {
  id: TabId; active: boolean; icon: React.ElementType; label: string;
  onClick: (id: TabId) => void;
}) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap
        ${active
          ? "bg-primary-deep text-primary-foreground shadow-soft"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/70"
        }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, color = "text-primary-deep",
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color?: string;
}) {
  return (
    <Card className="gradient-card border-border/40 shadow-soft">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
            <p className={`font-display text-3xl font-bold ${color}`}>{value}</p>
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

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({
  open, title, desc, onConfirm, onCancel, danger = false,
}: {
  open: boolean; title: string; desc: string;
  onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm">
      <div className="gradient-card border border-border/40 shadow-elegant rounded-3xl p-8 max-w-sm w-full mx-4 animate-fade-up">
        <h3 className="font-display text-xl font-bold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{desc}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>Batal</Button>
          <Button
            size="sm"
            className={danger ? "bg-destructive hover:bg-destructive/90 text-white" : ""}
            onClick={onConfirm}
          >
            {danger ? "Hapus" : "Konfirmasi"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const Dashboard = () => {
  const [loading, setLoading]       = useState(true);
  const [authed, setAuthed]         = useState(false);
  const [isAdmin, setIsAdmin]       = useState(false);
  const [activeTab, setActiveTab]   = useState<TabId>("stats");

  // Data
  const [history, setHistory]       = useState<ScanHistory[]>([]);
  const [users, setUsers]           = useState<UserRow[]>([]);
  const [diseases, setDiseases]     = useState<DiseaseRow[]>([]);

  // UI state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingDisease, setEditingDisease] = useState<DiseaseRow | null>(null);
  const [editForm, setEditForm]     = useState<Partial<DiseaseRow>>({});
  const [saving, setSaving]         = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── Load data ──────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!mounted) return;

      setAuthed(Boolean(user));
      if (!user) { setLoading(false); return; }

      const { data: userData } = await supabase
        .from("users").select("role").eq("id", user.id).maybeSingle();
      const admin = (userData as any)?.role === "admin";
      if (!mounted) return;
      setIsAdmin(admin);
      if (!admin) { setLoading(false); return; }

      const [
        { data: hData },
        { data: uData },
        { data: dData },
      ] = await Promise.all([
        supabase.from("scan_history").select("*").order("scanned_at", { ascending: false }),
        supabase.from("users").select("*").order("created_at", { ascending: false }),
        supabase.from("diseases").select("*").order("key"),
      ]);

      if (!mounted) return;
      setHistory(hData ?? []);
      setUsers(uData ?? []);
      setDiseases(dData ?? []);
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, []);

  // ── Computed ───────────────────────────────────────────────────────
  const userMap = useMemo(() => {
    const m = new Map<string, UserRow>();
    users.forEach(u => m.set(u.id, u));
    return m;
  }, [users]);

  const totalScans  = history.length;
  const totalUsers  = users.length;
  const activeUsers = users.filter(u => u.is_active).length;
  const latestScan  = history[0];

  // Pie chart — distribusi penyakit
  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    history.forEach(h => {
      counts[h.disease_key] = (counts[h.disease_key] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => ({ name: getDiseaseName(key), value, key }));
  }, [history]);

  // Line chart — tren scan 14 hari terakhir
  const lineData = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = subDays(new Date(), 13 - i);
      return { date: format(d, "dd/MM"), full: format(d, "yyyy-MM-dd"), count: 0 };
    });
    history.forEach(h => {
      const day = format(new Date(h.scanned_at), "dd/MM");
      const found = days.find(d => d.date === day);
      if (found) found.count++;
    });
    return days;
  }, [history]);

  // Avg confidence
  const avgConf = useMemo(() => {
    if (!history.length) return 0;
    return Math.round(
      history.reduce((s, h) => s + Number(h.confidence), 0) / history.length * 100
    );
  }, [history]);

  // ── Actions ────────────────────────────────────────────────────────

  // Toggle aktif/nonaktif user
  const toggleUser = async (u: UserRow) => {
    setTogglingId(u.id);
    const newActive = !u.is_active;
    const { error } = await supabase
      .from("users")
      .update({ is_active: newActive })
      .eq("id", u.id);

    if (error) {
      toast.error("Gagal mengubah status: " + error.message);
    } else {
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: newActive } : x));
      toast.success(newActive ? `${u.full_name ?? "User"} diaktifkan.` : `${u.full_name ?? "User"} dinonaktifkan.`);
    }
    setTogglingId(null);
  };

  // Hapus scan
  const deleteScan = async (id: string) => {
    const { error } = await supabase.from("scan_history").delete().eq("id", id);
    if (error) {
      toast.error("Gagal menghapus: " + error.message);
    } else {
      setHistory(prev => prev.filter(h => h.id !== id));
      toast.success("Data scan dihapus.");
    }
    setDeletingId(null);
  };

  // Edit penyakit — buka form
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

  // Edit penyakit — simpan
  const saveDisease = async () => {
    if (!editingDisease) return;
    setSaving(true);

    // Konversi treatment & prevention dari string textarea → JSON array
    const toArray = (val: any): string[] => {
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        return val.split("\n").map(s => s.trim()).filter(Boolean);
      }
      return [];
    };

    const payload = {
      name_id     : editForm.name_id,
      severity    : editForm.severity,
      description : editForm.description,
      treatment   : toArray(editForm.treatment),
      prevention  : toArray(editForm.prevention),
      updated_at  : new Date().toISOString(),
    };

    const { error } = await supabase
      .from("diseases")
      .update(payload)
      .eq("key", editingDisease.key);

    if (error) {
      toast.error("Gagal menyimpan: " + error.message);
    } else {
      setDiseases(prev =>
        prev.map(d =>
          d.key === editingDisease.key ? { ...d, ...payload } : d
        )
      );
      toast.success("Info penyakit diperbarui.");
      setEditingDisease(null);
    }
    setSaving(false);
  };

  // Helper konversi array → textarea string
  const arrToText = (val: any): string => {
    if (Array.isArray(val)) return val.join("\n");
    if (typeof val === "string") return val;
    try { return JSON.parse(val).join("\n"); } catch { return ""; }
  };

  // ── Render helpers ─────────────────────────────────────────────────
  const severityBadge: Record<string, string> = {
    none   : "bg-emerald-100 text-emerald-800",
    low    : "bg-yellow-100 text-yellow-800",
    medium : "bg-orange-100 text-orange-800",
    high   : "bg-red-100 text-red-800",
  };
  const severityLabel: Record<string, string> = {
    none: "Aman", low: "Ringan", medium: "Sedang", high: "Berat",
  };

  // ── Guard ──────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0">
      <Header />
      <main className="container flex-1 flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Memuat dashboard...</span>
        </div>
      </main>
      <Footer />
    </div>
  );

  if (!authed) return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0">
      <Header />
      <main className="container flex-1 flex items-center justify-center py-20">
        <div className="rounded-3xl border border-border/40 gradient-card p-8 text-center max-w-sm">
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold">Login diperlukan</h2>
          <Button asChild variant="hero" className="mt-6">
            <Link to="/auth">Login sekarang</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );

  if (!isAdmin) return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0">
      <Header />
      <main className="container flex-1 flex items-center justify-center py-20">
        <div className="rounded-3xl border border-border/40 gradient-card p-8 text-center max-w-sm">
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold">Akses ditolak</h2>
          <p className="text-sm text-muted-foreground mt-2">Halaman ini hanya untuk admin.</p>
          <Button asChild variant="hero" className="mt-6">
            <Link to="/history">Buka Riwayat</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );

  // ── Main render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0">
      <Header />

      <main className="container py-8 md:py-12 flex-1">

        {/* Page header */}
        <div className="mb-6 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-xs font-semibold mb-3">
            <ShieldCheck className="h-3.5 w-3.5 text-primary-deep" /> ADMIN PANEL
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
            Dashboard Admin
          </h1>
          <p className="mt-2 text-muted-foreground">
            Kelola pengguna, riwayat scan, dan konten ensiklopedia Nyakwit.
          </p>
        </div>

        {/* Stat cards — always visible */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <StatCard icon={Users}       label="Total Pengguna" value={totalUsers}  sub={`${activeUsers} aktif`} />
          <StatCard icon={HistoryIcon} label="Total Scan"     value={totalScans}  sub="semua user" />
          <StatCard icon={Activity}    label="Avg Confidence" value={`${avgConf}%`} sub="model" />
          <StatCard
            icon={CalendarDays}
            label="Scan Terakhir"
            value={latestScan ? format(new Date(latestScan.scanned_at), "dd MMM", { locale: idLocale }) : "-"}
            sub={latestScan ? format(new Date(latestScan.scanned_at), "HH:mm") : ""}
          />
        </div>

        {/* Tab navigation */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-hide">
          <TabBtn id="stats"    active={activeTab === "stats"}    icon={BarChart2}   label="Statistik"   onClick={setActiveTab} />
          <TabBtn id="users"    active={activeTab === "users"}    icon={Users}       label="Pengguna"    onClick={setActiveTab} />
          <TabBtn id="history"  active={activeTab === "history"}  icon={HistoryIcon} label="Riwayat Scan" onClick={setActiveTab} />
          <TabBtn id="diseases" active={activeTab === "diseases"} icon={BookOpen}    label="Info Penyakit" onClick={setActiveTab} />
        </div>

        {/* ══ TAB: STATISTIK ══════════════════════════════════════════ */}
        {activeTab === "stats" && (
          <div className="space-y-6 animate-fade-up">
            <div className="grid md:grid-cols-2 gap-6">

              {/* Pie chart */}
              <Card className="gradient-card border-border/40 shadow-soft">
                <CardHeader>
                  <CardTitle className="font-display text-lg font-bold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary-deep" />
                    Distribusi Penyakit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pieData.length === 0 ? (
                    <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                      Belum ada data scan.
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={90}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {pieData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartTooltip
                            formatter={(val: number, name: string) => [`${val} scan`, name]}
                            contentStyle={{
                              borderRadius: "12px",
                              border: "1px solid hsl(90 14% 80%)",
                              background: "hsl(0 0% 100%)",
                              fontSize: "12px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Legend */}
                      <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center">
                        {pieData.map((d, i) => (
                          <div key={d.key} className="flex items-center gap-1.5 text-xs">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                            />
                            <span className="text-muted-foreground">
                              {d.name} <span className="font-semibold text-foreground">({d.value})</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Line chart */}
              <Card className="gradient-card border-border/40 shadow-soft">
                <CardHeader>
                  <CardTitle className="font-display text-lg font-bold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary-deep" />
                    Tren Scan 14 Hari
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={252}>
                    <LineChart data={lineData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(90 14% 85%)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: "hsl(140 8% 38%)" }}
                        interval={1}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "hsl(140 8% 38%)" }}
                        allowDecimals={false}
                      />
                      <RechartTooltip
                        formatter={(val: number) => [`${val} scan`, "Jumlah"]}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid hsl(90 14% 80%)",
                          background: "hsl(0 0% 100%)",
                          fontSize: "12px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(138 22% 28%)"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "hsl(138 22% 28%)" }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Top diseases table */}
            <Card className="gradient-card border-border/40 shadow-soft">
              <CardHeader>
                <CardTitle className="font-display text-lg font-bold">Ringkasan Per Penyakit</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Penyakit</TableHead>
                      <TableHead className="text-center">Jumlah Scan</TableHead>
                      <TableHead className="text-center">Persentase</TableHead>
                      <TableHead>Proporsi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pieData.map((d, i) => (
                      <TableRow key={d.key}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                            />
                            {d.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-display font-bold">
                          {d.value}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {totalScans > 0 ? Math.round(d.value / totalScans * 100) : 0}%
                        </TableCell>
                        <TableCell>
                          <div className="h-2 bg-muted rounded-full overflow-hidden w-32">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${totalScans > 0 ? d.value / totalScans * 100 : 0}%`,
                                background: PIE_COLORS[i % PIE_COLORS.length],
                              }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {pieData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Belum ada data scan.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ══ TAB: PENGGUNA ══════════════════════════════════════════ */}
        {activeTab === "users" && (
          <div className="animate-fade-up">
            <Card className="gradient-card border-border/40 shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-display text-lg font-bold">
                  Daftar Pengguna
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({totalUsers} total, {activeUsers} aktif)
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
                          <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-[10px]">
                            {u.role}
                          </Badge>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${u.is_active ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                            {u.is_active ? "Aktif" : "Nonaktif"}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={togglingId === u.id || u.role === "admin"}
                        onClick={() => toggleUser(u)}
                        className="shrink-0 text-xs"
                      >
                        {togglingId === u.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : u.is_active
                            ? <><UserX className="h-3 w-3" /> Nonaktifkan</>
                            : <><UserCheck className="h-3 w-3" /> Aktifkan</>
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
                        <TableHead>Nama</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Bergabung</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
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
                          <TableCell>
                            <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${u.is_active ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                              {u.is_active ? "Aktif" : "Nonaktif"}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(u.created_at), "dd MMM yyyy", { locale: idLocale })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={togglingId === u.id || u.role === "admin"}
                              onClick={() => toggleUser(u)}
                              title={u.role === "admin" ? "Tidak bisa mengubah status admin" : ""}
                            >
                              {togglingId === u.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : u.is_active ? (
                                <><UserX className="h-4 w-4" /> Nonaktifkan</>
                              ) : (
                                <><UserCheck className="h-4 w-4" /> Aktifkan</>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {users.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Belum ada pengguna terdaftar.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ══ TAB: RIWAYAT SCAN ══════════════════════════════════════ */}
        {activeTab === "history" && (
          <div className="animate-fade-up">
            <Card className="gradient-card border-border/40 shadow-soft">
              <CardHeader>
                <CardTitle className="font-display text-lg font-bold">
                  Semua Riwayat Scan
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({totalScans} entri)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>

                {/* Mobile */}
                <ul className="md:hidden divide-y divide-border/40">
                  {history.map(item => {
                    const u = userMap.get(item.user_id);
                    return (
                      <li key={item.id} className="flex items-center gap-3 py-3">
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="h-14 w-14 rounded-xl object-cover shrink-0" loading="lazy" />
                        ) : (
                          <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
                            <ImageOff className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{getDiseaseName(item.disease_key)}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {u?.full_name ?? "Pengguna"} · {format(new Date(item.scanned_at), "dd MMM HH:mm", { locale: idLocale })}
                          </p>
                          <p className="text-xs font-semibold text-primary-deep mt-0.5">
                            {Math.round(Number(item.confidence) * 100)}%
                          </p>
                        </div>
                        <button
                          onClick={() => setDeletingId(item.id)}
                          className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
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
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Pengguna</TableHead>
                        <TableHead>Gambar</TableHead>
                        <TableHead>Prediksi</TableHead>
                        <TableHead className="text-center">Confidence</TableHead>
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
                            <TableCell className="font-medium text-sm">
                              {u?.full_name ?? item.user_id.slice(0, 8) + "…"}
                            </TableCell>
                            <TableCell>
                              {item.image_url ? (
                                <img src={item.image_url} alt="" className="h-14 w-16 rounded-lg object-cover" loading="lazy" />
                              ) : (
                                <div className="h-14 w-16 flex items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                  <ImageOff className="h-5 w-5" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{getDiseaseName(item.disease_key)}</TableCell>
                            <TableCell className="text-center font-display font-bold text-primary-deep">
                              {Math.round(Number(item.confidence) * 100)}%
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeletingId(item.id)}
                                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" /> Hapus
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {history.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Belum ada riwayat scan.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ══ TAB: INFO PENYAKIT ══════════════════════════════════════ */}
        {activeTab === "diseases" && (
          <div className="animate-fade-up space-y-4">
            {diseases.length === 0 && (
              <div className="rounded-3xl border border-border/40 gradient-card p-10 text-center text-muted-foreground">
                Tidak ada data penyakit. Pastikan seed data sudah dijalankan di Supabase.
              </div>
            )}
            {diseases.map(d => (
              <Card key={d.key} className="gradient-card border-border/40 shadow-soft">
                <CardContent className="p-5 md:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full ${severityBadge[d.severity] ?? ""}`}>
                          {severityLabel[d.severity] ?? d.severity}
                        </span>
                        <code className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">{d.key}</code>
                      </div>
                      <h3 className="font-display text-lg font-bold">{d.name_id}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{d.description}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(d)}
                      className="shrink-0"
                    >
                      <Pencil className="h-4 w-4" /> Edit
                    </Button>
                  </div>

                  {/* Preview treatment & prevention chips */}
                  <div className="mt-4 grid sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1.5">Penanganan</p>
                      <ul className="space-y-1">
                        {(Array.isArray(d.treatment) ? d.treatment : []).slice(0, 2).map((t: string, i: number) => (
                          <li key={i} className="text-xs text-foreground/80 flex gap-1.5">
                            <Check className="h-3 w-3 text-primary shrink-0 mt-0.5" />{t}
                          </li>
                        ))}
                        {(Array.isArray(d.treatment) ? d.treatment : []).length > 2 && (
                          <li className="text-xs text-muted-foreground">+{(d.treatment as string[]).length - 2} lainnya…</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1.5">Pencegahan</p>
                      <ul className="space-y-1">
                        {(Array.isArray(d.prevention) ? d.prevention : []).slice(0, 2).map((p: string, i: number) => (
                          <li key={i} className="text-xs text-foreground/80 flex gap-1.5">
                            <Check className="h-3 w-3 text-primary shrink-0 mt-0.5" />{p}
                          </li>
                        ))}
                        {(Array.isArray(d.prevention) ? d.prevention : []).length > 2 && (
                          <li className="text-xs text-muted-foreground">+{(d.prevention as string[]).length - 2} lainnya…</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />

      {/* ══ MODAL EDIT PENYAKIT ══════════════════════════════════════ */}
      {editingDisease && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/30 backdrop-blur-sm py-8 px-4">
          <div className="gradient-card border border-border/40 shadow-elegant rounded-3xl w-full max-w-2xl animate-fade-up">

            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-border/40">
              <div>
                <h2 className="font-display text-xl font-bold">Edit Info Penyakit</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <code>{editingDisease.key}</code>
                </p>
              </div>
              <button
                onClick={() => setEditingDisease(null)}
                className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-5">

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nama (Indonesia)</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name_id ?? ""}
                    onChange={e => setEditForm(f => ({ ...f, name_id: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-severity">Tingkat Keparahan</Label>
                  <select
                    id="edit-severity"
                    value={editForm.severity ?? "none"}
                    onChange={e => setEditForm(f => ({ ...f, severity: e.target.value as any }))}
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="none">Aman (none)</option>
                    <option value="low">Ringan (low)</option>
                    <option value="medium">Sedang (medium)</option>
                    <option value="high">Berat (high)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-desc">Deskripsi</Label>
                <Textarea
                  id="edit-desc"
                  rows={3}
                  value={editForm.description ?? ""}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  className="rounded-xl resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-treatment">
                  Penanganan
                  <span className="ml-1 text-xs text-muted-foreground font-normal">(satu baris = satu poin)</span>
                </Label>
                <Textarea
                  id="edit-treatment"
                  rows={4}
                  value={arrToText(editForm.treatment)}
                  onChange={e => setEditForm(f => ({ ...f, treatment: e.target.value }))}
                  className="rounded-xl resize-none font-mono text-xs"
                  placeholder="Poin penanganan 1&#10;Poin penanganan 2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-prevention">
                  Pencegahan
                  <span className="ml-1 text-xs text-muted-foreground font-normal">(satu baris = satu poin)</span>
                </Label>
                <Textarea
                  id="edit-prevention"
                  rows={3}
                  value={arrToText(editForm.prevention)}
                  onChange={e => setEditForm(f => ({ ...f, prevention: e.target.value }))}
                  className="rounded-xl resize-none font-mono text-xs"
                  placeholder="Poin pencegahan 1&#10;Poin pencegahan 2"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border/40">
              <Button variant="outline" onClick={() => setEditingDisease(null)}>
                Batal
              </Button>
              <Button onClick={saveDisease} disabled={saving} variant="hero">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan Perubahan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══ CONFIRM DELETE ══════════════════════════════════════════ */}
      <ConfirmDialog
        open={Boolean(deletingId)}
        title="Hapus data scan?"
        desc="Data scan ini akan dihapus permanen dan tidak bisa dikembalikan."
        danger
        onConfirm={() => deletingId && deleteScan(deletingId)}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};

export default Dashboard; 