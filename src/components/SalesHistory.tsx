import React, { useState, useEffect } from 'react';
import { Trash2, Calendar, User, Hash, DollarSign, AlertCircle, X } from 'lucide-react';
import { Sale, PaymentMethod } from '../types';
import { getAllSales, deleteSale } from '../salesService';

interface SalesHistoryProps {
  sales: Sale[];
  onDelete: (id: string) => void;
  onSalesLoaded?: (sales: Sale[]) => void;
}

const SalesHistory: React.FC<SalesHistoryProps> = ({ sales: propSales, onDelete, onSalesLoaded }) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sales, setSales] = useState<Sale[]>(propSales);
  const [loading, setLoading] = useState(true);

  // Load sales from Firebase on mount
  useEffect(() => {
    loadSalesFromFirebase();
  }, []);

  // Update local state when props change
  useEffect(() => {
    setSales(propSales);
  }, [propSales]);

  const loadSalesFromFirebase = async () => {
    setLoading(true);
    const result = await getAllSales();
    
    if (result.success && result.data.length > 0) {
      // Convert Firebase format to your Sale format
      const convertedSales: Sale[] = result.data.map((fbSale: any) => ({
        id: fbSale.id,
        customerName: fbSale.customerName,
        quantity: fbSale.quantity,
        totalPrice: fbSale.total,
        paymentMethod: fbSale.paymentMethod === 'cash' ? PaymentMethod.CASH : PaymentMethod.QR,
        timestamp: fbSale.timestamp instanceof Date ? fbSale.timestamp.getTime() : new Date(fbSale.timestamp).getTime(),
        appliedPromos: fbSale.appliedPromos || []
      }));
      
      setSales(convertedSales);
      
      // Notify parent component if callback provided
      if (onSalesLoaded) {
        onSalesLoaded(convertedSales);
      }
    }
    
    setLoading(false);
  };

  const toTitleCase = (s: string) =>
    s
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

  const handleDeleteClick = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deletingId === id) {
      // Confirm delete - delete from Firebase
      const result = await deleteSale(id);
      
      if (result.success) {
        // Call parent's onDelete to update local state
        onDelete(id);
        
        // Update local state
        setSales(sales.filter(s => s.id !== id));
        setDeletingId(null);
      } else {
        alert('Error deleting sale. Please try again.');
        console.error('Firebase delete error:', result.error);
      }
    } else {
      setDeletingId(id);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm animate-in fade-in duration-500">
        <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Hash className="text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">Loading sales history...</h3>
        <p className="text-slate-500 max-w-xs mx-auto mt-2">Please wait while we fetch your data.</p>
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm animate-in fade-in duration-500">
        <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Hash className="text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">No sales records yet</h3>
        <p className="text-slate-500 max-w-xs mx-auto mt-2">Start recording your sales to see the history here.</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Transaction History</h2>
        <span className="bg-slate-100 text-slate-600 text-sm font-bold px-3 py-1 rounded-full">
          {sales.length} Total Sales
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Qty</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.map((sale) => {
                const formattedName = toTitleCase(sale.customerName || 'Guest Customer');
                return (
                <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-800">
                        {new Date(sale.timestamp).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs">
                        {formattedName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-slate-700">{formattedName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm font-bold text-slate-700">{sale.quantity}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase border ${
                      sale.paymentMethod === PaymentMethod.CASH 
                        ? 'bg-amber-50 text-amber-600 border-amber-200' 
                        : 'bg-sky-50 text-sky-600 border-sky-200'
                    }`}>
                      {sale.paymentMethod}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-black text-slate-800">RM {sale.totalPrice.toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      {deletingId === sale.id ? (
                        <>
                          <button 
                            type="button"
                            onClick={(e) => handleDeleteClick(e, sale.id)}
                            className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-xs font-black rounded-lg animate-pulse shadow-md"
                          >
                            <AlertCircle size={14} /> Confirm?
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setDeletingId(null); }}
                            className="p-1 text-slate-400 hover:text-slate-600"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <button 
                          type="button"
                          onClick={(e) => handleDeleteClick(e, sale.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete record"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesHistory;