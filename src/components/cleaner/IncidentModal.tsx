import { useState } from 'react';
import { supabase, type NewIncident } from '../../lib/supabase';
import { Loader2, X, Check } from 'lucide-react';

interface IncidentModalProps {
  bookingId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function IncidentModal({ bookingId, onClose, onSaved }: IncidentModalProps) {
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

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
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
      <div className="bg-white text-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-sm text-slate-900">Reportar foto / incidencia</h3>
          <p className="text-[11px] font-semibold text-slate-500">
            Solo si algo está roto, dañado o hay alguna incidencia.
          </p>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Fotos (Selecciona una o varias)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFiles}
              className="block w-full text-xs text-slate-600"
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
            <label className="block text-xs font-bold text-slate-700 mb-1">Nota explicativa *</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Ej. Silla rota en terraza..."
              className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 text-xs outline-none focus:bg-white focus:border-slate-400 transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-1.5"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Guardar reporte ({photos.length} {photos.length === 1 ? 'foto' : 'fotos'})
          </button>
        </form>
      </div>
    </div>
  );
}