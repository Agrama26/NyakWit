import healthyImg from "@/assets/disease-healthy.jpg";
import drynessImg from "@/assets/disease-dryness.jpg";
import fungalImg from "@/assets/disease-fungal.jpg";
import magnesiumImg from "@/assets/disease-magnesium.jpg";
import scaleImg from "@/assets/disease-scale.jpg";

export type DiseaseId =
  | "healthy"
  | "dryness"
  | "fungal_disease"
  | "magnesium_deficiency"
  | "scale_insect";

export interface Disease {
  id: DiseaseId;
  name: string;
  shortName: string;
  image: string;
  severity: "none" | "low" | "medium" | "high";
  tagline: string;
  symptoms: string[];
  causes: string[];
  treatment: string[];
  prevention: string[];
  accent: string; // tailwind color utility for badge
}

export const DISEASES: Record<DiseaseId, Disease> = {
  healthy: {
    id: "healthy",
    name: "Daun Sehat",
    shortName: "Sehat",
    image: healthyImg,
    severity: "none",
    tagline: "Daun dalam kondisi prima — tidak ada gejala penyakit.",
    symptoms: [
      "Warna hijau merata dan cerah",
      "Permukaan daun mulus tanpa bercak",
      "Tulang daun simetris dan kokoh",
      "Tidak ada serangga atau lendir",
    ],
    causes: [
      "Nutrisi tanah seimbang",
      "Penyiraman & drainase baik",
      "Tidak ada serangan hama/penyakit",
    ],
    treatment: ["Lanjutkan praktik perawatan saat ini."],
    prevention: [
      "Pemupukan rutin sesuai jadwal",
      "Pemeriksaan kebun mingguan",
      "Jaga sanitasi pelepah",
    ],
    accent: "bg-success/15 text-success",
  },
  dryness: {
    id: "dryness",
    name: "Kekeringan (Dryness)",
    shortName: "Kekeringan",
    image: drynessImg,
    severity: "medium",
    tagline: "Daun kehilangan air — ujung mengering, menggulung, dan rapuh.",
    symptoms: [
      "Ujung & tepi daun cokelat kering",
      "Daun menggulung ke dalam",
      "Tekstur rapuh dan mudah patah",
      "Pertumbuhan tunas melambat",
    ],
    causes: [
      "Curah hujan rendah berkepanjangan",
      "Drainase tanah berlebih (tanah berpasir)",
      "Akar dangkal / kerusakan akar",
    ],
    treatment: [
      "Tingkatkan frekuensi penyiraman pagi & sore",
      "Aplikasikan mulsa pelepah di sekitar batang",
      "Pangkas pelepah yang kering parah",
    ],
    prevention: [
      "Buat sistem irigasi tetes",
      "Tanam tanaman penutup tanah",
      "Pantau kelembapan tanah berkala",
    ],
    accent: "bg-warning/15 text-warning",
  },
  fungal_disease: {
    id: "fungal_disease",
    name: "Penyakit Jamur (Fungal)",
    shortName: "Jamur",
    image: fungalImg,
    severity: "high",
    tagline: "Infeksi jamur — bercak gelap menyebar dan dapat membunuh jaringan daun.",
    symptoms: [
      "Bercak hitam/cokelat berlingkaran kuning",
      "Lesi membesar dan menyatu",
      "Daun layu dari bagian bercak",
      "Spora hitam pada permukaan daun",
    ],
    causes: [
      "Kelembapan udara tinggi",
      "Sirkulasi udara buruk antar pohon",
      "Luka mekanis sebagai pintu masuk jamur",
    ],
    treatment: [
      "Semprot fungisida berbahan aktif mancozeb / propineb",
      "Buang dan bakar pelepah terinfeksi",
      "Hindari penyemprotan air pada daun di sore hari",
    ],
    prevention: [
      "Atur jarak tanam ideal (9 m segitiga)",
      "Pruning rutin pelepah bawah",
      "Sanitasi alat potong dengan disinfektan",
    ],
    accent: "bg-destructive/15 text-destructive",
  },
  magnesium_deficiency: {
    id: "magnesium_deficiency",
    name: "Defisiensi Magnesium",
    shortName: "Mg Rendah",
    image: magnesiumImg,
    severity: "medium",
    tagline: "Kekurangan magnesium — daun tua menguning sementara tulang daun tetap hijau.",
    symptoms: [
      "Daun tua menguning di antara tulang daun",
      "Pelepah bawah lebih dulu terkena",
      "Pertumbuhan buah berkurang",
      "Tulang daun tetap hijau (interveinal chlorosis)",
    ],
    causes: [
      "Tanah masam (pH rendah)",
      "Kelebihan kalium menghambat serapan Mg",
      "Curah hujan tinggi mencuci Mg",
    ],
    treatment: [
      "Aplikasi kieserit (MgSO₄) 1.5–3 kg/pohon/tahun",
      "Semprot daun dengan larutan MgSO₄ 2%",
      "Koreksi pH tanah dengan dolomit",
    ],
    prevention: [
      "Analisis daun (LSU) tiap 6 bulan",
      "Imbangkan rasio K:Mg dalam pemupukan",
      "Gunakan dolomit saat penanaman",
    ],
    accent: "bg-warning/15 text-warning",
  },
  scale_insect: {
    id: "scale_insect",
    name: "Kutu Perisai (Scale Insect)",
    shortName: "Kutu Perisai",
    image: scaleImg,
    severity: "high",
    tagline: "Serangan hama kutu perisai — menghisap cairan daun & melemahkan pohon.",
    symptoms: [
      "Bintik putih/cokelat menempel di daun",
      "Cairan lengket (embun madu) di permukaan",
      "Daun menguning dan mengkerut",
      "Pertumbuhan jamur jelaga hitam",
    ],
    causes: [
      "Iklim panas & kering memicu populasi",
      "Predator alami berkurang",
      "Pohon stress / kekurangan nutrisi",
    ],
    treatment: [
      "Semprot insektisida sistemik (imidakloprid)",
      "Aplikasi minyak hortikultura pada daun",
      "Lepas predator alami: Coccinellidae (kepik)",
    ],
    prevention: [
      "Pemantauan rutin pelepah muda",
      "Jaga keanekaragaman vegetasi sekitar",
      "Hindari penggunaan insektisida spektrum luas",
    ],
    accent: "bg-destructive/15 text-destructive",
  },
};

export const DISEASE_LIST: Disease[] = [
  DISEASES.healthy,
  DISEASES.dryness,
  DISEASES.fungal_disease,
  DISEASES.magnesium_deficiency,
  DISEASES.scale_insect,
];

/**
 * MOCK PREDICTION
 * Replace this function with a real fetch() call to your FastAPI / HF Space endpoint
 * once your ResNet-50 model is deployed.
 *
 * Example real implementation:
 *   const fd = new FormData(); fd.append("file", file);
 *   const res = await fetch("https://your-space.hf.space/predict", { method: "POST", body: fd });
 *   return res.json();
 */
export interface PredictionResult {
  predicted: DiseaseId;
  confidence: number; // 0..1
  probabilities: Record<DiseaseId, number>;
  isMock: true;
}

export async function mockPredict(_file: File): Promise<PredictionResult> {
  // Simulated network latency
  await new Promise((r) => setTimeout(r, 1400));

  // Generate plausible probabilities — pick a "winner" with high confidence
  const ids = DISEASE_LIST.map((d) => d.id);
  const winner = ids[Math.floor(Math.random() * ids.length)];
  const winnerProb = 0.62 + Math.random() * 0.32; // 62–94%
  let remaining = 1 - winnerProb;
  const others = ids.filter((id) => id !== winner);
  const probs = {} as Record<DiseaseId, number>;
  probs[winner] = winnerProb;
  others.forEach((id, idx) => {
    if (idx === others.length - 1) {
      probs[id] = remaining;
    } else {
      const slice = remaining * (0.2 + Math.random() * 0.5);
      probs[id] = slice;
      remaining -= slice;
    }
  });

  return {
    predicted: winner,
    confidence: winnerProb,
    probabilities: probs,
    isMock: true,
  };
}
