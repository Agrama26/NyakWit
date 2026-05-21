import { supabase, type ScanHistory } from '@/lib/supabase'

export function useScanHistory() {
  async function saveScan(data: {
    diseaseKey: string
    confidence: number
    allProbabilities: Record<string, number>
    imageFile?: File
  }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Harus login untuk menyimpan riwayat')

    let imageUrl: string | null = null

    // Upload gambar ke Storage jika ada
    if (data.imageFile) {
      const fileName = `${user.id}/${Date.now()}.jpg`
      const { data: upload, error } = await supabase.storage
        .from('scan-images')
        .upload(fileName, data.imageFile)
      
      if (!error && upload) {
        const { data: { publicUrl } } = supabase.storage
          .from('scan-images')
          .getPublicUrl(upload.path)
        imageUrl = publicUrl
      }
    }

    return supabase.from('scan_history').insert({
      user_id: user.id,
      disease_key: data.diseaseKey,
      confidence: data.confidence,
      all_probabilities: data.allProbabilities,
      image_url: imageUrl,
    })
  }

  async function getHistory(limit = 20): Promise<ScanHistory[]> {
    const { data } = await supabase
      .from('scan_history')
      .select('*')
      .order('scanned_at', { ascending: false })
      .limit(limit)
    return data ?? []
  }

  // Khusus admin: ambil semua history semua user
  async function getAllHistory(limit = 100) {
    const { data } = await supabase
      .from('scan_history')
      .select('*, users(email, full_name)')
      .order('scanned_at', { ascending: false })
      .limit(limit)
    return data ?? []
  }

  return { saveScan, getHistory, getAllHistory }
}