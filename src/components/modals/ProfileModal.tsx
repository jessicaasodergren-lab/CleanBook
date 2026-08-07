// src/components/modals/ProfileModal.tsx
import { useState, useEffect } from 'react';
import { supabase, type Profile } from '../../lib/supabase';
import { APP_CONFIG } from '../../lib/constants';
import { User, Phone, Globe, X, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onProfileUpdated: () => void;
}

export default function ProfileModal({ isOpen, onClose, profile, onProfileUpdated }: ProfileModalProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState<'sv' | 'en' | 'da' | 'es'>('sv');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (profile && isOpen) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setLanguage((profile.language as any) || (profile.role === 'host' ? 'sv' : 'es'));
      setSuccess(false);
      setErrorMsg(null);
    }
  }, [profile, isOpen]);

  if (!isOpen || !profile) return null;

  const isHost = profile.role === 'host';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          language: language,
        })
        .eq('id', profile.id);

      if (error) {
        console.error('Supabase update error:', error);
        setErrorMsg(`Kunde inte spara: ${error.message}`);
        setSaving(false);
        return;
      }

      setSuccess(true);
      onProfileUpdated();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Kunde inte uppdatera profil:', err);
      setErrorMsg('Ett oväntat fel uppstod vid sparande.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="bg-white text-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
            <User className="w-4 h-4 text-emerald-600" /> Profilinställningar
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-500" /> Namn / Företagsnamn
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="T.ex. Maria Svensson eller Limpiezas Costa"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:bg-white focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-600" /> Telefonnummer (för WhatsApp)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="T.ex. +34 612 345 678 eller +46 70 123 45 67"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:bg-white focus:border-emerald-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Används för att skicka direktmeddelanden och aviseringar via WhatsApp.
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-sky-600" /> Språk i appen
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:bg-white focus:border-emerald-500"
            >
              {isHost ? (
                <>
                  <option value="sv">🇸🇪 Svenska</option>
                  <option value="en">🇬🇧 English</option>
                  <option value="da">🇩🇰 Dansk</option>
                </>
              ) : (
                <>
                  <option value="es">🇪🇸 Español</option>
                  <option value="en">🇬🇧 English</option>
                  <option value="sv">🇸🇪 Svenska</option>
                </>
              )}
            </select>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 font-bold text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Profilen har sparats!</span>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2 active:scale-98 mt-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Spara profilen
          </button>

          {/* APP-VERSION */}
          <div className="pt-2 text-center text-[10px] font-bold text-slate-400 border-t border-slate-100 mt-3">
            {APP_CONFIG.name} {APP_CONFIG.version}
          </div>
        </form>
      </div>
    </div>
  );
}