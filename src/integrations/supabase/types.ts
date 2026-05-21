// Tipe manual untuk tabel-tabel Supabase Nyakwit
// Disinkronkan dengan skema SQL terbaru

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─── Tipe per tabel ──────────────────────────────────────────────────────────

export interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null; 
  role: 'user' | 'admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiseaseRow {
  key: string; // "Healthy", "Dryness", dll
  name_id: string;
  severity: 'none' | 'low' | 'medium' | 'high'; // Sesuaikan dengan standar SQL sebelumnya
  description: string | null;
  treatment: string[] | Json; // Karena di SQL menggunakan JSONB (array string)
  prevention: string[] | Json; // Karena di SQL menggunakan JSONB (array string)
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScanHistoryRow {
  id: string;
  user_id: string;
  disease_key: string; // Diubah dari predicted_disease agar sesuai REFERENCES diseases(key)
  confidence: number;
  all_probabilities: Json;
  image_url: string | null;
  scanned_at: string; // Diubah dari created_at agar sesuai kolom SQL: scanned_at
}

// ─── Helper generic Tables<T> ───────────────────────────────────────────────

export type Tables<T extends keyof TableMap> = TableMap[T];

interface TableMap {
  users: UserRow;
  diseases: DiseaseRow; // Tambahkan tabel diseases agar bisa dipanggil Tables<"diseases">
  scan_history: ScanHistoryRow;
}

// Tambahan Tipe untuk Insert (biasanya ID dan Timestamp bersifat opsional saat input)
export type UserInsert = Partial<UserRow> & Pick<UserRow, 'id' | 'email'>;
export type ScanInsert = Omit<ScanHistoryRow, 'id' | 'scanned_at'>;