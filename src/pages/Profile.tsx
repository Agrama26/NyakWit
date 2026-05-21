import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { CalendarDays, History, Loader2, Mail, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { DISEASES, type DiseaseId } from "@/data/diseases";
import { toast } from "sonner";

type ProfileRow = Tables<"users">;
type ScanHistory = Tables<"scan_history">;

const getDiseaseName = (diseaseId: string) =>
  DISEASES[diseaseId as DiseaseId]?.name ?? diseaseId;

const getInitials = (name?: string | null, email?: string | null) => {
  const source = (name ?? email ?? "U").trim();
  const parts = source.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "U";
};

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [history, setHistory] = useState<ScanHistory[]>([]);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;

        if (!mounted) return;
        setAuthed(Boolean(user));

        if (!user) {
          setLoading(false);
          return;
        }
        setEmail(user.email ?? null);

        // Query profile — select kolom eksplisit untuk hindari error kolom tidak ada
        const { data: profileData, error: profileError } = await supabase
          .from("users")
          .select("id, email, full_name, role, is_active, created_at, updated_at, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Profile fetch error:", profileError.message);
          // Coba tanpa avatar_url kalau kolom belum ada
          const { data: profileDataFallback } = await supabase
            .from("users")
            .select("id, email, full_name, role, is_active, created_at, updated_at")
            .eq("id", user.id)
            .maybeSingle();
          if (mounted) setProfile(profileDataFallback as ProfileRow ?? null);
        } else {
          if (mounted) setProfile(profileData as ProfileRow ?? null);
        }

        // Query scan history milik user ini
        const { data: historyData, error: historyError } = await supabase
          .from("scan_history")
          .select("*")
          .eq("user_id", user.id)
          .order("scanned_at", { ascending: false });

        if (historyError) {
          console.error("History fetch error:", historyError.message);
          toast.error("Gagal memuat riwayat scan.");
        }

        if (mounted) setHistory(historyData ?? []);
      } catch (err: any) {
        console.error("Profile load exception:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  const totalScans = history.length;
  const lastScan = history[0];
  const topDisease = useMemo(() => {
    if (!history.length) return null;
    const counts = history.reduce<Record<string, number>>((acc, item) => {
      acc[item.disease_key] = (acc[item.disease_key] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }, [history]);

  const isAdmin = profile?.role === "admin";
  const displayName = profile?.full_name ?? email?.split("@")[0] ?? "Pengguna";

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0">
      <Header />
      <main className="container py-10 md:py-14 flex-1">
        <div className="mb-8 animate-fade-up">
          <div className="inline-block px-3 py-1 rounded-full bg-accent text-xs font-semibold mb-4">
            PROFIL
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
            Profil singkat
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Ringkasan akun dan aktivitas scan penyakit daun.
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-80 items-center justify-center rounded-3xl border border-border/40 gradient-card">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Memuat profil...</span>
            </div>
          </div>
        ) : !authed ? (
          <div className="rounded-3xl border border-border/40 gradient-card p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent">
              <ShieldAlert className="h-7 w-7 text-primary-deep" />
            </div>
            <h2 className="font-display text-2xl font-bold">Login diperlukan</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Login untuk melihat profil dan ringkasan riwayat scan.
            </p>
            <Button asChild variant="hero" className="mt-6">
              <Link to="/auth">Login sekarang</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Kartu profil */}
            <Card className="gradient-card border-border/40 shadow-soft lg:col-span-1">
              <CardContent className="flex flex-col items-center text-center p-8">
                <Avatar className="h-24 w-24 mb-4 ring-4 ring-accent">
                  <AvatarImage src={(profile as any)?.avatar_url ?? undefined} alt={displayName} />
                  <AvatarFallback className="font-display text-2xl">
                    {getInitials(profile?.full_name, email)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="font-display text-2xl font-bold">{displayName}</h2>
                {email && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {email}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {isAdmin ? (
                    <Badge className="gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" /> Admin
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Pengguna</Badge>
                  )}
                </div>
                {profile?.created_at && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Bergabung{" "}
                    {format(new Date(profile.created_at), "dd MMM yyyy", { locale: idLocale })}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Stats + history */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="gradient-card border-border/40 shadow-soft">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <History className="h-4 w-4" /> Total Scan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="font-display text-3xl font-bold">{totalScans}</div>
                  </CardContent>
                </Card>
                <Card className="gradient-card border-border/40 shadow-soft">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Sparkles className="h-4 w-4" /> Terbanyak
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="font-display text-lg font-bold">
                      {topDisease ? getDiseaseName(topDisease) : "-"}
                    </div>
                  </CardContent>
                </Card>
                <Card className="gradient-card border-border/40 shadow-soft">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <CalendarDays className="h-4 w-4" /> Terakhir
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="font-display text-lg font-bold">
                      {lastScan
                        ? format(new Date(lastScan.scanned_at), "dd MMM yyyy", { locale: idLocale })
                        : "-"}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Riwayat terbaru */}
              <Card className="gradient-card border-border/40 shadow-soft">
                <CardHeader>
                  <CardTitle className="text-lg">Riwayat scan terbaru</CardTitle>
                </CardHeader>
                <CardContent>
                  {history.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Belum ada scan.{" "}
                      <Link to="/scan" className="text-primary underline">
                        Mulai scan pertama
                      </Link>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border/40">
                      {history.slice(0, 5).map((item) => (
                        <li key={item.id} className="flex items-center gap-4 py-3">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={getDiseaseName(item.disease_key)}
                              className="h-12 w-14 rounded-lg object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-12 w-14 rounded-lg bg-muted" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {getDiseaseName(item.disease_key)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(item.scanned_at), "dd MMM yyyy, HH:mm", {
                                locale: idLocale,
                              })}
                            </p>
                          </div>
                          <div className="font-display text-base font-bold text-primary-deep">
                            {Math.round(Number(item.confidence) * 100)}%
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-4 flex justify-end">
                    <Button asChild variant="outline" size="sm">
                      <Link to="/history">Lihat semua riwayat</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Profile;