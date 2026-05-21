import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DISEASE_LIST } from "@/data/diseases";
import {
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const severityLabel = (s: string) =>
  s === "none"
    ? "Aman"
    : s === "medium"
    ? "Sedang"
    : s === "low"
    ? "Ringan"
    : "Berat";

const Ensiklopedia = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    skipSnaps: false,
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi]
  );

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0">
      <Header />

      <main className="container py-10 md:py-14 flex-1">
        {/* ── Header ── */}
        <div className="text-center mb-10 animate-fade-up max-w-2xl mx-auto">
          <div className="inline-block px-3 py-1 rounded-full bg-accent text-xs font-semibold mb-4">
            ENSIKLOPEDIA
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
            Pelajari 5 kondisi daun sawit
          </h1>
          <p className="mt-4 text-muted-foreground text-base md:text-lg">
            Panduan lengkap gejala, penyebab, cara mengatasi, dan pencegahan
            setiap kondisi yang dapat dideteksi Nyakwit.
          </p>
        </div>

        {/* ── Dot Nav ── */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {DISEASE_LIST.map((d, i) => (
            <button
              key={d.id}
              onClick={() => scrollTo(i)}
              aria-label={`Ke ${d.shortName}`}
              className={cn(
                "transition-all duration-300 rounded-full",
                i === selectedIndex
                  ? "w-8 h-2.5 bg-primary-deep"
                  : "w-2.5 h-2.5 bg-border hover:bg-muted-foreground"
              )}
            />
          ))}
        </div>

        {/* ── Carousel ── */}
        <div className="relative">
          {/* Prev button */}
          <button
            onClick={scrollPrev}
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 z-10 -translate-x-2 md:-translate-x-5",
              "h-10 w-10 md:h-12 md:w-12 rounded-full gradient-card border border-border/40 shadow-soft",
              "flex items-center justify-center hover:shadow-elegant transition-all hover:scale-105",
              !canScrollPrev && "opacity-40 cursor-not-allowed"
            )}
            aria-label="Sebelumnya"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>

          {/* Carousel viewport */}
          <div className="overflow-hidden mx-6 md:mx-10" ref={emblaRef}>
            <div className="flex gap-4">
              {DISEASE_LIST.map((d, idx) => (
                <div
                  key={d.id}
                  className="flex-[0_0_100%] md:flex-[0_0_80%] lg:flex-[0_0_70%] min-w-0"
                >
                  <article
                    className={cn(
                      "gradient-card rounded-3xl overflow-hidden border shadow-soft transition-all duration-500",
                      idx === selectedIndex
                        ? "border-primary/40 shadow-elegant scale-[1.01]"
                        : "border-border/40 opacity-80"
                    )}
                  >
                    <div className="grid md:grid-cols-5">
                      {/* Image */}
                      <div className="md:col-span-2 aspect-[4/3] md:aspect-auto bg-muted overflow-hidden">
                        <img
                          src={d.image}
                          alt={d.name}
                          loading="lazy"
                          width={768}
                          height={768}
                          className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                        />
                      </div>

                      {/* Content */}
                      <div className="md:col-span-3 p-6 md:p-8 lg:p-10">
                        {/* Badge + counter */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "text-[10px] uppercase tracking-wide font-bold px-2.5 py-1 rounded-full",
                                d.accent
                              )}
                            >
                              {severityLabel(d.severity)}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground font-medium">
                            {idx + 1} / {DISEASE_LIST.length}
                          </span>
                        </div>

                        <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
                          {d.name}
                        </h2>
                        <p className="mt-1.5 text-muted-foreground text-sm md:text-base">
                          {d.tagline}
                        </p>

                        {/* Info grid */}
                        <div className="grid sm:grid-cols-2 gap-5 mt-6">
                          <Section
                            icon={<AlertTriangle className="h-4 w-4" />}
                            title="Gejala"
                            items={d.symptoms}
                          />
                          <Section
                            icon={<Stethoscope className="h-4 w-4" />}
                            title="Penyebab"
                            items={d.causes}
                          />
                          <Section
                            icon={<CheckCircle2 className="h-4 w-4" />}
                            title="Penanganan"
                            items={d.treatment}
                          />
                          <Section
                            icon={<Shield className="h-4 w-4" />}
                            title="Pencegahan"
                            items={d.prevention}
                          />
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
              ))}
            </div>
          </div>

          {/* Next button */}
          <button
            onClick={scrollNext}
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 z-10 translate-x-2 md:translate-x-5",
              "h-10 w-10 md:h-12 md:w-12 rounded-full gradient-card border border-border/40 shadow-soft",
              "flex items-center justify-center hover:shadow-elegant transition-all hover:scale-105",
              !canScrollNext && "opacity-40 cursor-not-allowed"
            )}
            aria-label="Berikutnya"
          >
            <ChevronRight className="h-5 w-5 text-foreground" />
          </button>
        </div>

        {/* ── Thumbnail nav ── */}
        <div className="flex gap-3 justify-center mt-8 flex-wrap">
          {DISEASE_LIST.map((d, i) => (
            <button
              key={d.id}
              onClick={() => scrollTo(i)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all",
                i === selectedIndex
                  ? "border-primary/50 bg-accent text-foreground shadow-soft"
                  : "border-border/40 bg-card text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  d.severity === "none"
                    ? "bg-emerald-500"
                    : d.severity === "low"
                    ? "bg-yellow-500"
                    : d.severity === "medium"
                    ? "bg-orange-500"
                    : "bg-red-500"
                )}
              />
              {d.shortName}
            </button>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

const Section = ({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) => (
  <div>
    <div className="flex items-center gap-2 mb-2 text-primary-deep">
      {icon}
      <h3 className="font-display font-bold text-xs uppercase tracking-wide">
        {title}
      </h3>
    </div>
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="text-sm text-foreground/80 flex gap-2">
          <span className="mt-1.5 h-1 w-1 rounded-full bg-primary-deep shrink-0" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default Ensiklopedia;