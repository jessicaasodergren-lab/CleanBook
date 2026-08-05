// src/components/modals/CreatePropertyModal.tsx
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { propertyService } from '../../services/propertyService';
import { Home, X, Loader2, KeyRound, Ruler, Bed, Bath, StickyNote, AlertCircle } from 'lucide-react';

interface CreatePropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (createdProp: any) => void;
}

export default function CreatePropertyModal({ isOpen, onClose, onCreated }: CreatePropertyModalProps) {
  const [newPropName, setNewPropName] = useState('');
  const [newPropAddress, setNewPropAddress] = useState('');
  const [newPropKvm, setNewPropKvm] = useState('');
  const [newPropRooms, setNewPropRooms] = useState('');
  const [newPropBathrooms, setNewPropBathrooms] = useState('');
  const [newPropNotes, setNewPropNotes] = useState('');
  const [savingProp, setSavingProp] = useState(false);
  const [addPropError, setAddPropError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropName.trim()) return;

    setAddPropError(null);
    setSavingProp(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      setAddPropError('Du måste vara inloggad för att skapa en fastighet.');
      setSavingProp(false);
      return;
    }

    try {
      await supabase.from('profiles').upsert({
        id: session.user.id,
        email: session.user.email,
        role: 'host',
        full_name: session.user.user_metadata?.full_name || '',
      });

      const createdProp = await propertyService.createProperty({
        hostId: session.user.id,
        hostName: session.user.user_metadata?.full_name || 'Värd',
        name: newPropName.trim(),
        address: newPropAddress.trim() || newPropName.trim(),
        kvm: newPropKvm.trim() || null,
        rooms: newPropRooms.trim() || null,
        bathrooms: newPropBathrooms.trim() || null,
        property_notes: newPropNotes.trim() || null,
      });

      setNewPropName('');
      setNewPropAddress('');
      setNewPropKvm('');
      setNewPropRooms('');
      setNewPropBathrooms('');
      setNewPropNotes('');
      onCreated(createdProp);
      onClose();
    } catch (err: any) {
      setAddPropError(`Kunde inte spara fastigheten: ${err.message || 'Ett fel uppstod.'}`);
    } finally {
      setSavingProp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="bg-white text-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
            <Home className="w-4 h-4 text-emerald-600" /> Registrera ny fastighet
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreateProperty} className="p-5 space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Fastighetens namn *</label>
            <input
              type="text"
              placeholder="T.ex. Gran Vista 45"
              value={newPropName}
              onChange={(e) => setNewPropName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:bg-white focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Fullständig adress</label>
            <input
              type="text"
              placeholder="T.ex. Calle Bach 71, Gran Alacant"
              value={newPropAddress}
              onChange={(e) => setNewPropAddress(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium outline-none focus:bg-white focus:border-emerald-500"
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
                value={newPropKvm}
                onChange={(e) => setNewPropKvm(e.target.value)}
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
                value={newPropRooms}
                onChange={(e) => setNewPropRooms(e.target.value)}
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
                value={newPropBathrooms}
                onChange={(e) => setNewPropBathrooms(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <StickyNote className="w-3.5 h-3.5 text-amber-600" /> Fasta instruktioner till städerskan
            </label>
            <textarea
              rows={2}
              placeholder="T.ex. Nyckel under krukan..."
              value={newPropNotes}
              onChange={(e) => setNewPropNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:bg-white focus:border-emerald-500"
            />
          </div>

          {addPropError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{addPropError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={savingProp}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2 active:scale-98 mt-2"
          >
            {savingProp ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            Spara & Generera inbjudningskod
          </button>
        </form>
      </div>
    </div>
  );
}