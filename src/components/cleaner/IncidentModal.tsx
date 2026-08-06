// src/components/cleaner/IncidentModal.tsx
import { useState } from 'react';
import { supabase, type NewIncident } from '../../lib/supabase';
import { translations } from '../../i18n/translations';
import { Loader2, X, Check, MessageSquare, AlertTriangle } from 'lucide-react';

interface IncidentModalProps {
  bookingId: string;
  propertyName?: string;
  hostPhone?: string | null;
  lang?: 'es' | 'en' | 'sv' | 'da';
  onClose: () => void;
  onSaved: () => void;
}

export default function IncidentModal({
  bookingId,
  propertyName,
  hostPhone,
  lang = 'es',
  onClose,
  onSaved,
}: IncidentModalProps) {
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  const txt = translations?.incidentModal?.[lang] || translations?.incidentModal?.es;

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const readers = files.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then((base64List) => {
      setPhotos((prev) => [...prev, ...base64List]);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSubmitting(true);

    const payload: NewIncident = {
      booking_id: bookingId,
      note: note.trim(),
      photo_url: photos.length > 0 ? JSON.stringify(photos) : null,
    };

    await supabase.from('incidents').insert(payload);
    setSubmitting(false);
    setIsSavedSuccess(true);
    onSaved();
  };

  const getWhatsAppNotifyUrl = () => {
    const message = `🚨 *CleanBook - Incidencia / Daño*\n\n🏡 *Propiedad:* ${propertyName || 'Propiedad'}\n📝 *Nota:* ${note.trim()}`;
    const cleanPhone = hostPhone ? hostPhone.replace(/[^0-9]/g, '') : '';
    return cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
      <div className="bg-white text-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            {txt.title}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSavedSuccess ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="font-black text-slate-900 text-base">{txt.savedTitle}</h4>
              <p className="text-xs text-slate-500 font-medium">{txt.savedSub}</p>
            </div>

            <a
              href={getWhatsAppNotifyUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-2 active:scale-95"
            >
              <MessageSquare className="w-4 h-4 fill-white" />
              <span>{txt.btnNotifyWhatsApp}</span>
            </a>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
            >
              {txt.btnDone}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
            <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
              {txt.subtitle}
            </p>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {txt.labelPhotos}
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFiles}
                className="block w-full text-slate-600"
              />
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                {photos.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={url}
                      alt={`Preview ${idx}`}
                      className="w-full h-20 object-cover rounded-xl border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-0.5 shadow-md hover:bg-rose-600 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">{txt.labelNote}</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder={txt.placeholderNote}
                className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 text-xs outline-none focus:bg-white focus:border-slate-400 transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-1.5 active:scale-98"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {txt.btnSave} ({photos.length} {photos.length === 1 ? txt.photosCount : txt.photosCountPlural})
            </button>
          </form>
        )}
      </div>
    </div>
  );
}