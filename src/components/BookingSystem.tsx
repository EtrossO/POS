import React, { useState, useEffect } from 'react';
import {
  Package, User, Phone, MapPin, CreditCard, Wallet, Clock,
  CheckCircle, XCircle, Edit2, Trash2, ShoppingCart,
  AlertCircle, Search, Eye, X, Tag, Plus, Settings, DollarSign,
  RotateCcw
} from 'lucide-react';
import {
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
  Timestamp
} from "firebase/firestore";
import { db } from '../firebaseConfig';

// ─── Types ────────────────────────────────────────────────────────────────────
type VariantId = '80g' | '500g' | '1kg';

interface PromoRule {
  id: string;
  qty: number;          // e.g. 5 → "5 pcs for RM X"
  totalPrice: number;   // total price for that bundle
}

interface VariantSettings {
  basePrice: number;
  promos: PromoRule[];
}

interface BookingItem {
  id: string;
  variant: VariantId;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  promoLabel?: string;
}

interface Booking {
  id?: string;
  customerName: string;
  phone: string;
  address: string;
  paymentMethod: 'online' | 'cod';
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  items: BookingItem[];
  totalAmount: number;
  // Backwards compatibility with older bookings
  variant?: VariantId;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  promoLabel?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const BOOKINGS_COLLECTION = "bookings";
const SETTINGS_KEY = 'bookingVariantSettings_v2';

const OFFICIAL_VARIANTS: { id: VariantId; label: string; officialPrice: number }[] = [
  { id: '80g',  label: '80g',  officialPrice: 3.0  },
  { id: '500g', label: '500g', officialPrice: 15.0 },
  { id: '1kg',  label: '1kg',  officialPrice: 22.0 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const defaultSettings = (): Record<VariantId, VariantSettings> => ({
  '80g':  { basePrice: 3.0,  promos: [] },
  '500g': { basePrice: 15.0, promos: [] },
  '1kg':  { basePrice: 22.0, promos: [] },
});

const loadSettings = (): Record<VariantId, VariantSettings> => {
  try {
    const s = localStorage.getItem(SETTINGS_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return defaultSettings();
};

const persistSettings = (s: Record<VariantId, VariantSettings>) =>
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));

const calcPrice = (
  variant: VariantId,
  qty: number,
  settings: Record<VariantId, VariantSettings>
): { unitPrice: number; totalPrice: number; promoLabel?: string } => {
  const vs = settings[variant];
  const matched = vs.promos
    .filter(p => qty >= p.qty)
    .sort((a, b) => b.qty - a.qty)[0];

  if (matched) {
    const sets  = Math.floor(qty / matched.qty);
    const rem   = qty % matched.qty;
    const total = sets * matched.totalPrice + rem * vs.basePrice;
    return {
      unitPrice:  parseFloat((total / qty).toFixed(4)),
      totalPrice: parseFloat(total.toFixed(2)),
      promoLabel: `${matched.qty} pcs for RM ${matched.totalPrice.toFixed(2)}`,
    };
  }
  return {
    unitPrice:  vs.basePrice,
    totalPrice: parseFloat((qty * vs.basePrice).toFixed(2)),
  };
};

const makeBookingItemId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${Math.floor(Math.random()*1e9)}`;
};

const createBookingItem = (variant: VariantId, quantity: number, settings: Record<VariantId, VariantSettings>): BookingItem => {
  const { unitPrice, totalPrice, promoLabel } = calcPrice(variant, quantity, settings);
  return { id: makeBookingItemId(), variant, quantity, unitPrice, totalPrice, promoLabel };
};

// ═════════════════════════════════════════════════════════════════════════════
const BookingSystem: React.FC = () => {

  // ── Settings state ────────────────────────────────────────────────────────
  const [settings, setSettings]         = useState<Record<VariantId, VariantSettings>>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab]       = useState<VariantId>('80g');
  const [editPriceVal, setEditPriceVal] = useState('');
  const [newPromoQty, setNewPromoQty]   = useState<number>(2);
  const [newPromoPrice, setNewPromoPrice] = useState('');

  // ── Booking state ─────────────────────────────────────────────────────────
  const [bookings, setBookings]             = useState<Booking[]>([]);
  const [loading, setLoading]               = useState(false);
  const [showForm, setShowForm]             = useState(false);
  const [editingId, setEditingId]           = useState<string | null>(null);
  const [filterStatus, setFilterStatus]     = useState('all');
  const [searchTerm, setSearchTerm]         = useState('');
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);

  const makeDefault = (): Booking => {
    const item = createBookingItem('80g', 1, settings);
    return {
      customerName: '',
      phone: '',
      address: '',
      paymentMethod: 'cod',
      status: 'pending',
      items: [item],
      totalAmount: item.totalPrice,
      notes: '',
    };
  };
  const [formData, setFormData] = useState<Booking>(makeDefault);

  useEffect(() => { loadBookings(); }, []);

  useEffect(() => {
    setEditPriceVal(settings[activeTab].basePrice.toFixed(2));
  }, [activeTab, settings]);

  // Recalculate item pricing when the pricing settings change (e.g. promo rules updated).
  useEffect(() => {
    setFormData(prev => {
      const items = prev.items.map(item => {
        const { unitPrice, totalPrice, promoLabel } = calcPrice(item.variant, item.quantity, settings);
        return { ...item, unitPrice, totalPrice, promoLabel };
      });
      const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
      return { ...prev, items, totalAmount };
    });
  }, [settings]);

  // ── Settings helpers ──────────────────────────────────────────────────────
  const updateSettings = (next: Record<VariantId, VariantSettings>) => {
    setSettings(next); persistSettings(next);
  };

  const commitBasePrice = () => {
    const val = parseFloat(editPriceVal);
    if (isNaN(val) || val <= 0) { alert('Enter a valid price.'); return; }
    updateSettings({ ...settings, [activeTab]: { ...settings[activeTab], basePrice: val } });
  };

  const restoreOfficial = () => {
    const v = OFFICIAL_VARIANTS.find(v => v.id === activeTab)!;
    updateSettings({ ...settings, [activeTab]: { ...settings[activeTab], basePrice: v.officialPrice } });
  };

  const addPromo = () => {
    const price = parseFloat(newPromoPrice);
    if (newPromoQty < 1 || isNaN(price) || price <= 0) { alert('Please enter valid quantity and price.'); return; }
    if (settings[activeTab].promos.find(p => p.qty === newPromoQty)) {
      alert(`A promo for ${newPromoQty} pcs already exists. Delete it first.`); return;
    }
    const promo: PromoRule = { id: Date.now().toString(), qty: newPromoQty, totalPrice: price };
    updateSettings({
      ...settings,
      [activeTab]: {
        ...settings[activeTab],
        promos: [...settings[activeTab].promos, promo].sort((a,b) => a.qty - b.qty)
      }
    });
    setNewPromoQty(2); setNewPromoPrice('');
  };

  const deletePromo = (vid: VariantId, pid: string) => {
    updateSettings({ ...settings, [vid]: { ...settings[vid], promos: settings[vid].promos.filter(p => p.id !== pid) } });
  };

  // ── Booking CRUD ──────────────────────────────────────────────────────────
  const cap = (s: string) => s.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const loadBookings = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, BOOKINGS_COLLECTION));
      const data: Booking[] = [];
      snap.forEach(d => {
        const raw = d.data() as any;
        const items: BookingItem[] = raw.items?.length
          ? raw.items
          : [{
              id: makeBookingItemId(),
              variant: raw.variant ?? '80g',
              quantity: raw.quantity ?? 1,
              unitPrice: raw.unitPrice ?? 0,
              totalPrice: raw.totalPrice ?? 0,
              promoLabel: raw.promoLabel,
            }];
        const totalAmount = raw.totalAmount ?? items.reduce((sum, i) => sum + i.totalPrice, 0);
        data.push({ id: d.id, ...raw, items, totalAmount, createdAt: raw.createdAt?.toDate(), updatedAt: raw.updatedAt?.toDate() } as Booking);
      });
      // Sort by createdAt on client side
      data.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
      setBookings(data);
    } catch (error) { 
      console.error("Error loading bookings:", error);
      alert("Error loading bookings"); 
    }
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const v = (name === 'customerName' || name === 'address') ? cap(value) : value;
    setFormData(prev => ({ ...prev, [name]: v }));
  };

  const resetForm = () => { setFormData(makeDefault()); setEditingId(null); setShowForm(false); };

  const updateItem = (id: string, patch: Partial<BookingItem>) => {
    setFormData(prev => {
      const items = prev.items.map(item => {
        if (item.id !== id) return item;
        const variant = patch.variant ?? item.variant;
        const quantity = patch.quantity ?? item.quantity;
        const { unitPrice, totalPrice, promoLabel } = calcPrice(variant, quantity, settings);
        return { ...item, ...patch, variant, quantity, unitPrice, totalPrice, promoLabel };
      });
      const totalAmount = items.reduce((sum, i) => sum + i.totalPrice, 0);
      return { ...prev, items, totalAmount };
    });
  };

  const addItem = () => {
    setFormData(prev => {
      const next = createBookingItem('80g', 1, settings);
      const items = [...prev.items, next];
      const totalAmount = items.reduce((sum, i) => sum + i.totalPrice, 0);
      return { ...prev, items, totalAmount };
    });
  };

  const removeItem = (id: string) => {
    setFormData(prev => {
      const items = prev.items.filter(i => i.id !== id);
      const totalAmount = items.reduce((sum, i) => sum + i.totalPrice, 0);
      return { ...prev, items, totalAmount };
    });
  };

  const sanitizeForFirestore = (value: any): any => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (Array.isArray(value)) {
      const cleaned = value.map(v => sanitizeForFirestore(v)).filter(v => v !== undefined);
      return cleaned.length ? cleaned : undefined;
    }
    if (typeof value === 'object') {
      const cleaned: any = {};
      Object.entries(value).forEach(([k, v]) => {
        const sanitized = sanitizeForFirestore(v);
        if (sanitized !== undefined) cleaned[k] = sanitized;
      });
      return Object.keys(cleaned).length ? cleaned : undefined;
    }
    return value;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.phone || !formData.address) { alert('Fill all required fields'); return; }
    try {
      const { id, createdAt, updatedAt, ...cleanData } = formData;
      const sanitized = sanitizeForFirestore(cleanData);
      const data = { ...sanitized, status: formData.paymentMethod === 'online' ? 'confirmed' : 'pending' };
      if (editingId) {
        await updateDoc(doc(db, BOOKINGS_COLLECTION, editingId), { ...data, updatedAt: Timestamp.now() });
        alert('Booking updated!');
      } else {
        await addDoc(collection(db, BOOKINGS_COLLECTION), { ...data, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
        alert('Booking created!');
      }
      resetForm(); loadBookings();
    } catch (error: any) {
      console.error("Error saving booking:", error);
      alert(`Error saving booking: ${error?.message || error}`);
    }
  };

  const handleEdit = (b: Booking) => {
    const items = b.items?.length
      ? b.items
      : [{
          id: makeBookingItemId(),
          variant: (b as any).variant ?? '80g',
          quantity: (b as any).quantity ?? 1,
          unitPrice: (b as any).unitPrice ?? 0,
          totalPrice: (b as any).totalPrice ?? 0,
          promoLabel: (b as any).promoLabel,
        }];
    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
    setFormData({
      ...b,
      items,
      totalAmount,
      notes: b.notes || '',
    });
    setEditingId(b.id || null); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this booking?')) return;
    try { await deleteDoc(doc(db, BOOKINGS_COLLECTION, id)); loadBookings(); } catch { alert("Error deleting"); }
  };

  const handleStatusChange = async (id: string, s: Booking['status']) => {
    try { await updateDoc(doc(db, BOOKINGS_COLLECTION, id), { status: s, updatedAt: Timestamp.now() }); loadBookings(); }
    catch { alert("Error updating status"); }
  };

  // ── Style helpers ─────────────────────────────────────────────────────────
  const statusColor = (s: string) =>
    ({ pending:'bg-amber-100 text-amber-800 border-amber-200', confirmed:'bg-blue-100 text-blue-800 border-blue-200', completed:'bg-emerald-100 text-emerald-800 border-emerald-200', cancelled:'bg-red-100 text-red-800 border-red-200' }[s] ?? 'bg-slate-100 text-slate-800 border-slate-200');

  const statusIcon = (s: string) =>
    ({ pending:<Clock size={13}/>, confirmed:<CheckCircle size={13}/>, completed:<CheckCircle size={13}/>, cancelled:<XCircle size={13}/> }[s] ?? <AlertCircle size={13}/>);

  // ── Derived ───────────────────────────────────────────────────────────────
  const filtered = bookings
    .filter(b => filterStatus === 'all' || b.status === filterStatus)
    .filter(b => b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || b.phone.includes(searchTerm));

  const stats = {
    total:     bookings.length,
    pending:   bookings.filter(b=>b.status==='pending').length,
    confirmed: bookings.filter(b=>b.status==='confirmed').length,
    completed: bookings.filter(b=>b.status==='completed').length,
    revenue:   bookings.filter(b=>b.status==='completed').reduce((s,b)=>s+(b.totalAmount ?? b.totalPrice ?? 0),0),
    pending$:  bookings.filter(b=>['pending','confirmed'].includes(b.status)).reduce((s,b)=>s+(b.totalAmount ?? b.totalPrice ?? 0),0),
  };

  const officialBase   = OFFICIAL_VARIANTS.find(v => v.id === activeTab)!.officialPrice;
  const currentBase    = settings[activeTab].basePrice;
  const isPriceModified = currentBase !== officialBase;

  const hasPromo      = formData.items.some(i => !!i.promoLabel);
  const savedPerOrder = formData.items.reduce((sum, item) => {
    const base = settings[item.variant]?.basePrice ?? 0;
    return sum + (base - item.unitPrice) * item.quantity;
  }, 0);

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="animate-in fade-in duration-500 pb-16">

      {/* ── HEADER ── */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-7 text-white mb-8 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3.5 rounded-2xl backdrop-blur-sm"><ShoppingCart size={28}/></div>
            <div>
              <h1 className="text-2xl font-black">Bulk Order Booking</h1>
              <p className="text-orange-100 text-sm font-medium mt-0.5">Manage wholesale orders efficiently</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 text-sm border-2 ${showSettings ? 'bg-white text-orange-600 border-white' : 'bg-white/10 hover:bg-white/20 text-white border-white/20'}`}
            >
              <Settings size={16}/> Business Settings
            </button>
            <button
              onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
              className="bg-white text-orange-600 font-black px-5 py-2.5 rounded-xl hover:bg-orange-50 transition-all shadow active:scale-95 text-sm"
            >
              {showForm ? 'Cancel' : '+ New Booking'}
            </button>
          </div>
        </div>
      </div>

      {/* ══ BUSINESS SETTINGS ════════════════════════════════════════════════ */}
      {showSettings && (
        <div className="mb-8 animate-in slide-in-from-top-4 duration-300">

          {/* Settings header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-black text-slate-900">Business Settings</h2>
            <button
              onClick={restoreOfficial}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-600 font-bold rounded-xl text-sm transition-all"
            >
              <RotateCcw size={14}/> Restore Official Pricing
            </button>
          </div>

          {/* Variant tabs */}
          <div className="flex gap-2 mb-5">
            {OFFICIAL_VARIANTS.map(v => (
              <button key={v.id} onClick={() => setActiveTab(v.id)}
                className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === v.id ? 'bg-orange-600 text-white shadow-md' : 'bg-white border-2 border-slate-200 text-slate-500 hover:border-orange-300 hover:text-orange-600'}`}>
                {v.label}
              </button>
            ))}
          </div>

          {/* Two-column panel — mirrors the screenshot */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Left: Base Pricing ── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-sm">
              <h3 className="font-black text-slate-900 text-lg flex items-center gap-2 mb-5">
                <DollarSign size={20} className="text-orange-500"/> Base Pricing
              </h3>

              <div className="flex items-start gap-2 bg-orange-50 border border-orange-100 rounded-xl p-3.5 mb-6">
                <AlertCircle size={16} className="text-orange-400 mt-0.5 shrink-0"/>
                <p className="text-sm text-orange-800">
                  Standard: <strong>RM {officialBase.toFixed(2)}</strong> per piece.
                  {isPriceModified && <span className="ml-2 font-bold text-orange-600">(Custom price set)</span>}
                </p>
              </div>

              <label className="block text-sm font-black text-slate-700 mb-2">Single Piece Price (RM)</label>
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center border-2 border-slate-200 rounded-xl bg-white focus-within:border-orange-500 transition-all overflow-hidden shadow-sm">
                  <span className="pl-4 pr-2 font-black text-slate-400 text-lg select-none">RM</span>
                  <input
                    type="number" min="0.01" step="0.01"
                    value={editPriceVal}
                    onChange={e => setEditPriceVal(e.target.value)}
                    onBlur={commitBasePrice}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitBasePrice(); }}}
                    className="flex-1 py-4 pr-4 bg-transparent font-black text-3xl text-slate-900 outline-none w-0"
                  />
                </div>
                {isPriceModified && (
                  <button onClick={restoreOfficial}
                    className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-all" title="Reset to official">
                    <RotateCcw size={18}/>
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-2">Press Enter or click outside to apply the new price.</p>
            </div>

            {/* ── Right: Bundle Promotions ── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-sm">
              <h3 className="font-black text-slate-900 text-lg flex items-center gap-2 mb-5">
                <Tag size={20} className="text-orange-500"/> Bundle Promotions
                <span className="text-sm font-bold text-slate-400">· {activeTab}</span>
              </h3>

              {/* Promo list */}
              {settings[activeTab].promos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-200 rounded-xl mb-6 text-slate-300">
                  <Tag size={28} className="mb-2"/>
                  <p className="text-sm font-medium text-slate-400">No bundle promos yet</p>
                </div>
              ) : (
                <div className="space-y-2 mb-6">
                  {settings[activeTab].promos.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5">
                      <p className="text-sm text-slate-700">
                        <span className="font-black text-slate-900 text-base">{p.qty} pcs</span>
                        <span className="text-slate-400 mx-2 font-medium">for</span>
                        <span className="font-black text-orange-600 text-base">RM {p.totalPrice.toFixed(2)}</span>
                        <span className="text-xs text-slate-400 ml-3">(RM {(p.totalPrice/p.qty).toFixed(2)}/pc)</span>
                      </p>
                      <button onClick={() => deletePromo(activeTab, p.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add promo */}
              <div className="border-t border-slate-100 pt-5">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Add Custom Promo</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Quantity</label>
                    <input
                      type="number" min="1"
                      value={newPromoQty}
                      onChange={e => setNewPromoQty(parseInt(e.target.value)||1)}
                      className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 bg-white font-bold text-lg focus:border-orange-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Price (RM)</label>
                    <input
                      type="number" min="0.01" step="0.01"
                      value={newPromoPrice}
                      onChange={e => setNewPromoPrice(e.target.value)}
                      placeholder="Price RM"
                      className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 bg-white font-bold text-lg placeholder:text-slate-300 focus:border-orange-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <button onClick={addPromo}
                  className="w-full bg-slate-900 hover:bg-slate-700 text-white font-black py-4 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-sm">
                  <Plus size={18}/> Add Promo Rule
                </button>
              </div>
            </div>
          </div>

          {/* Preview strip for all 3 variants */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {OFFICIAL_VARIANTS.map(v => (
              <div key={v.id} className={`bg-white border-2 rounded-xl p-4 shadow-sm transition-all ${activeTab === v.id ? 'border-orange-300' : 'border-slate-200'}`}>
                <p className="text-xs font-black text-slate-400 uppercase mb-2">{v.label} · current pricing</p>
                <p className="text-sm text-slate-700">Base: <span className="font-black text-slate-900">RM {settings[v.id].basePrice.toFixed(2)}</span>/pc</p>
                {settings[v.id].promos.length > 0
                  ? settings[v.id].promos.map(p => (
                    <p key={p.id} className="text-xs text-emerald-700 font-bold mt-1.5 flex items-center gap-1">
                      <Tag size={10}/> {p.qty} pcs → RM {p.totalPrice.toFixed(2)}
                    </p>
                  ))
                  : <p className="text-xs text-slate-300 mt-1.5">No promos</p>
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STATS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label:'Total Bookings', value: stats.total,                     icon:<Package size={20} className="text-orange-500"/>,   color:'text-slate-900' },
          { label:'Pending',        value: stats.pending,                   sub:`RM ${stats.pending$.toFixed(2)}`, icon:<Clock size={20} className="text-amber-500"/>,    color:'text-amber-600' },
          { label:'Confirmed',      value: stats.confirmed,                 icon:<CheckCircle size={20} className="text-blue-500"/>, color:'text-blue-600' },
          { label:'Revenue',        value:`RM ${stats.revenue.toFixed(2)}`, sub:`${stats.completed} completed`, icon:<CheckCircle size={20} className="text-emerald-500"/>, color:'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">{s.icon}<span className="text-xs font-bold text-slate-400 uppercase">{s.label}</span></div>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            {'sub' in s && s.sub && <p className="text-xs text-slate-400 mt-1">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* ── BOOKING FORM ── */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 mb-8 animate-in slide-in-from-top-4 duration-300">
          <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
            <Package className="text-orange-600"/> {editingId ? 'Edit Booking' : 'New Booking'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><User size={14} className="text-orange-500"/> Customer Name *</label>
                <input type="text" name="customerName" value={formData.customerName} onChange={handleInputChange} placeholder="Full name" required
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 font-medium focus:border-orange-500 focus:bg-white outline-none transition-all"/>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Phone size={14} className="text-orange-500"/> Phone *</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="012-3456789" required
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 font-medium focus:border-orange-500 focus:bg-white outline-none transition-all"/>
              </div>

              {/* Order items */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Package size={14} className="text-orange-500"/> Order items</label>
                <div className="space-y-3">
                  {formData.items.map(item => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-5">
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Size</label>
                        <select
                          value={item.variant}
                          onChange={e => updateItem(item.id, { variant: e.target.value as VariantId })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white font-bold text-sm focus:border-orange-500 outline-none transition-all"
                        >
                          {OFFICIAL_VARIANTS.map(v => (
                            <option key={v.id} value={v.id}>{v.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-4">
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Qty</label>
                        <input
                          type="number" min="1"
                          value={item.quantity}
                          onChange={e => updateItem(item.id, { quantity: parseInt(e.target.value, 10) || 1 })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white font-bold text-sm focus:border-orange-500 outline-none transition-all"
                        />
                      </div>
                      <div className="col-span-3 flex flex-col items-end gap-1">
                        <p className="text-sm font-black text-slate-800">RM {item.totalPrice.toFixed(2)}</p>
                        <p className="text-xs text-slate-400">RM {item.unitPrice.toFixed(2)}/pc</p>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-xs font-bold text-red-500 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                      {item.promoLabel && (
                        <div className="col-span-12 text-xs text-emerald-700 font-bold">
                          Promo: {item.promoLabel}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button type="button" onClick={addItem}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3 rounded-xl transition-all active:scale-95 text-sm">
                  <Plus size={16}/> Add item
                </button>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  <p className="text-sm font-black text-slate-600">Order total</p>
                  <p className="text-xl font-black text-orange-700">RM {formData.totalAmount.toFixed(2)}</p>
                </div>
                {hasPromo && (
                  <p className="text-xs text-emerald-600 mt-1">You saved RM {savedPerOrder.toFixed(2)} on this order.</p>
                )}
              </div>

              {/* Payment method */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><CreditCard size={14} className="text-orange-500"/> Payment Method</label>
                <div className="flex gap-3 max-w-xs">
                  {[
                    { v:'online', icon:<CreditCard size={15}/>, label:'Online',   sel:'border-emerald-500 bg-emerald-50 text-emerald-700' },
                    { v:'cod',    icon:<Wallet size={15}/>,     label:'COD/Cash', sel:'border-amber-500 bg-amber-50 text-amber-700' },
                  ].map(pm => (
                    <button key={pm.v} type="button"
                      onClick={() => setFormData(prev => ({ ...prev, paymentMethod: pm.v as 'online'|'cod' }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold text-sm transition-all ${formData.paymentMethod === pm.v ? pm.sel : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                      {pm.icon}{pm.label}
                    </button>
                  ))}
                </div>
                {formData.paymentMethod === 'cod' && (
                  <p className="text-xs text-amber-600 font-medium flex items-center gap-1 mt-1"><Clock size={11}/> COD orders start as Pending</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><MapPin size={14} className="text-orange-500"/> Delivery Address *</label>
              <textarea name="address" value={formData.address} onChange={handleInputChange} placeholder="Full delivery address" required rows={2}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 font-medium focus:border-orange-500 focus:bg-white outline-none transition-all resize-none"/>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Notes (optional)</label>
              <textarea name="notes" value={formData.notes} onChange={handleInputChange} placeholder="Any special instructions..." rows={2}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 font-medium focus:border-orange-500 focus:bg-white outline-none transition-all resize-none"/>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-xl shadow-lg shadow-orange-100 transition-all active:scale-95">
                {editingId ? 'Update Booking' : 'Create Booking'}
              </button>
              <button type="button" onClick={resetForm} className="px-8 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black py-4 rounded-xl transition-all">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ── FILTERS ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17}/>
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by name or phone..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 font-medium focus:border-orange-500 focus:bg-white outline-none transition-all text-sm"/>
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all','pending','confirmed','completed','cancelled'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all capitalize ${filterStatus===s ? 'bg-orange-600 text-white shadow' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {s}{s!=='all' && ` (${bookings.filter(b=>b.status===s).length})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── TABLE ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="bg-orange-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse"><Package className="text-orange-400"/></div>
            <p className="text-slate-400 font-medium">Loading bookings...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="bg-slate-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"><ShoppingCart className="text-slate-300"/></div>
            <h3 className="text-lg font-bold text-slate-600">No bookings found</h3>
            <p className="text-slate-400 text-sm mt-1">{searchTerm||filterStatus!=='all' ? 'Try adjusting your filters.' : 'Create your first booking!'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Customer','Contact','Size','Qty','Unit Price','Total','Payment','Status','Date',''].map((h,i) => (
                    <th key={i} className="px-5 py-4 text-left text-xs font-black text-slate-400 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-black text-sm shrink-0">
                          {b.customerName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate max-w-[140px]">{b.customerName}</p>
                          <p className="text-xs text-slate-400 truncate max-w-[140px]">{b.address}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-600 whitespace-nowrap">{b.phone}</td>
                    <td className="px-5 py-4">
                      {(() => {
                        const items = b.items ?? [];
                        const first = items[0];
                        const more = Math.max(0, (items.length ?? 0) - 1);
                        return (
                          <div className="space-y-1">
                            <span className="px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg text-xs font-black inline-flex items-center gap-1">
                              {first?.variant ?? '—'}
                              {more > 0 && <span className="text-[10px] font-bold text-slate-500">+{more}</span>}
                            </span>
                            {items.length > 1 && (
                              <p className="text-xs text-slate-400 truncate max-w-[140px]">{items.map(i => `${i.variant} x${i.quantity}`).join(', ')}</p>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-slate-900 whitespace-nowrap">
                      {(() => {
                        const qty = (b.items ?? []).reduce((sum, i) => sum + i.quantity, 0) || (b.quantity ?? 0);
                        return `${qty} pcs`;
                      })()}
                    </td>
                    <td className="px-5 py-4">
                      {(() => {
                        const items = b.items ?? [];
                        const qty = items.reduce((sum, i) => sum + i.quantity, 0) || 1;
                        const unit = ((b.totalAmount ?? b.totalPrice ?? 0) / qty).toFixed(2);
                        return <p className="text-sm font-bold text-slate-700">RM {unit}</p>;
                      })()}
                      {(b.items ?? []).some(i => !!i.promoLabel) && (
                        <p className="text-xs text-emerald-600 font-bold mt-0.5 flex items-center gap-1 whitespace-nowrap"><Tag size={10}/>Promo</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm font-black text-orange-700 whitespace-nowrap">RM {(b.totalAmount ?? b.totalPrice ?? 0).toFixed(2)}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-black uppercase border whitespace-nowrap ${b.paymentMethod==='online' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {b.paymentMethod}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <select value={b.status} onChange={e => handleStatusChange(b.id!, e.target.value as Booking['status'])}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase border cursor-pointer outline-none ${statusColor(b.status)}`}>
                        {['pending','confirmed','completed','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-4 text-xs whitespace-nowrap">
                      <p className="font-bold text-slate-700">{b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '-'}</p>
                      <p className="text-slate-400">{b.createdAt ? new Date(b.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : ''}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setViewingBooking(b)} className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg transition-all"><Eye size={16}/></button>
                        <button onClick={() => handleEdit(b)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16}/></button>
                        <button onClick={() => handleDelete(b.id!)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-5 p-4 bg-orange-50 rounded-xl border border-orange-100">
        <p className="text-sm text-orange-800 font-medium flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0"/>
          <span><strong>Tip:</strong> Online payments → auto Confirmed · COD → Pending · Use <strong>Business Settings</strong> to manage pricing & bundle promos per size.</span>
        </p>
      </div>

      {/* ── DETAIL MODAL ── */}
      {viewingBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-white rounded-t-3xl sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-3 rounded-xl"><Eye size={20}/></div>
                  <div><h2 className="text-xl font-black">Booking Details</h2><p className="text-orange-100 text-xs font-medium">Complete order info</p></div>
                </div>
                <button onClick={() => setViewingBooking(null)} className="p-2 hover:bg-white/20 rounded-xl transition-all"><X size={20}/></button>
              </div>
            </div>

            <div className="p-7 space-y-6">
              <section className="space-y-3">
                <h3 className="font-black text-slate-800 flex items-center gap-2 pb-2 border-b-2 border-slate-100"><User size={17} className="text-orange-500"/> Customer</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200"><p className="text-xs font-bold text-slate-400 uppercase mb-1">Name</p><p className="font-black text-slate-900">{viewingBooking.customerName}</p></div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200"><p className="text-xs font-bold text-slate-400 uppercase mb-1">Phone</p><p className="font-bold text-slate-900">{viewingBooking.phone}</p></div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200"><p className="text-xs font-bold text-slate-400 uppercase mb-1">Address</p><p className="text-sm font-medium text-slate-800">{viewingBooking.address}</p></div>
              </section>

              <section className="space-y-3">
                <h3 className="font-black text-slate-800 flex items-center gap-2 pb-2 border-b-2 border-slate-100"><Package size={17} className="text-orange-500"/> Order</h3>
                <div className="space-y-3">
                  {(viewingBooking.items ?? []).map(item => (
                    <div key={item.id} className="grid grid-cols-3 gap-3">
                      <div className="bg-orange-50 rounded-xl p-4 border-2 border-orange-100 text-center">
                        <p className="text-xs font-bold text-orange-500 uppercase mb-1">Size</p>
                        <p className="text-2xl font-black text-orange-900">{item.variant}</p>
                      </div>
                      <div className="bg-orange-50 rounded-xl p-4 border-2 border-orange-100 text-center">
                        <p className="text-xs font-bold text-orange-500 uppercase mb-1">Qty</p>
                        <p className="text-2xl font-black text-orange-900">{item.quantity}<span className="text-sm ml-1 font-medium">pcs</span></p>
                      </div>
                      <div className="bg-orange-50 rounded-xl p-4 border-2 border-orange-100 text-center">
                        <p className="text-xs font-bold text-orange-500 uppercase mb-1">Total</p>
                        <p className="text-xl font-black text-orange-900">RM {item.totalPrice.toFixed(2)}</p>
                      </div>
                      {item.promoLabel && (
                        <div className="col-span-3 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                          <Tag size={14} className="text-emerald-600 shrink-0"/>
                          <p className="text-sm font-bold text-emerald-800">Promo applied: {item.promoLabel}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-600">Order total</p>
                  <p className="text-xl font-black text-orange-900">RM {(viewingBooking.totalAmount ?? viewingBooking.totalPrice ?? 0).toFixed(2)}</p>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="font-black text-slate-800 flex items-center gap-2 pb-2 border-b-2 border-slate-100"><CreditCard size={17} className="text-orange-500"/> Payment & Status</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Payment</p>
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-black uppercase border ${viewingBooking.paymentMethod==='online' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {viewingBooking.paymentMethod==='online' ? <CreditCard size={13}/> : <Wallet size={13}/>} {viewingBooking.paymentMethod}
                    </span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Status</p>
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-black uppercase border ${statusColor(viewingBooking.status)}`}>
                      {statusIcon(viewingBooking.status)} {viewingBooking.status}
                    </span>
                  </div>
                </div>
              </section>

              {viewingBooking.notes && (
                <section>
                  <h3 className="font-black text-slate-800 flex items-center gap-2 pb-2 border-b-2 border-slate-100 mb-3"><AlertCircle size={17} className="text-orange-500"/> Notes</h3>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4"><p className="text-sm font-medium text-slate-800">{viewingBooking.notes}</p></div>
                </section>
              )}

              <div className="flex gap-3">
                <button onClick={() => { handleEdit(viewingBooking); setViewingBooking(null); }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 rounded-xl transition-all flex items-center justify-center gap-2">
                  <Edit2 size={16}/> Edit Booking
                </button>
                <button onClick={() => setViewingBooking(null)} className="px-8 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black py-3.5 rounded-xl transition-all">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingSystem;