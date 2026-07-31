import { useState } from 'react';
import { supabase, type Property } from '../../lib/supabase';
import {
  Loader2,
  X,
  Building,
  MapPin,
  Check,
  Plus,
  KeyRound,
  Eye,
  EyeOff,
  Ruler,
  Timer,
  Pencil,
  Bed,
  Bath,
  StickyNote,
} from 'lucide-react';

interface PropertyListProps {
  properties: Property[];
  onRefresh: () => void;
}

export default function PropertyList({ properties, onRefresh }: PropertyListProps) {
  const [revealedPropIds, setRevealedPropIds] = useState<string[]>([]);
  const [newPropName, setNewPropName] = useState('');
  const [newPropAddress, setNewPropAddress] = useState('');
  const [newPropHost, setNewPropHost] = useState('');
  const [newPropPasscode, setNewPropPasscode] = useState('');
  const [newPropKvm, setNewPropKvm] = useState('');
  const [newPropRooms, setNewPropRooms] = useState('');
  const [newPropBathrooms, setNewPropBathrooms] = useState('');
  const [newPropTime, setNewPropTime] = useState('');
  const [newPropNotes, setNewPropNotes] = useState('');
  const [savingProp, setSavingProp] = useState(false);
  const [propError, setPropError] = useState<string | null>(null);

  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  const toggleRevealPasscode = (id: string) => {
    setRevealedPropIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setPropError(null);
    const code = newPropPasscode.trim().toUpperCase();

    if (!newPropName || !code) return;

    const { data: existing } = await supabase.from('properties').select('id').eq('passcode', code);
    if (existing && existing.length > 0) {
      setPropError('¡Este código ya existe! Por favor usa un código diferente.');
      return;
    }

    setSavingProp(true);

    await supabase.from('properties').insert({
      name: newPropName.trim(),
      address: newPropAddress.trim() || newPropName.trim(),
      host_name: newPropHost.trim() || null,
      passcode: code,
      kvm: newPropKvm.trim() || null,
      rooms: newPropRooms.trim() || null,
      bathrooms: newPropBathrooms.trim() || null,
      cleaning_time: newPropTime.trim() || null,
      property_notes: newPropNotes.trim() || null,
    });

    setNewPropName('');
    setNewPropAddress('');
    setNewPropHost('');
    setNewPropPasscode('');
    setNewPropKvm('');
    setNewPropRooms('');
    setNewPropBathrooms('');
    setNewPropTime('');
    setNewPropNotes('');
    setSavingProp(false);
    onRefresh();
  };

  const handleUpdateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty) return;

    setSavingProp(true);
    await supabase
      .from('properties')
      .update({
        name: editingProperty.name,
        address: editingProperty.address,
        host_name: editingProperty.host_name,
        passcode: editingProperty.passcode.toUpperCase(),
        kvm: editingProperty.kvm || null,
        rooms: editingProperty.rooms || null,
        bathrooms: editingProperty.bathrooms || null,
        cleaning_time: editingProperty.cleaning_time || null,
        property_notes: editingProperty.property_notes || null,
      })
      .eq('id', editingProperty.id);

    setSavingProp(false);
    setEditingProperty(null);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreateProperty} className="bg-white text-slate-900 p-6 rounded-3xl shadow-2xl space-y-4 border border-slate-200">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black">
            <Plus className="w-5 h-5" />
          </div>
          <h3 className="text-base font-black text-slate-900">Registrar Nueva Propiedad</h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de la propiedad *</label>
            <input
              type="text"
              placeholder="Ej. Gran Vista 45"
              value={newPropName}
              onChange={(e) => setNewPropName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500 transition"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de la anfitriona (Värd)</label>
              <input
                type="text"
                placeholder="Ej. Jessica"
                value={newPropHost}
                onChange={(e) => setNewPropHost(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium outline-none focus:bg-white focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Código Secreto / Contraseña *</label>
              <input
                type="text"
                placeholder="Ej. GV45"
                value={newPropPasscode}
                onChange={(e) => setNewPropPasscode(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono font-bold uppercase text-slate-900 outline-none focus:bg-white focus:border-emerald-500 transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Dirección completa *</label>
            <input
              type="text"
              placeholder="Ej. Calle Bach 71, Gran Alacant"
              value={newPropAddress}
              onChange={(e) => setNewPropAddress(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium outline-none focus:bg-white focus:border-emerald-500 transition"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Ruler className="w-3.5 h-3.5 text-slate-500" /> Kvm (m²)
              </label>
              <input
                type="text"
                placeholder="Ej. 85"
                value={newPropKvm}
                onChange={(e) => setNewPropKvm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Bed className="w-3.5 h-3.5 text-slate-500" /> Rum
              </label>
              <input
                type="text"
                placeholder="Ej. 3"
                value={newPropRooms}
                onChange={(e) => setNewPropRooms(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Bath className="w-3.5 h-3.5 text-slate-500" /> Badrum
              </label>
              <input
                type="text"
                placeholder="Ej. 2"
                value={newPropBathrooms}
                onChange={(e) => setNewPropBathrooms(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Timer className="w-3.5 h-3.5 text-sky-600" /> Tidsåtgång
              </label>
              <input
                type="text"
                placeholder="Ej. 2.5 h"
                value={newPropTime}
                onChange={(e) => setNewPropTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <StickyNote className="w-3.5 h-3.5 text-amber-600" /> Speciella anteckningar / Notas especiales
            </label>
            <textarea
              rows={2}
              placeholder="Ej. Reservnyckel under stenen. Låset krånglar, vrid två varv åt vänster..."
              value={newPropNotes}
              onChange={(e) => setNewPropNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 outline-none focus:bg-white focus:border-emerald-500 transition"
            />
          </div>
        </div>

        {propError && <p className="text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">{propError}</p>}

        <button
          type="submit"
          disabled={savingProp}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl text-xs transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
        >
          {savingProp ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          Guardar Propiedad
        </button>
      </form>

      <div className="space-y-3">
        <h4 className="font-black text-white text-xs uppercase tracking-wider px-1">
          Tus Propiedades ({properties.length})
        </h4>

        {properties.map((p) => {
          const isRevealed = revealedPropIds.includes(p.id);

          return (
            <div
              key={p.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xl space-y-4 text-slate-900 relative overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-black">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-black text-slate-900 text-base leading-tight">
                      {p.name}
                    </h5>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Fastighet / Propiedad
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingProperty(p)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                    title="Editar propiedad / Redigera"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  <div className="text-right shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleRevealPasscode(p.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 font-mono font-black text-xs rounded-xl border border-slate-700 shadow-sm transition active:scale-95"
                      title={isRevealed ? 'Ocultar código' : 'Mostrar código'}
                    >
                      {isRevealed ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                          <span>{p.passcode}</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          <span>••••</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                    <Ruler className="w-3 h-3 text-slate-500" /> Kvm
                  </span>
                  <span className="font-extrabold text-slate-900 text-xs">
                    {p.kvm ? `${p.kvm} m²` : '-'}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                    <Bed className="w-3 h-3 text-slate-500" /> Rum
                  </span>
                  <span className="font-extrabold text-slate-900 text-xs">
                    {p.rooms ? `${p.rooms} hab` : '-'}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                    <Bath className="w-3 h-3 text-slate-500" /> Badrum
                  </span>
                  <span className="font-extrabold text-slate-900 text-xs">
                    {p.bathrooms ? `${p.bathrooms} baños` : '-'}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                    <Timer className="w-3 h-3 text-sky-600" /> Tiempo
                  </span>
                  <span className="font-extrabold text-slate-900 text-xs">
                    {p.cleaning_time || '-'}
                  </span>
                </div>
              </div>

              {p.property_notes && (
                <div className="bg-sky-50 border border-sky-200 p-3 rounded-xl space-y-1 text-xs">
                  <span className="font-black text-sky-900 uppercase text-[10px] tracking-wider block flex items-center gap-1">
                    <StickyNote className="w-3.5 h-3.5 text-sky-600" /> Notas fijas / Anteckningar:
                  </span>
                  <p className="font-bold text-sky-950 leading-relaxed whitespace-pre-line">
                    {p.property_notes}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editingProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
          <div className="bg-white text-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                <Pencil className="w-4 h-4 text-emerald-600" /> Editar Propiedad
              </h3>
              <button onClick={() => setEditingProperty(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProperty} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={editingProperty.name}
                  onChange={(e) => setEditingProperty({ ...editingProperty, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none focus:bg-white focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dirección</label>
                <input
                  type="text"
                  value={editingProperty.address}
                  onChange={(e) => setEditingProperty({ ...editingProperty, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Anfitriona (Värd)</label>
                  <input
                    type="text"
                    value={editingProperty.host_name || ''}
                    onChange={(e) => setEditingProperty({ ...editingProperty, host_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Código / Lösenord</label>
                  <input
                    type="text"
                    value={editingProperty.passcode}
                    onChange={(e) => setEditingProperty({ ...editingProperty, passcode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-bold uppercase outline-none focus:bg-white focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kvm (m²)</label>
                  <input
                    type="text"
                    placeholder="85"
                    value={editingProperty.kvm || ''}
                    onChange={(e) => setEditingProperty({ ...editingProperty, kvm: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rum</label>
                  <input
                    type="text"
                    placeholder="3"
                    value={editingProperty.rooms || ''}
                    onChange={(e) => setEditingProperty({ ...editingProperty, rooms: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Badrum</label>
                  <input
                    type="text"
                    placeholder="2"
                    value={editingProperty.bathrooms || ''}
                    onChange={(e) => setEditingProperty({ ...editingProperty, bathrooms: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tiempo</label>
                  <input
                    type="text"
                    placeholder="2.5 h"
                    value={editingProperty.cleaning_time || ''}
                    onChange={(e) => setEditingProperty({ ...editingProperty, cleaning_time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notas especiales (Speciella anteckningar)</label>
                <textarea
                  rows={2}
                  value={editingProperty.property_notes || ''}
                  onChange={(e) => setEditingProperty({ ...editingProperty, property_notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={savingProp}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl transition shadow-lg flex items-center justify-center gap-1.5 mt-2"
              >
                {savingProp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Guardar Cambios
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}