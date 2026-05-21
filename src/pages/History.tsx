import { useEffect, useMemo, useState } from "react";
import { CalendarDays, History as HistoryIcon, ImageOff, Loader2, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DISEASES, type DiseaseId } from "@/data/diseases";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

type ScanHistory = Tables<"scan_history">;

const formatConfidence = (confidence: number) =>
  `${Math.round(Number(confidence) * 100)}%`;

// disease_key dari DB (contoh: "Fungal_Disease") → nama tampilan
const getDiseaseName = (key: string) =>
  DISEASES[key as DiseaseId]?.name ?? key.replace(/_/g, " ");

const History = () => {
  const [loading, setLoading]               = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [history, setHistory]               = useState<ScanHistory[]>([]);
  const [dbError, setDbError]               = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadHistory = async () => {
      setLoading(true);
      setDbError(null);

      // 1. Cek Sesi User
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!mounted) return;

      if (!session) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);

      const { data, error } = await supabase
        .from("scan_history")
        .select("*") 
        .eq("user_id", session.user.id)
        .order("scanned_at", { ascending: false });

      if (!mounted) return;

      if (error) {
        console.error("Supabase Error:", error);
        setDbError(error.message);
        toast.error(`Gagal memuat: ${error.message}`);
      } else {
        setHistory(data || []);
      }
      setLoading(false);
    };

    loadHistory();
    return () => { mounted = false; };
  }, []);

  const totalScans = history.length;
  const latestScan = history[0];

  const mostCommonDisease = useMemo(() => {
    if (!history.length) return null;
    const counts = history.reduce<Record<string, number>>((acc, item) => {
      acc[item.disease_key] = (acc[item.disease_key] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }, [history]);

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0">
      <Header />

      <main className="container py-8 md:py-14 flex-1">
        <div className="mb-6 md:mb-8 animate-fade-up">
          <div className="inline-block px-3 py-1 rounded-full bg-accent text-xs font-semibold mb-3">
            RIWAYAT
          </div>
          <h1 className="font-display text-2xl md:text-4xl font-bold tracking-tight">
            Riwayat scan kamu
          </h1>
          <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-2xl">
            Semua hasil scan penyakit daun yang pernah kamu lakukan tersimpan di sini.
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-60 items-center justify-center rounded-3xl border border-border/40 gradient-card">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Memuat riwayat scan...</span>
            </div>
          </div>

        ) : !isAuthenticated ? (
          <div className="rounded-3xl border border-border/40 gradient-card p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent">
              <ShieldAlert className="h-7 w-7 text-primary-deep" />
            </div>
            <h2 className="font-display text-2xl font-bold">Login diperlukan</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Login untuk melihat riwayat scan pribadi kamu.
            </p>
            <Button asChild variant="hero" className="mt-6">
              <Link to="/auth">Login sekarang</Link>
            </Button>
          </div>

        ) : dbError ? (
          /* Tampilkan pesan error spesifik untuk debugging */
          <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-8 text-center">
            <p className="font-semibold text-destructive mb-2">Gagal memuat riwayat</p>
            <p className="text-sm text-muted-foreground font-mono">{dbError}</p>
            <p className="mt-4 text-xs text-muted-foreground">
              Pastikan tabel scan_history sudah punya RLS policy yang benar dan kolom{" "}
              <code className="bg-muted px-1 rounded">scanned_at</code> ada di database.
            </p>
          </div>

        ) : (
          <div className="space-y-5 md:space-y-6">
            {/* Stat cards */}
            <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-3">
              <Card className="gradient-card border-border/40 shadow-soft">
                <CardHeader className="pb-2 md:pb-3">
                  <CardTitle className="flex items-center gap-2 text-xs md:text-sm font-medium text-muted-foreground">
                    <HistoryIcon className="h-4 w-4" /> Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-display text-2xl md:text-3xl font-bold">{totalScans}</div>
                </CardContent>
              </Card>

              <Card className="gradient-card border-border/40 shadow-soft">
                <CardHeader className="pb-2 md:pb-3">
                  <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                    Terbanyak
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-display text-base md:text-xl font-bold truncate">
                    {mostCommonDisease ? getDiseaseName(mostCommonDisease) : "Belum ada"}
                  </div>
                </CardContent>
              </Card>

              <Card className="gradient-card border-border/40 shadow-soft col-span-2 md:col-span-1">
                <CardHeader className="pb-2 md:pb-3">
                  <CardTitle className="flex items-center gap-2 text-xs md:text-sm font-medium text-muted-foreground">
                    <CalendarDays className="h-4 w-4" /> Terakhir
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-display text-base md:text-xl font-bold">
                    {latestScan
                      ? format(new Date(latestScan.scanned_at), "dd MMM yyyy", { locale: id })
                      : "Belum ada"}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabel riwayat */}
            <div className="rounded-3xl border border-border/40 gradient-card p-3 md:p-6 shadow-soft">
              {history.length === 0 ? (
                <div className="py-12 text-center">
                  <h2 className="font-display text-xl md:text-2xl font-bold">Belum ada riwayat</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Mulai scan daun pertama untuk menyimpan hasilnya di sini.
                  </p>
                  <Button asChild variant="hero" className="mt-6">
                    <Link to="/scan">Mulai Scan</Link>
                  </Button>
                </div>
              ) : (
                <>
                  {/* Mobile */}
                  <ul className="md:hidden divide-y divide-border/40">
                    {history.map((item) => (
                      <li key={item.id} className="flex items-center gap-3 py-3">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={getDiseaseName(item.disease_key)}
                            className="h-16 w-16 rounded-xl object-cover shrink-0"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center shrink-0">
                            <ImageOff className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {getDiseaseName(item.disease_key)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(item.scanned_at), "dd MMM yyyy, HH:mm", { locale: id })}
                          </p>
                        </div>
                        <div className="font-display text-lg font-bold text-primary-deep shrink-0">
                          {formatConfidence(item.confidence)}
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* Desktop */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Gambar</TableHead>
                          <TableHead>Prediksi</TableHead>
                          <TableHead className="text-right">Confidence</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="min-w-36 text-muted-foreground">
                              {format(new Date(item.scanned_at), "dd MMM yyyy, HH:mm", { locale: id })}
                            </TableCell>
                            <TableCell>
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={getDiseaseName(item.disease_key)}
                                  className="h-16 w-20 rounded-lg object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="flex h-16 w-20 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                  <ImageOff className="h-5 w-5" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {getDiseaseName(item.disease_key)}
                            </TableCell>
                            <TableCell className="text-right font-display text-lg font-bold text-primary-deep">
                              {formatConfidence(item.confidence)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default History;