import { FileText, ShieldAlert } from 'lucide-react';
import DokumenProyekGenerator from '../components/DokumenProyekGenerator';

export default function SuratPage() {
  return <div className="space-y-5">
    <header>
      <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><FileText className="text-blue-700" />Surat & Dokumen Proyek</h1>
      <p className="mt-1 text-sm text-gray-500">Draf surat, kuitansi, perjanjian awal, SPK, berita acara dan surat pernyataan.</p>
    </header>
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="flex items-center gap-2 font-semibold"><ShieldAlert size={17} />Status hukum dan penyimpanan</p>
      <p className="mt-1">Dokumen yang dibuat merupakan DRAF untuk diperiksa oleh pihak berwenang. Dokumen ini tidak menggantikan akta notaris/PPAT, tidak ditandatangani secara elektronik, dan bukan bukti bahwa pembayaran benar terjadi. Simpan lampiran dan versi final di tempat yang dikelola; generator saat ini menggunakan penyimpanan browser/perangkat.</p>
    </div>
    <DokumenProyekGenerator />
  </div>;
}
