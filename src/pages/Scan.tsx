import { useRef, useState } from "react";
import {
  Camera, Upload, X, Loader2, AlertCircle,
  RefreshCcw, ShieldCheck, Wifi, WifiOff,
  Leaf, TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PredictionResponse {
  success: boolean;
  predicted: string;
  predicted_name: string;
  confidence: number;
  severity: "none" | "low" | "medium" | "high";
  description: string;
  treatment: string[];
  prevention: string[];
  probabilities: Record<string, number>;
  device_used: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// ─── Severity helpers ─────────────────────────────────────────────────────────
const SEVERITY_CONFIG: Record<
  string,
  { label: string; badge: string; icon: React.ReactNode }
> = {
  none: {
    label: "Sehat",
    badge: "bg-emerald-100 text-emerald-800",
    icon: <ShieldCheck className="h-4 w-4 text-emerald-600" />,
  },
  low: {
    label: "Ringan",
    badge: "bg-yellow-100 text-yellow-800",
    icon: <TriangleAlert className="h-4 w-4 text-yellow-600" />,
  },
  medium: {
    label: "Sedang",
    badge: "bg-orange-100 text-orange-800",
    icon: <TriangleAlert className="h-4 w-4 text-orange-600" />,
  },
  high: {
    label: "Berat",
    badge: "bg-red-100 text-red-800",
    icon: <TriangleAlert className="h-4 w-4 text-red-600" />,
  },
};

const severityConfig = (s?: string) =>
  SEVERITY_CONFIG[s ?? "none"] ?? SEVERITY_CONFIG["none"];

// Warna bar per kelas
const CLASS_COLORS: Record<string, string> = {
  Healthy              : "bg-emerald-500",
  Dryness              : "bg-amber-500",
  Fungal_Disease       : "bg-purple-500",
  Magnesium_Deficiency : "bg-blue-500",
  Scale_Insect         : "bg-rose-500",
};

const barColor = (key: string, isTop: boolean) =>
  isTop ? (CLASS_COLORS[key] ?? "bg-primary") : "bg-muted-foreground/30";

// ─── Simpan hasil scan ke Supabase ───────────────────────────────────────────
async function saveScanToHistory(
  data: PredictionResponse,
  imageFile: File | null
): Promise<void> {
  // Cek apakah user sedang login
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;

  // Kalau belum login, skip saja — tidak error
  if (!user) return;

  let imageUrl: string | null = null;

  // Upload gambar ke Supabase Storage jika ada
  if (imageFile) {
    try {
      const ext = imageFile.name.split(".").pop() ?? "jpg";
      const fileName = `${user.id}/${Date.now()}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("scan-images")
        .upload(fileName, imageFile, { upsert: false });

      if (uploadError) {
        // Storage mungkin belum dibuat — lanjut tanpa gambar
        console.warn("Upload gambar gagal (storage mungkin belum dibuat):", uploadError.message);
      } else if (uploadData) {
        const { data: urlData } = supabase.storage
          .from("scan-images")
          .getPublicUrl(uploadData.path);
        imageUrl = urlData.publicUrl;
      }
    } catch (err) {
      console.warn("Upload gambar error:", err);
    }
  }

  // Simpan ke tabel scan_history
  const { error: insertError } = await supabase
    .from("scan_history")
    .insert({
      user_id           : user.id,
      disease_key       : data.predicted,
      confidence        : data.confidence,
      all_probabilities : data.probabilities as Record<string, number>,
      image_url         : imageUrl,
    });

  if (insertError) {
    console.error("Gagal simpan riwayat:", insertError);
    // Lempar error agar bisa ditangani di caller
    throw new Error(insertError.message);
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────
const Scan = () => {
  const [file, setFile]         = useState<File | null>(null);
  const [preview, setPreview]   = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<PredictionResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── File handling ───────────────────────────────────────────────────
  const handleFile = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("File harus berupa gambar (JPG/PNG)");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Ukuran maksimal 10 MB");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setApiError(null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0] ?? null);
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setApiError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  // ── Predict via FastAPI + simpan ke Supabase ───────────────────────
  const predict = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setApiError(null);

    try {
      // 1. Kirim gambar ke FastAPI
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        body  : formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail ?? `Server error: ${response.status}`);
      }

      const data: PredictionResponse = await response.json();

      if (!data.success) {
        throw new Error("Prediksi gagal. Coba lagi.");
      }

      // 2. Tampilkan hasil
      setResult(data);
      toast.success(`Terdeteksi: ${data.predicted_name}`);

      // 3. Simpan ke Supabase (background — tidak blokir UI)
      saveScanToHistory(data, file)
        .then(() => {
          // Berhasil simpan — beri notifikasi kecil
          toast.success("Riwayat scan tersimpan.", { duration: 2000 });
        })
        .catch((err) => {
          // Gagal simpan — beri warning tapi jangan blokir user
          console.error("Simpan riwayat gagal:", err);
          toast.warning("Hasil tidak tersimpan ke riwayat. Coba login ulang.", {
            duration: 4000,
          });
        });

    } catch (e: any) {
      const msg: string =
        e.message?.includes("fetch")
          ? "Tidak dapat terhubung ke server. Pastikan backend berjalan di port 8000."
          : (e.message ?? "Terjadi kesalahan. Coba lagi.");
      setApiError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Sorted probabilities ────────────────────────────────────────────
  const sortedProbs = result
    ? Object.entries(result.probabilities).sort((a, b) => b[1] - a[1])
    : [];

  const sev = result ? severityConfig(result.severity) : null;

  // ──────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="container py-10 md:py-14 flex-1">
        <div className="max-w-3xl mx-auto">

          {/* ── Header ─────────────────────────────────────────────── */}
          <div className="text-center mb-8 animate-fade-up">
            <div className="inline-block px-3 py-1 rounded-full bg-accent text-xs font-semibold mb-4">
              SCAN DAUN
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
              Unggah foto daun untuk dianalisa
            </h1>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Pastikan daun terlihat jelas, pencahayaan cukup, dan tidak buram
              untuk hasil terbaik.
            </p>
          </div>

          {/* ── API Status Badge ───────────────────────────────────── */}
          <ApiStatusBadge apiBase={API_BASE} />

          {/* ── Upload Zone ────────────────────────────────────────── */}
          {!preview && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="gradient-card rounded-3xl border-2 border-dashed border-border p-10 md:p-14 text-center transition-colors hover:border-primary/50"
            >
              <div className="mx-auto h-20 w-20 rounded-full gradient-leaf flex items-center justify-center mb-5 shadow-soft">
                <Upload className="h-9 w-9 text-primary-foreground" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">
                Tarik & lepas foto di sini
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                atau pilih dari perangkatmu (JPG/PNG, maks 10 MB)
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button onClick={() => inputRef.current?.click()} variant="hero">
                  <Upload className="h-4 w-4" />
                  Pilih dari Galeri
                </Button>
                <Button
                  variant="soft"
                  onClick={() => {
                    if (inputRef.current) {
                      inputRef.current.setAttribute("capture", "environment");
                      inputRef.current.click();
                    }
                  }}
                >
                  <Camera className="h-4 w-4" />
                  Ambil Foto
                </Button>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}

          {/* ── Preview + Predict ──────────────────────────────────── */}
          {preview && (
            <div className="gradient-card rounded-3xl border border-border/40 p-6 shadow-soft">

              {/* Gambar */}
              <div className="relative rounded-2xl overflow-hidden bg-muted">
                <img
                  src={preview}
                  alt="Preview daun"
                  className="w-full h-80 object-cover"
                />
                <button
                  onClick={reset}
                  className="absolute top-3 right-3 h-9 w-9 rounded-full bg-background/90 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
                  aria-label="Hapus"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Overlay loading */}
                {loading && (
                  <div className="absolute inset-0 bg-primary-deep/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 text-primary-foreground">
                    <div className="relative">
                      <div className="h-16 w-16 rounded-full border-4 border-primary-foreground/20 border-t-primary-foreground animate-spin" />
                      <Leaf className="absolute inset-0 m-auto h-6 w-6 text-primary-foreground animate-pulse" />
                    </div>
                    <p className="text-sm font-semibold tracking-wide">
                      Model ResNet-50 menganalisa…
                    </p>
                  </div>
                )}
              </div>

              {/* Tombol Analisa */}
              {!result && !loading && (
                <Button
                  onClick={predict}
                  variant="hero"
                  size="lg"
                  className="w-full mt-5"
                >
                  <Leaf className="h-5 w-5" />
                  Analisa Sekarang
                </Button>
              )}

              {/* Error state */}
              {apiError && !loading && (
                <div className="mt-5 flex items-start gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-sm">
                  <WifiOff className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-destructive">Gagal terhubung ke server</p>
                    <p className="text-muted-foreground mt-1">{apiError}</p>
                    <Button
                      onClick={predict}
                      variant="soft"
                      size="sm"
                      className="mt-3"
                    >
                      <RefreshCcw className="h-3.5 w-3.5" />
                      Coba Lagi
                    </Button>
                  </div>
                </div>
              )}

              {/* ── RESULT ─────────────────────────────────────────── */}
              {result && sev && (
                <div className="mt-6 animate-fade-up space-y-5">

                  {/* Header hasil */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {sev.icon}
                        <span className={`text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full ${sev.badge}`}>
                          {sev.label}
                        </span>
                        {result.device_used && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {result.device_used.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <h2 className="font-display text-2xl font-bold tracking-tight">
                        {result.predicted_name}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        {result.description}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-muted-foreground mb-1">Keyakinan</div>
                      <div className="font-display text-4xl font-bold text-primary-deep leading-none">
                        {Math.round(result.confidence * 100)}%
                      </div>
                    </div>
                  </div>

                  {/* Probability bars */}
                  <div className="rounded-2xl bg-background/60 border border-border/40 p-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Distribusi Probabilitas
                    </p>
                    {sortedProbs.map(([id, p]) => {
                      const isTop = id === result.predicted;
                      return (
                        <div key={id}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className={isTop ? "font-semibold" : "text-muted-foreground"}>
                              {id.replace(/_/g, " ")}
                            </span>
                            <span className={isTop ? "font-semibold text-primary-deep" : "text-muted-foreground"}>
                              {(p * 100).toFixed(2)}%
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${barColor(id, isTop)}`}
                              style={{ width: `${p * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Treatment */}
                  {result.treatment.length > 0 && (
                    <div className="rounded-2xl bg-accent/60 border border-border/40 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <ShieldCheck className="h-4 w-4 text-primary-deep" />
                        <h3 className="font-display font-bold">Rekomendasi Penanganan</h3>
                      </div>
                      <ul className="space-y-2">
                        {result.treatment.map((t, i) => (
                          <li key={i} className="flex gap-2.5 text-sm">
                            <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center shrink-0 mt-0.5 font-semibold">
                              {i + 1}
                            </span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Prevention */}
                  {result.prevention.length > 0 && (
                    <div className="rounded-2xl bg-muted/60 border border-border/40 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-display font-bold text-sm">Pencegahan</h3>
                      </div>
                      <ul className="space-y-1.5">
                        {result.prevention.map((p, i) => (
                          <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/60 shrink-0" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3 pt-1">
                    <Button onClick={reset} variant="soft">
                      <RefreshCcw className="h-4 w-4" />
                      Scan Lagi
                    </Button>
                    <Button asChild variant="hero">
                      <Link to="/ensiklopedia">Pelajari Selengkapnya</Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
};

// ─── API Status Badge (live health check) ────────────────────────────────────
const ApiStatusBadge = ({ apiBase }: { apiBase: string }) => {
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");

  // useEffect untuk health check — bukan useState
  useState(() => {
    fetch(`${apiBase}/`)
      .then((r) => setStatus(r.ok ? "online" : "offline"))
      .catch(() => setStatus("offline"));
  });

  if (status === "checking") return null;

  return (
    <div
      className={`mb-5 flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm border ${
        status === "online"
          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
          : "bg-amber-50 border-amber-200 text-amber-800"
      }`}
    >
      {status === "online" ? (
        <>
          <Wifi className="h-4 w-4 shrink-0" />
          <span>
            <strong>Model siap digunakan.</strong> ResNet-50 terhubung ke{" "}
            <code className="text-xs bg-black/5 px-1.5 py-0.5 rounded">{apiBase}</code>
          </span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            <strong>Backend tidak ditemukan.</strong> Jalankan{" "}
            <code className="text-xs bg-black/5 px-1.5 py-0.5 rounded">
              uvicorn main:app --port 8000
            </code>{" "}
            terlebih dahulu.
          </span>
        </>
      )}
    </div>
  );
};

export default Scan;