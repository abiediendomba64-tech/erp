import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Cloud, AlertCircle } from 'lucide-react';
import { callGoogleBackend, googleClientId, setSessionToken } from '../lib/googleBackend';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
          cancel?: () => void;
        };
      };
    };
  }
}

export type LoginUser = {
  sub: string;
  email: string;
  nama: string;
  role: 'ADMIN' | 'KEUANGAN' | 'PROYEK' | 'VIEWER';
  exp?: number;
};

export default function GoogleLoginPage({ onLogin }: { onLogin: (token: string, user: LoginUser) => Promise<void> }) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!googleClientId) return;
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity="1"]');
    const script = existing || document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = '1';
    script.onload = () => setScriptReady(true);
    script.onerror = () => setError('Layanan login Google gagal dimuat. Periksa koneksi dan kebijakan browser.');
    if (!existing) document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!scriptReady || !buttonRef.current || !window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: async (response) => {
        const credential = response.credential || '';
        if (!credential) {
          setError('Google tidak memberikan kredensial login.');
          return;
        }
        setLoading(true);
        setError('');
        try {
          const result = await callGoogleBackend<{ sessionToken: string; user: LoginUser }>({
            action: 'auth.login',
            credential,
          });
          setSessionToken(result.sessionToken);
          await onLogin(result.sessionToken, result.user);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : 'Login gagal. Coba lagi.');
        } finally {
          setLoading(false);
        }
      },
    });
    buttonRef.current.replaceChildren();
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: 280,
    });
  }, [scriptReady, onLogin]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white">
          <ShieldCheck size={28} />
        </div>
        <h1 className="mt-5 text-center text-2xl font-bold text-slate-900">ERP Properti & Konstruksi</h1>
        <p className="mt-2 text-center text-sm leading-6 text-slate-600">
          Masuk dengan akun Google yang sudah didaftarkan oleh administrator. Data transaksi disimpan di Google Sheets cloud.
        </p>

        <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <Cloud size={18} className="text-indigo-600" />
            Login terhubung ke backend
          </div>
          <div className="mt-4 flex min-h-12 justify-center">
            <div ref={buttonRef} />
          </div>
          {!scriptReady && <p className="text-center text-xs text-slate-500">{loading ? 'Memverifikasi akun…' : 'Menyiapkan login Google…'}</p>}
          {loading && <p className="mt-3 text-center text-xs text-slate-500">Memverifikasi akses ke backend…</p>}
          {error && (
            <div className="mt-4 flex gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
        <p className="mt-5 text-center text-xs leading-5 text-slate-500">
          Akses mengikuti role di database server. Memilih mode tampilan di browser tidak dapat menaikkan hak akses.
        </p>
      </div>
    </div>
  );
}
