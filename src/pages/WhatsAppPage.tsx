import { useState } from 'react';
import { useAppContext } from '../store';
import { formatRupiah } from '../data';
import { WhatsAppLog } from '../types';
import { MessageCircle, Send, Bot, User, CheckCircle, Clock, XCircle, Smartphone } from 'lucide-react';

export default function WhatsAppPage() {
  const { state, dispatch } = useAppContext();
  const [showCompose, setShowCompose] = useState(false);
  const [newMessage, setNewMessage] = useState({ nomor: '', pesan: '' });
  const [sending, setSending] = useState(false);

  const totalMessages = state.whatsapp.length;
  const inputTransaksi = state.whatsapp.filter(w => w.tipe === 'Input_Transaksi');
  const reminders = state.whatsapp.filter(w => w.tipe === 'Reminder');

  const tipeColor = (t: string) => {
    switch (t) { case 'Input_Transaksi': return 'bg-blue-100 text-blue-700'; case 'Konfirmasi': return 'bg-emerald-100 text-emerald-700'; case 'Laporan': return 'bg-purple-100 text-purple-700'; case 'Reminder': return 'bg-amber-100 text-amber-700'; default: return 'bg-gray-100 text-gray-700'; }
  };

  const simulateAutoReply = () => {
    setSending(true);
    setTimeout(() => {
      const newId = `WA-${String(state.whatsapp.length + 1).padStart(3, '0')}`;
      const autoResponses = [
        'Terima kasih. Data tercatat di sistem. Invoice akan dibuat otomatis.',
        'Pembayaran diterima. Saldo updated. Bukti: BUKTI-' + Math.floor(Math.random() * 999),
        'Reminder: Jatuh tempo dalam 3 hari. Silakan lakukan pembayaran.',
      ];
      const newEntry: WhatsAppLog = {
        id: newId, timestamp: new Date().toISOString(), nomor: newMessage.nomor || '081234567890',
        nama: 'User', pesan_masuk: newMessage.pesan || 'Test message',
        respon_sistem: autoResponses[Math.floor(Math.random() * autoResponses.length)],
        tipe: 'Input_Transaksi', status: 'Terkirim',
      };
      dispatch({ type: 'ADD_WHATSAPP', payload: newEntry });
      setSending(false);
      setShowCompose(false);
      setNewMessage({ nomor: '', pesan: '' });
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><MessageCircle size={24} className="text-green-500" />WhatsApp Integration</h1>
          <p className="text-gray-500 mt-1">Auto-pencatatan transaksi via WhatsApp — chatbot + webhook n8n</p>
        </div>
        <button onClick={() => setShowCompose(!showCompose)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"><Send size={18} />Kirim Pesan</button>
      </div>

      {/* How it works */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <h3 className="font-semibold text-green-800 flex items-center gap-2"><Smartphone size={16} />Cara Kerja WhatsApp Integration</h3>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center text-green-700 text-xs font-bold flex-shrink-0">1</div>
              <p className="text-sm text-green-800"><strong>User kirim pesan</strong> ke nomor WhatsApp bisnis (mis: "Saya sudah transfer DP 50jt")</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center text-green-700 text-xs font-bold flex-shrink-0">2</div>
              <p className="text-sm text-green-800"><strong>n8n webhook</strong> menerima pesan → kirim ke Gemini AI untuk NLP</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center text-green-700 text-xs font-bold flex-shrink-0">3</div>
              <p className="text-sm text-green-800"><strong>AI mengekstrak</strong> data: nominal, pihak, jenis transaksi → auto-entry ke BUKU_KAS</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center text-green-700 text-xs font-bold flex-shrink-0">4</div>
              <p className="text-sm text-green-800"><strong>Auto-reply</strong> konfirmasi ke user + reminder jatuh tempo otomatis</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Total Pesan</p><p className="text-xl font-bold">{totalMessages}</p></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Input Transaksi</p><p className="text-xl font-bold text-blue-600">{inputTransaksi.length}</p></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Reminder</p><p className="text-xl font-bold text-amber-600">{reminders.length}</p></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Status Terkirim</p><p className="text-xl font-bold text-emerald-600">{state.whatsapp.filter(w => w.status === 'Terkirim').length}</p></div>
      </div>

      {/* Compose */}
      {showCompose && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Kirim / Simulasi Pesan WhatsApp</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-gray-700">Nomor WhatsApp</label><input type="tel" placeholder="081234567890" value={newMessage.nomor} onChange={e => setNewMessage({...newMessage, nomor: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Pesan</label><input type="text" placeholder="Ketik pesan..." value={newMessage.pesan} onChange={e => setNewMessage({...newMessage, pesan: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
          </div>
          {sending && <div className="mt-3 flex items-center gap-2"><div className="animate-spin w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full"></div><span className="text-sm text-green-700">Mengirim & memproses...</span></div>}
          <div className="mt-4 flex gap-2">
            <button onClick={simulateAutoReply} disabled={sending} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">Kirim & Auto-Reply</button>
            <button onClick={() => setShowCompose(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm">Batal</button>
          </div>
        </div>
      )}

      {/* Chat Log */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Riwayat Percakapan</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {state.whatsapp.map(wa => (
            <div key={wa.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <User size={14} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{wa.nama}</p>
                    <p className="text-xs text-gray-500">{wa.nomor} • {new Date(wa.timestamp).toLocaleString('id-ID')}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${tipeColor(wa.tipe)}`}>{wa.tipe.replace(/_/g, ' ')}</span>
              </div>
              {wa.pesan_masuk && (
                <div className="ml-10 mb-2 p-2 bg-green-50 rounded-lg border border-green-100">
                  <p className="text-sm text-green-800"><strong>In:</strong> {wa.pesan_masuk}</p>
                </div>
              )}
              <div className="ml-10 p-2 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-1 mb-1">
                  <Bot size={12} className="text-blue-600" />
                  <span className="text-xs text-blue-600 font-medium">Auto-Reply Sistem</span>
                </div>
                <p className="text-sm text-blue-800">{wa.respon_sistem}</p>
              </div>
              <div className="ml-10 mt-2 flex items-center gap-2">
                <span className={`text-xs ${wa.status === 'Terkirim' ? 'text-emerald-600' : wa.status === 'Diproses' ? 'text-amber-600' : 'text-red-600'}`}>
                  {wa.status === 'Terkirim' ? <CheckCircle size={12} className="inline" /> : wa.status === 'Diproses' ? <Clock size={12} className="inline" /> : <XCircle size={12} className="inline" />}
                  {' '}{wa.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Integration Architecture */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Arsitektur Integrasi</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-center">
          <div className="p-3 bg-green-50 rounded-lg border border-green-100">
            <Smartphone size={20} className="mx-auto text-green-600 mb-1" />
            <p className="text-xs font-medium text-green-800">WhatsApp</p>
            <p className="text-xs text-green-600">User chat</p>
          </div>
          <div className="flex items-center justify-center text-gray-400">→</div>
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
            <Bot size={20} className="mx-auto text-orange-600 mb-1" />
            <p className="text-xs font-medium text-orange-800">n8n + Gemini</p>
            <p className="text-xs text-orange-600">NLP & OCR</p>
          </div>
          <div className="flex items-center justify-center text-gray-400">→</div>
          <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
            <MessageCircle size={20} className="mx-auto text-indigo-600 mb-1" />
            <p className="text-xs font-medium text-indigo-800">Web App</p>
            <p className="text-xs text-indigo-600">BUKU_KAS + Sheets</p>
          </div>
        </div>
      </div>
    </div>
  );
}
