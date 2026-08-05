// src/components/cleaner/PropertyList.tsx
import { useState, useEffect } from 'react';
import { supabase, type Property } from '../../lib/supabase';
import {
  Loader2,
  X,
  Building,
  MapPin,
  KeyRound,
  Eye,
  EyeOff,
  Ruler,
  Timer,
  Bed,
  Bath,
  StickyNote,
  User,
  Plus,
  Key,
  Check,
  AlertCircle,
  Unlink,
  Pencil,
  Lock,
} from 'lucide-react';

interface PropertyListProps {
  properties: Property[];
  onRefresh: () => void;
}

interface ConnectionData {
  id: string;
  property_id: string;
  internal_notes: string | null;
  cleaning_time: string | null;
}

export default function PropertyList({ properties, onRefresh }: PropertyListProps) {
  const [revealedPropIds, setRevealedPropIds] = useState<string[]>([]);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  // Egna anteckningar & tidsåtgång per fastighet
  const [connectionsMap, setConnectionsMap] = useState<Record<string, ConnectionData>>({});
  const [editingProp, setEditingProp] = useState<Property | null>(null);
  const [editTime, setEditTime] = useState('');
  const [editInternalNotes, setEditInternalNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Hämta städerskans egna kopplingar (med internal_notes & cleaning_time)
  const fetchConnections = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('property_connections')
      .select('id, property_id, internal_notes, cleaning_time')
      .eq('cleaner_id', session.user.id);

    if (data) {
      const map: Record<string, ConnectionData> = {};
      data.forEach((item: any) => {
        map[item.property_id] = item;
      });
      setConnectionsMap(map);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, [properties]);

  const toggleRevealPasscode = (id: string) => {
    setRevealedPropIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleConnectProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    const code = inviteCode.trim().toUpperCase();

    if (!code) return;
    setConnecting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { data: prop, error: propErr } = await supabase
        .from('properties')
        .select('id, name')
        .or(`invite_code.eq.${code},passcode.eq.${code}`)
        .maybeSingle();

      if (propErr) throw propErr;

      if (!prop) {
        setErrorMsg('Código no válido. Verifica el código e inténtalo de nuevo.');
        setConnecting(false);
        return;
      }

      const { error: connectErr } = await supabase
        .from('property_connections')
        .insert({
          property_id: prop.id,
          cleaner_id: session.user.id,
        });

      if (connectErr) {
        if (connectErr.code === '23505') {
          setErrorMsg('Esta propiedad ya está conectada a tu cuenta.');
        } else {
          throw connectErr;
        }
        setConnecting(false);
        return;
      }

      setSuccessMsg(`¡Propiedad "${prop.name}" conectada con éxito!`);
      setInviteCode('');
      setTimeout(() => {
        setShowConnectModal(false);
        setSuccessMsg(null);
        onRefresh();
      }, 1200);

    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar la propiedad.');
    } finally {
      setConnecting(false);
    }
  };

  // Spara städerskans egna interna anteckningar & tid
  const handleSaveCleanerNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProp) return;

    setSavingNotes(true);
    const conn = connectionsMap[editingProp.id];

    if (conn) {
      await supabase
        .from('property_connections')
        .update({
          cleaning_time: editTime.trim() || null,
          internal_notes: editInternalNotes.trim() || null,
        })
        .eq('id', conn.id);

      await fetchConnections();
    }

    setSavingNotes(false);
    setEditingProp(null);
  };

  const openEditModal = (p: Property) => {
    setEditingProp(p);
    const conn = connectionsMap[p.id];
    setEditTime(conn?.cleaning_time || p.cleaning_time || '');
    setEditInternalNotes(conn?.internal_notes || '');
  };

  const handleDisconnect = async (p: Property) => {
    if (!window.confirm(`¿Deseas desconectar la propiedad "${p.name}"?`)) return;

    setDisconnectingId(p.id);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from('property_connections')
        .delete()
        .eq('property_id', p.id)
        .eq('cleaner_id', session.user.id);
      onRefresh();
    }
    setDisconnectingId(null);
  };

  return (
    <div className="space-y-4">
      {/* KNAPP: CONECTAR PROPIEDAD */}
      <div className="bg-slate-900 text-white p-4 rounded-3xl border border-slate-800 shadow-xl flex items-center justify-between">
        <div>
          <h3 className="font-black text-sm text-white flex items-center gap-2">
            <Building className="w-4 h-4 text-sky-400" /> Mis Propiedades Conectadas
          </h3>
          <p className="text-[11px] font-semibold text-slate-400">
            {properties.length} {properties.length === 1 ? 'propiedad asignada' : 'propiedades asignadas'}
          </p>
        </div>

        <button
          onClick={() => {
            setShowConnectModal(true);
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-sky-500/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Conectar código</span>
        </button>
      </div>

      {/* MODAL: CONECTAR CÓDIGO */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-white text-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-sky-600" /> Conectar nueva propiedad
              </h3>
              <button onClick={() => setShowConnectModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConnectProperty} className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Introduce el código de invitación o clave secreta proporcionada por la anfitriona:
              </p>

              <div>
                <input
                  type="text"
                  placeholder="Ej. CLEAN-88A2 o GV45"
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
                Conectar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR MI TIEMPO Y NOTA INTERNA */}
      {editingProp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-white text-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                <Pencil className="w-4 h-4 text-sky-600" /> Notas internas & Tiempo est.
              </h3>
              <button onClick={() => setEditingProp(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCleanerNotes} className="p-5 space-y-4 text-xs">
              <p className="text-[11px] font-semibold text-slate-500">
                Propiedad: <strong className="text-slate-900">{editingProp.name}</strong>
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Timer className="w-3.5 h-3.5 text-sky-600" /> Tiempo estimado de limpieza
                </label>
                <input
                  type="text"
                  placeholder="Ej. 2.5 h"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-900 outline-none focus:bg-white focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-amber-600" /> Mis notas privadas (Solo para limpiadoras)
                </label>
                <textarea
                  rows={3}
                  placeholder="Ej. Cerradura va dura. Traer mopp especial..."
                  value={editInternalNotes}
                  onChange={(e) => setEditInternalNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 outline-none focus:bg-white focus:border-sky-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">🔒 La anfitriona NO podrá ver estas notas.</p>
              </div>

              <button
                type="submit"
                disabled={savingNotes}
                className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black py-3 rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-1.5 active:scale-98"
              >
                {savingNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Guardar mis notas
              </button>
            </form>
          </div>
        </div>
      )}

      {/* LISTA DE PROPIEDADES */}
      <div className="space-y-3">
        {properties.length === 0 ? (
          <div className="text-center py-10 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 text-slate-400 text-xs space-y-2">
            <Building className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="font-bold text-white">No tienes propiedades conectadas</p>
            <p>Pide el código a la anfitriona y pulsa en "Conectar código".</p>
          </div>
        ) : (
          properties.map((p) => {
            const isRevealed = revealedPropIds.includes(p.id);
            const connData = connectionsMap[p.id];
            const displayTime = connData?.cleaning_time || p.cleaning_time || '-';
            const internalNote = connData?.internal_notes;

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xl space-y-4 text-slate-900 relative overflow-hidden"
              >
                {/* CABECERA */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-3 gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-black shrink-0 mt-0.5">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="font-black text-slate-900 text-base leading-tight">
                        {p.name}
                      </h5>

                      {p.address && (
                        <p className="text-xs font-bold text-slate-600 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{p.address}</span>
                        </p>
                      )}

                      {p.host_name && (
                        <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Anfitriona: {p.host_name}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ACCIONES */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditModal(p)}
                      className="p-2 bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-sky-600 rounded-xl transition active:scale-95 border border-slate-200"
                      title="Editar notas internas y tiempo"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDisconnect(p)}
                      disabled={disconnectingId === p.id}
                      className="p-2 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl transition active:scale-95 border border-slate-200"
                      title="Desconectar propiedad"
                    >
                      {disconnectingId === p.id ? <Loader2 className="w-4 h-4 animate-spin text-rose-600" /> : <Unlink className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleRevealPasscode(p.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-emerald-400 font-mono font-black text-xs rounded-xl border border-slate-700 shadow-sm transition active:scale-95"
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

                {/* ESPECIFICACIONES */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                      <Ruler className="w-3 h-3 text-slate-500" /> Superficie
                    </span>
                    <span className="font-extrabold text-slate-900 text-xs">
                      {p.kvm ? `${p.kvm} m²` : '-'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                      <Bed className="w-3 h-3 text-slate-500" /> Habitaciones
                    </span>
                    <span className="font-extrabold text-slate-900 text-xs">
                      {p.rooms ? `${p.rooms} hab` : '-'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                      <Bath className="w-3 h-3 text-slate-500" /> Baños
                    </span>
                    <span className="font-extrabold text-slate-900 text-xs">
                      {p.bathrooms ? `${p.bathrooms} baños` : '-'}
                    </span>
                  </div>

                  <div className="bg-sky-50 p-2.5 rounded-xl border border-sky-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block flex items-center gap-1">
                      <Timer className="w-3 h-3 text-sky-600" /> Tiempo
                    </span>
                    <span className="font-extrabold text-sky-950 text-xs">
                      {displayTime}
                    </span>
                  </div>
                </div>

                {/* NOTAS DE LA ANFITRIONA */}
                {p.property_notes && (
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1 text-xs">
                    <span className="font-black text-slate-700 uppercase text-[10px] tracking-wider block flex items-center gap-1">
                      <StickyNote className="w-3.5 h-3.5 text-slate-500" /> Notas fijas de la anfitriona:
                    </span>
                    <p className="font-bold text-slate-900 leading-relaxed whitespace-pre-line">
                      {p.property_notes}
                    </p>
                  </div>
                )}

                {/* MIS NOTAS INTERNAS (SOLO VISIBLES PARA LA LIMPIADORA) */}
                {internalNote && (
                  <div className="bg-sky-50/80 border border-sky-200 p-3 rounded-xl space-y-1 text-xs">
                    <span className="font-black text-sky-900 uppercase text-[10px] tracking-wider block flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-sky-600" /> Mis notas internas (Privadas):
                    </span>
                    <p className="font-bold text-sky-950 leading-relaxed whitespace-pre-line">
                      {internalNote}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}