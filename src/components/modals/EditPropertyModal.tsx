// src/components/modals/EditPropertyModal.tsx
import { useState, useEffect } from 'react';
import type { Property } from '../../lib/supabase';
import { propertyService } from '../../services/propertyService';
import { Home, X, Loader2, Ruler, Bed, Bath, StickyNote, AlertCircle, Save } from 'lucide-react';

interface EditPropertyModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updatedProp: Property) => void;
}

export default function EditPropertyModal({ property, isOpen, onClose, onUpdated }: EditPropertyModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [kvm, setKvm] = useState('');
  const [rooms, setRooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [propertyNotes, setPropertyNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Omvandlar alltid värden till strängar för att förhindra .trim()-krasch om databasen returnerar nummer
  useEffect(() => {
    if (isOpen && property) {
      setName(property.name ? String(property.name) : '');
      setAddress(property.address ? String(property.address) : '');
      setKvm(property.kvm != null ? String(property.kvm) : '');
      setRooms(property.rooms != null ? String(property.rooms) : '');
      setBathrooms(property.bathrooms != null ? String(property.bathrooms) : '');
      setPropertyNotes(property.property_notes ? String(property.property_notes) : '');
      setErrorMsg(null);
    }
  }, [isOpen, property?.id]);

  if (!isOpen || !property) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Säkra att alla värden är strängar innan trim anropas
    const trimmedName = String(name || '').trim();
    const trimmedAddress = String(address || '').trim();
    const trimmedKvm = String(kvm || '').trim();
    const trimmedRooms = String(rooms || '').trim();
    const trimmedBathrooms = String(bathrooms || '').trim();
    const trimmedNotes = String(propertyNotes || '').trim();

    if (!trimmedName) return;

    setErrorMsg(null);
    setSaving(true);

    try {
      const updated = await propertyService.updateProperty(property.id, {
        name: trimmedName,
        address: trimmedAddress || trimmedName,
        kvm: trimmedKvm || null,
        rooms: trimmedRooms || null,
        bathrooms: trimmedBathrooms || null,
        property_notes: trimmedNotes || null,
      });

      onUpdated(updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(`Kunde inte uppdatera fastigheten: ${err.message || 'Ett fel uppstod.'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="bg-white text-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
            <Home className="w-4 h-4 text-sky-600" /> Redigera fastighet
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleUpdate} className="p-5 space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Fastighetens namn *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:bg-white focus:border-sky-500"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Fullständig adress</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium outline-none focus:bg-white focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Ruler className="w-3 h-3 text-slate-500" /> Kvm
              </label>
              <input
                type="text"
                placeholder="85"
                value={kvm}
                onChange={(e) => setKvm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Bed className="w-3 h-3 text-slate-500" /> Rum
              </label>
              <input
                type="text"
                placeholder="3"
                value={rooms}
                onChange={(e) => setRooms(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Bath className="w-3 h-3 text-slate-500" /> Badrum
              </label>
              <input
                type="text"
                placeholder="2"
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <StickyNote className="w-3.5 h-3.5 text-amber-600" /> Fasta instruktioner till städfirman
            </label>
            <textarea
              rows={3}
              placeholder="T.ex. Nyckel under krukan, lås två varv..."
              value={propertyNotes}
              onChange={(e) => setPropertyNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:bg-white focus:border-sky-500 font-medium"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black py-3.5 rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2 active:scale-98 mt-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Spara ändringar
          </button>
        </form>
      </div>
    </div>
  );
}