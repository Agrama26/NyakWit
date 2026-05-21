import { Link } from "react-router-dom";
import { ArrowRight, Camera, Leaf, ShieldCheck, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DISEASE_LIST } from "@/data/diseases";
import heroImg from "@/assets/hero-palm.jpg";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0">
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 gradient-soft" />
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary-glow/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-secondary/30 blur-3xl" />

        <div className="container py-16 md:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent border border-border/40 text-xs font-medium text-foreground/80 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-primary-deep" />
              Dilatih dengan 2.500+ foto daun lokal
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight text-balance">
              Diagnosa daun sawit{" "}
              <span className="text-primary-deep">dalam hitungan detik.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl text-balance">
              Nyakwit mengenali 5 kondisi daun kelapa sawit — sehat, kekeringan,
              jamur, kekurangan magnesium, dan kutu perisai — langsung dari
              foto kebunmu.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="lg">
                <Link to="/scan">
                  <Camera className="h-5 w-5" />
                  Scan Daun Sekarang
                </Link>
              </Button>
              <Button asChild variant="soft" size="lg">
                <Link to="/ensiklopedia">
                  Lihat Ensiklopedia
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              {[
                { v: "5", l: "Kelas penyakit" },
                { v: "2.5K+", l: "Data latih" },
                { v: "ResNet-50", l: "Arsitektur" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="font-display text-2xl font-bold text-primary-deep">{s.v}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative animate-fade-up animation-delay-150">
            <div className="relative rounded-[2rem] overflow-hidden shadow-elegant">
              <img
                src={heroImg}
                alt="Daun kelapa sawit segar dengan embun pagi"
                className="w-full h-[460px] object-cover"
                width={1536}
                height={1024}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary-deep/40 via-transparent to-transparent" />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-card rounded-2xl shadow-soft p-4 border border-border/40 max-w-[200px] animate-float">
              <div className="flex items-center gap-2 text-success">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-xs font-semibold">Daun Sehat</span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Confidence</div>
              <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-success animate-scan-pulse w-[92%]" />
              </div>
              <div className="mt-1 text-xs font-semibold">92%</div>
            </div>
          </div>
        </div>
      </section>

      {/* CARA PAKAI */}
      <section className="container py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-block px-3 py-1 rounded-full bg-accent text-xs font-semibold mb-4">
            CARA PAKAI
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
            Tiga langkah, hasil seketika
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Camera, t: "1. Foto daun", d: "Ambil foto daun langsung dari kebun atau pilih dari galeri ponselmu." },
            { icon: Upload, t: "2. Unggah", d: "Foto akan dikirim ke model ResNet-50 untuk dianalisa." },
            { icon: Leaf, t: "3. Dapatkan hasil", d: "Lihat prediksi penyakit, tingkat keyakinan, dan rekomendasi penanganan." },
          ].map((step, i) => (
            <div
              key={i}
              className="gradient-card rounded-3xl p-8 border border-border/40 shadow-soft hover:shadow-elegant transition-all hover:-translate-y-1"
            >
              <div className="h-14 w-14 rounded-2xl gradient-leaf flex items-center justify-center mb-5 shadow-soft">
                <step.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">{step.t}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5 KELAS */}
      <section className="container py-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <div className="inline-block px-3 py-1 rounded-full bg-accent text-xs font-semibold mb-4">
              KELAS YANG DIKENALI
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight max-w-xl">
              Lima kondisi daun yang bisa diidentifikasi
            </h2>
          </div>
          <Button asChild variant="soft">
            <Link to="/ensiklopedia">
              Lihat detail lengkap
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {DISEASE_LIST.map((d) => (
            <Link
              key={d.id}
              to="/ensiklopedia"
              className="group rounded-2xl overflow-hidden bg-card border border-border/40 shadow-soft hover:shadow-elegant transition-all hover:-translate-y-1"
            >
              <div className="aspect-square overflow-hidden bg-muted">
                <img
                  src={d.image}
                  alt={d.name}
                  loading="lazy"
                  width={400}
                  height={400}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4">
                <span className={`inline-block text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full ${d.accent}`}>
                  {d.severity === "none" ? "Aman" : d.severity === "low" ? "Ringan" : d.severity === "medium" ? "Sedang" : "Berat"}
                </span>
                <h3 className="font-display font-bold mt-2 leading-tight">{d.shortName}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-20">
        <div className="relative overflow-hidden rounded-[2.5rem] gradient-hero p-10 md:p-16 text-primary-foreground shadow-elegant">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-primary-glow/30 blur-3xl" />
          <div className="relative max-w-2xl">
            <h2 className="font-display text-3xl md:text-5xl font-bold leading-tight">
              Siap menyelamatkan kebunmu?
            </h2>
            <p className="mt-4 text-primary-foreground/80 text-lg">
              Lakukan deteksi dini sebelum penyakit menyebar. Cukup satu foto.
            </p>
            <Button asChild variant="soft" size="lg" className="mt-8">
              <Link to="/scan">
                <Camera className="h-5 w-5" />
                Mulai Scan Gratis
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
