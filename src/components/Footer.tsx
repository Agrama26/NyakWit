import { Leaf } from "lucide-react";
import { Link } from "react-router-dom";

export const Footer = () => (
  <footer className="mt-24 border-t border-border/40 bg-accent/30">
    <div className="container py-12 grid gap-8 md:grid-cols-4">
      <div className="md:col-span-2">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-leaf">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold">Nyakwit</span>
        </Link>
        <p className="mt-3 text-sm text-muted-foreground max-w-md">
          Asisten cerdas untuk petani sawit. Deteksi dini penyakit daun kelapa
          sawit dengan teknologi visi komputer berbasis ResNet-50.
        </p>
      </div>

      <div>
        <h4 className="font-display font-semibold mb-3">Menu</h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><Link to="/" className="hover:text-foreground">Beranda</Link></li>
          <li><Link to="/scan" className="hover:text-foreground">Scan Daun</Link></li>
          <li><Link to="/ensiklopedia" className="hover:text-foreground">Ensiklopedia</Link></li>
        </ul>
      </div>

      <div>
        <h4 className="font-display font-semibold mb-3">Tentang</h4>
        <p className="text-sm text-muted-foreground">
          Proyek riset klasifikasi 5 kondisi daun sawit menggunakan deep learning.
        </p>
      </div>
    </div>
    <div className="border-t border-border/40">
      <div className="container py-4 text-xs text-muted-foreground text-center">
        © {new Date().getFullYear()} Nyakwit — Untuk petani sawit Indonesia.
      </div>
    </div>
  </footer>
);
