// src/components/modals/ConnectPropertyModal.tsx
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { propertyService } from '../../services/propertyService';
import { translations } from '../../i18n/translations';
import type { CleanerLanguage } from '../CleanerView';
import { Key, X, Loader2, KeyRound, AlertCircle, Check } from 'lucide-react';

interface ConnectPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: () => void;
  lang?: CleanerLanguage;
}

export default function ConnectPropertyModal({ isOpen, onClose, onConnected, lang = 'es' }: ConnectPropertyModalProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const txt = (translations as any)?.cleaner?.[lang] || (translations as any)?.cleaner?.es || {};

  if (!isOpen) return null;

  const handleConnectProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!inviteCode.trim()) return;

    setConnecting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      await supabase.from('profiles').upsert({
        id: session.user.id,
        email: session.user.email,
        role: session.user.user_metadata?.role || 'agency_admin',
        full_name: session.user.user_metadata?.full_name || '',
      });

      await propertyService.connectByInviteCode(session.user.id, inviteCode);

      setSuccessMsg(txt.successConnected || '¡Propiedad conectada con éxito!');
      setInviteCode('');
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
        onConnected();
      }, 1200);

    } catch (err: any) {
      if (err.message === 'INVALID_CODE') {
        setErrorMsg(txt.errInvalidCode || 'Código no válido.');
      } else if (err.message === 'ALREADY_CONNECTED') {
        setErrorMsg(txt.errAlreadyConnected || 'Esta propiedad ya está conectada.');
      } else {
        setErrorMsg(err.message || 'Error occurred');
      }
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="bg-white text-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
            <Key className="w-4 h-4 text-sky-600" /> {txt.modalTitle || 'Conectar nueva propiedad'}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConnectProperty} className="p-5 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            {txt.modalDesc || 'Introduce el código de invitación proporcionado por la anfitriona:'}
          </p>

          <div>
            <input
              type="text"
              placeholder={txt.placeholderCode || 'Ej. CLEAN-88A2'}
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-center font-mono font-black text-lg uppercase text-slate-900 outline-none focus:bg-white focus:border-sky-500 transition"
              autoFocus
              required
            />
          </div>

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs font-bold text-emerald-700 flex items-center gap-1.5">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={connecting}
            className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black py-3.5 rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2 active:scale-98"
          >
            {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            {txt.btnSubmitConnect || 'Conectar'}
          </button>
        </form>
      </div>
    </div>
  );
}