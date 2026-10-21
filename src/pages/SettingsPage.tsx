import { useState } from 'react';
import { Settings, Save, TestTube, CheckCircle, XCircle, Download, MessageCircle, Send, Database, Bell } from 'lucide-react';

interface SettingsData {
  // WhatsApp
  waEnabled: boolean;
  waApiToken: string;
  waPhoneNumber: string;
  waBusinessId: string;
  waAutoReply: boolean;
  waNotifyOnTransaction: boolean;
  
  // Telegram
  tgEnabled: boolean;
  tgBotToken: string;
  tgChatId: string;
  tgAutoReply: boolean;
  tgNotifyOnTransaction: boolean;
  
  // Export
  exportFormat: 'xlsx' | 'csv' | 'pdf';
  exportIncludeAuditLog: boolean;
  exportIncludePhotos: boolean;
  
  // Backup
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  backupLocation: 'local' | 'cloud' | 'both';
  
  // Notifications
  notifyOnLowStock: boolean;
  notifyOnOverdue: boolean;
  notifyOnLargeTransaction: boolean;
  largeTransactionThreshold: number;
}

const defaultSettings: SettingsData = {
  waEnabled: false,
  waApiToken: '',
  waPhoneNumber: '',
  waBusinessId: '',
  waAutoReply: false,
  waNotifyOnTransaction: true,
  
  tgEnabled: false,
  tgBotToken: '',
  tgChatId: '',
  tgAutoReply: false,
  tgNotifyOnTransaction: true,
  
  exportFormat: 'xlsx',
  exportIncludeAuditLog: true,
  exportIncludePhotos: false,
  
  autoBackup: false,
  backupFrequency: 'weekly',
  backupLocation: 'both',
  
  notifyOnLowStock: true,
  notifyOnOverdue: true,
  notifyOnLargeTransaction: true,
  largeTransactionThreshold: 50000000,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [testStatus, setTestStatus] = useState<{ wa?: 'success' | 'error'; tg?: 'success' | 'error' }>({});
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Simpan ke localStorage
    localStorage.setItem('app_settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTestWhatsApp = async () => {
    // Simulasi test
    setTestStatus({ ...testStatus, wa: 'success' });
    setTimeout(() => setTestStatus({ ...testStatus, wa: undefined }), 3000);
  };

  const handleTestTelegram = async () => {
    // Simulasi test
    setTestStatus({ ...testStatus, tg: 'success' });
    setTimeout(() => setTestStatus({ ...testStatus, tg: undefined }), 3000);
  };

  const handleExport = (format: 'xlsx' | 'csv' | 'pdf') => {
    // Trigger export
    alert(`Export ${format.toUpperCase()} akan dimulai. Data akan diunduh.`);
  };

  const handleBackupNow = () => {
    alert('Backup akan dimulai. Data akan disimpan ke ' + settings.backupLocation);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings size={24} className="text-gray-600" />
            Pengaturan Sistem
          </h1>
          <p className="text-gray-500 mt-1">Konfigurasi integrasi, export, backup, dan notifikasi</p>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            saved ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {saved ? <CheckCircle size={18} /> : <Save size={18} />}
          {saved ? 'Tersimpan!' : 'Simpan Pengaturan'}
        </button>
      </div>

      {/* WhatsApp Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-green-50">
          <h3 className="font-semibold text-green-900 flex items-center gap-2">
            <MessageCircle size={20} className="text-green-600" />
            WhatsApp Business API
          </h3>
          <p className="text-xs text-green-700 mt-1">Integrasi untuk auto-reply dan notifikasi transaksi</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Aktifkan WhatsApp</p>
              <p className="text-xs text-gray-500">Izinkan sistem mengirim/menerima pesan WhatsApp</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.waEnabled}
                onChange={e => setSettings({ ...settings, waEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>

          {settings.waEnabled && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700">API Token</label>
                <input
                  type="password"
                  value={settings.waApiToken}
                  onChange={e => setSettings({ ...settings, waApiToken: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="EAAGm0PX4ZCpsxxxxxxxxxxxx..."
                />
                <p className="text-xs text-gray-500 mt-1">Dapatkan dari Facebook Developers → WhatsApp → API Setup</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Phone Number ID</label>
                <input
                  type="text"
                  value={settings.waPhoneNumber}
                  onChange={e => setSettings({ ...settings, waPhoneNumber: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="1234567890"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Business Account ID</label>
                <input
                  type="text"
                  value={settings.waBusinessId}
                  onChange={e => setSettings({ ...settings, waBusinessId: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="1000xxxxxxxxxxx"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Auto-Reply Pesan</p>
                  <p className="text-xs text-gray-500">Balas otomatis pesan masuk dengan template</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.waAutoReply}
                    onChange={e => setSettings({ ...settings, waAutoReply: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Notifikasi Transaksi</p>
                  <p className="text-xs text-gray-500">Kirim notifikasi ke WhatsApp saat ada transaksi baru</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.waNotifyOnTransaction}
                    onChange={e => setSettings({ ...settings, waNotifyOnTransaction: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
              <button
                onClick={handleTestWhatsApp}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
              >
                <TestTube size={16} />
                Test Koneksi
                {testStatus.wa === 'success' && <CheckCircle size={16} className="ml-2" />}
                {testStatus.wa === 'error' && <XCircle size={16} className="ml-2" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Telegram Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-blue-50">
          <h3 className="font-semibold text-blue-900 flex items-center gap-2">
            <Send size={20} className="text-blue-600" />
            Telegram Bot
          </h3>
          <p className="text-xs text-blue-700 mt-1">Integrasi untuk notifikasi dan command bot</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Aktifkan Telegram</p>
              <p className="text-xs text-gray-500">Izinkan sistem mengirim notifikasi ke Telegram</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.tgEnabled}
                onChange={e => setSettings({ ...settings, tgEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {settings.tgEnabled && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700">Bot Token</label>
                <input
                  type="password"
                  value={settings.tgBotToken}
                  onChange={e => setSettings({ ...settings, tgBotToken: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                />
                <p className="text-xs text-gray-500 mt-1">Dapatkan dari @BotFather di Telegram</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Chat ID</label>
                <input
                  type="text"
                  value={settings.tgChatId}
                  onChange={e => setSettings({ ...settings, tgChatId: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="-1001234567890"
                />
                <p className="text-xs text-gray-500 mt-1">ID grup/channel atau user yang akan menerima notifikasi</p>
              </div>
              <button
                onClick={handleTestTelegram}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
              >
                <TestTube size={16} />
                Test Koneksi
                {testStatus.tg === 'success' && <CheckCircle size={16} className="ml-2" />}
                {testStatus.tg === 'error' && <XCircle size={16} className="ml-2" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Export Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-purple-50">
          <h3 className="font-semibold text-purple-900 flex items-center gap-2">
            <Download size={20} className="text-purple-600" />
            Pengaturan Export
          </h3>
          <p className="text-xs text-purple-700 mt-1">Format dan opsi export data</p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Format Default Export</label>
            <select
              value={settings.exportFormat}
              onChange={e => setSettings({ ...settings, exportFormat: e.target.value as any })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="csv">CSV (.csv)</option>
              <option value="pdf">PDF (.pdf)</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Sertakan Audit Log</p>
              <p className="text-xs text-gray-500">Termasuk riwayat perubahan data dalam export</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.exportIncludeAuditLog}
                onChange={e => setSettings({ ...settings, exportIncludeAuditLog: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('xlsx')}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm"
            >
              <Download size={16} /> Export Excel
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm"
            >
              <Download size={16} /> Export CSV
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm"
            >
              <Download size={16} /> Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Backup Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-amber-50">
          <h3 className="font-semibold text-amber-900 flex items-center gap-2">
            <Database size={20} className="text-amber-600" />
            Backup & Restore
          </h3>
          <p className="text-xs text-amber-700 mt-1">Pengaturan backup otomatis dan manual</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Backup Otomatis</p>
              <p className="text-xs text-gray-500">Backup data secara berkala</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoBackup}
                onChange={e => setSettings({ ...settings, autoBackup: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>
          {settings.autoBackup && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700">Frekuensi Backup</label>
                <select
                  value={settings.backupFrequency}
                  onChange={e => setSettings({ ...settings, backupFrequency: e.target.value as any })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="daily">Harian</option>
                  <option value="weekly">Mingguan</option>
                  <option value="monthly">Bulanan</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Lokasi Backup</label>
                <select
                  value={settings.backupLocation}
                  onChange={e => setSettings({ ...settings, backupLocation: e.target.value as any })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="local">Lokal (Download)</option>
                  <option value="cloud">Cloud (Google Drive)</option>
                  <option value="both">Keduanya</option>
                </select>
              </div>
            </>
          )}
          <button
            onClick={handleBackupNow}
            className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 text-sm"
          >
            <Database size={16} /> Backup Sekarang
          </button>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-red-50">
          <h3 className="font-semibold text-red-900 flex items-center gap-2">
            <Bell size={20} className="text-red-600" />
            Notifikasi
          </h3>
          <p className="text-xs text-red-700 mt-1">Pengaturan alert dan peringatan</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Stok Menipis</p>
              <p className="text-xs text-gray-500">Notifikasi saat stok barang di bawah minimum</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifyOnLowStock}
                onChange={e => setSettings({ ...settings, notifyOnLowStock: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Jatuh Tempo</p>
              <p className="text-xs text-gray-500">Notifikasi saat invoice/PO mendekati jatuh tempo</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifyOnOverdue}
                onChange={e => setSettings({ ...settings, notifyOnOverdue: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Transaksi Besar</p>
              <p className="text-xs text-gray-500">Notifikasi saat ada transaksi di atas threshold</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifyOnLargeTransaction}
                onChange={e => setSettings({ ...settings, notifyOnLargeTransaction: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>
          {settings.notifyOnLargeTransaction && (
            <div>
              <label className="text-sm font-medium text-gray-700">Threshold Transaksi Besar (Rp)</label>
              <input
                type="number"
                value={settings.largeTransactionThreshold}
                onChange={e => setSettings({ ...settings, largeTransactionThreshold: Number(e.target.value) })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="50000000"
              />
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Catatan:</strong> Pengaturan ini disimpan di browser (localStorage). 
          Untuk produksi multi-user, perlu backend API dengan database untuk menyimpan konfigurasi per user/role.
        </p>
      </div>
    </div>
  );
}
