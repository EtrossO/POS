import React, { useState, useEffect } from 'react';
import { Package, User, ShoppingBag, CreditCard, Wallet, CheckCircle, Tag } from 'lucide-react';
import { PromoRule, PaymentMethod, Sale } from '../types';
import { calculatePrice } from '../utils/pricing';
import { addSale } from '../salesService';

interface OrderFormProps {
  promos: PromoRule[];
  basePrice: number;
  onAddSale: (sale: Sale) => void;
}

const OrderForm: React.FC<OrderFormProps> = ({ promos, basePrice, onAddSale }) => {
  const [customerName, setCustomerName] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [pricingInfo, setPricingInfo] = useState({ total: 0, applied: [] as string[], standardTotal: 0, savings: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const info = calculatePrice(quantity, basePrice, promos);
    setPricingInfo(info);
  }, [quantity, basePrice, promos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0 || isSubmitting) return;

    setIsSubmitting(true);

    const newSale: Sale = {
      id: Date.now().toString(),
      customerName: customerName || 'Guest Customer',
      quantity,
      totalPrice: pricingInfo.total,
      paymentMethod,
      timestamp: Date.now(),
      appliedPromos: pricingInfo.applied
    };

    try {
      // Save to Firebase
      const result = await addSale({
        customerName: newSale.customerName,
        quantity: newSale.quantity,
        total: newSale.totalPrice,
        paymentMethod: newSale.paymentMethod === PaymentMethod.CASH ? 'cash' : 'qr',
        productName: 'Kacang Parpu',
        pricePerUnit: basePrice,
        appliedPromos: newSale.appliedPromos
      });

      if (result.success) {
        // Update the sale ID with Firebase ID
        newSale.id = result.id || newSale.id;
        
        // Call the parent's onAddSale to update local state
        onAddSale(newSale);

        // Reset form
        setCustomerName('');
        setQuantity(1);
        setPaymentMethod(PaymentMethod.CASH);
      } else {
        alert('Error saving sale to database. Please try again.');
        console.error('Firebase error:', result.error);
      }
    } catch (error) {
      console.error('Error submitting sale:', error);
      alert('Error saving sale. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="bg-orange-500 p-6 text-white">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag /> New Sale
          </h2>
          <p className="opacity-80 font-medium">Kacang Parpu Official POS</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Name */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-900 block">Customer Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Optional: Enter Name"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-white outline-none transition-all font-medium"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-900 block">Quantity (pcs)</label>
              <div className="flex items-center gap-4">
                <button 
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center text-slate-900 text-xl font-black hover:bg-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="flex-1 text-center py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xl font-black focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none"
                  disabled={isSubmitting}
                />
                <button 
                   type="button"
                   onClick={() => setQuantity(quantity + 1)}
                   className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center text-slate-900 text-xl font-black hover:bg-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                   disabled={isSubmitting}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-900 block">Payment Method</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPaymentMethod(PaymentMethod.CASH)}
                className={`flex items-center justify-center gap-3 py-4 rounded-xl border-2 transition-all ${
                  paymentMethod === PaymentMethod.CASH 
                    ? 'border-orange-500 bg-orange-50 text-orange-800' 
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                }`}
                disabled={isSubmitting}
              >
                <Wallet size={20} className={paymentMethod === PaymentMethod.CASH ? 'text-orange-600' : 'text-slate-400'} />
                <span className="font-black">CASH</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod(PaymentMethod.QR)}
                className={`flex items-center justify-center gap-3 py-4 rounded-xl border-2 transition-all ${
                  paymentMethod === PaymentMethod.QR 
                    ? 'border-sky-500 bg-sky-50 text-sky-800' 
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                }`}
                disabled={isSubmitting}
              >
                <CreditCard size={20} className={paymentMethod === PaymentMethod.QR ? 'text-sky-600' : 'text-slate-400'} />
                <span className="font-black">QR PAY</span>
              </button>
            </div>
          </div>

          {/* Summary Box */}
          <div className="bg-slate-100 rounded-2xl p-6 space-y-4 border border-slate-200">
            <div className="space-y-2 pb-2">
              <div className="flex justify-between items-center text-slate-600 font-bold">
                <span>Standard Price ({quantity} x RM {basePrice.toFixed(2)})</span>
                <span className={pricingInfo.savings > 0 ? "line-through opacity-50" : ""}>
                  RM {pricingInfo.standardTotal.toFixed(2)}
                </span>
              </div>
              
              {pricingInfo.applied.length > 0 && (
                <div className="flex flex-col gap-1">
                  {pricingInfo.applied.map((p, i) => (
                    <div key={i} className="flex justify-between items-center text-emerald-600 text-sm font-black">
                      <span className="flex items-center gap-1"><CheckCircle size={14} /> {p} Applied</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center text-emerald-700 text-sm font-black bg-emerald-50 p-2 rounded-lg mt-1 border border-emerald-100">
                    <span className="flex items-center gap-1"><Tag size={14} /> Total Savings:</span>
                    <span>- RM {pricingInfo.savings.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-300 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-black">Final Total Price</p>
                <p className="text-5xl font-black text-orange-600">RM {pricingInfo.total.toFixed(2)}</p>
              </div>
              <button 
                type="submit"
                disabled={isSubmitting}
                className={`w-full md:w-auto font-black py-4 px-12 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-lg ${
                  isSubmitting
                    ? 'bg-slate-400 cursor-not-allowed shadow-slate-200'
                    : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-200 active:scale-95'
                }`}
              >
                {isSubmitting ? 'Processing...' : 'Complete Sale'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderForm;