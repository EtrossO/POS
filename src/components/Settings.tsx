
import React, { useState } from 'react';
import { Plus, Trash2, Save, DollarSign, Tag, Info, AlertCircle, X, RefreshCw } from 'lucide-react';
import { PromoRule } from '../types';

interface SettingsProps {
  promos: PromoRule[];
  setPromos: React.Dispatch<React.SetStateAction<PromoRule[]>>;
  basePrice: number;
  setBasePrice: React.Dispatch<React.SetStateAction<number>>;
}

const Settings: React.FC<SettingsProps> = ({ promos, setPromos, basePrice, setBasePrice }) => {
  const [newPromo, setNewPromo] = useState({ quantity: 1, price: 0 });
  const [deletingPromoId, setDeletingPromoId] = useState<string | null>(null);

  const restoreDefaults = () => {
    if (confirm("Restore to Official Kacang Parpu Pricing? (RM 3/pc, 2pcs RM 5, 4pcs RM 10)")) {
      setBasePrice(3);
      setPromos([
        { id: '1', quantity: 2, price: 5 },
        { id: '2', quantity: 4, price: 10 }
      ]);
    }
  };

  const addPromo = () => {
    if (newPromo.quantity <= 0 || newPromo.price <= 0) return;
    setPromos([...promos, { id: Date.now().toString(), ...newPromo }]);
    setNewPromo({ quantity: 1, price: 0 });
  };

  const removePromo = (id: string) => {
    setPromos(promos.filter(p => p.id !== id));
    setDeletingPromoId(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Business Settings</h2>
        <button
          type="button"
          onClick={restoreDefaults}
          className="flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-2 rounded-xl transition-all active:scale-95 text-sm"
        >
          <RefreshCw size={16} /> Restore Official Pricing
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Base Pricing */}
        <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="text-orange-500" />
            <h3 className="text-lg font-bold text-slate-800">Base Pricing</h3>
          </div>
          
          <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl flex items-start gap-3">
            <Info className="text-orange-600 shrink-0 mt-0.5" size={18} />
            <p className="text-xs text-orange-800 leading-relaxed font-medium">
              Standard: RM 3.00 per piece.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-900 block">Single Piece Price (RM)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-900">RM</span>
              <input
                type="number"
                step="0.5"
                value={basePrice}
                onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xl font-black focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>
        </section>

        {/* Promotions */}
        <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="text-orange-500" />
            <h3 className="text-lg font-bold text-slate-800">Bundle Promotions</h3>
          </div>

          <div className="space-y-4">
            {promos.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No promotions set.</p>
            ) : (
              <div className="space-y-3">
                {promos.sort((a,b) => a.quantity - b.quantity).map(promo => (
                  <div key={promo.id} className="flex items-center justify-between p-4 bg-slate-100 rounded-xl border border-slate-200 group transition-all">
                    <div>
                      <span className="font-black text-slate-900">{promo.quantity} pcs</span>
                      <span className="text-slate-500 mx-2 font-medium">for</span>
                      <span className="font-black text-orange-600">RM {promo.price.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {deletingPromoId === promo.id ? (
                        <>
                          <button 
                            type="button"
                            onClick={() => removePromo(promo.id)}
                            className="px-3 py-1 bg-red-600 text-white text-[10px] font-black rounded-lg"
                          >
                            Delete?
                          </button>
                          <button 
                            type="button"
                            onClick={() => setDeletingPromoId(null)}
                            className="p-1 text-slate-400"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <button 
                          type="button"
                          onClick={() => setDeletingPromoId(promo.id)}
                          className="text-slate-400 hover:text-red-600 transition-colors p-1"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-slate-200">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Add Custom Promo</h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase ml-1">Quantity</span>
                  <input
                    type="number"
                    placeholder="Qty (pcs)"
                    value={newPromo.quantity || ''}
                    onChange={(e) => setNewPromo({...newPromo, quantity: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none text-sm font-black placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase ml-1">Price (RM)</span>
                  <input
                    type="number"
                    placeholder="Price RM"
                    value={newPromo.price || ''}
                    onChange={(e) => setNewPromo({...newPromo, price: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none text-sm font-black placeholder:text-slate-400"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={addPromo}
                className="w-full bg-slate-900 text-white font-black py-3 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Plus size={18} /> Add Promo Rule
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
