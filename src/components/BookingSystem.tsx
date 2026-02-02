import React, { useState, useEffect } from 'react';
import { 
  Package, 
  User, 
  Phone, 
  MapPin, 
  CreditCard, 
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Calendar,
  ShoppingCart,
  AlertCircle,
  Filter,
  Search,
  Eye,
  X
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  Timestamp,
  query,
  orderBy
} from "firebase/firestore";
import { db } from '../firebaseConfig';

interface Booking {
  id?: string;
  customerName: string;
  phone: string;
  address: string;
  quantity: number;
  paymentMethod: 'online' | 'cod';
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  totalPrice: number;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const BOOKINGS_COLLECTION = "bookings";
const BASE_PRICE = 3.0; // RM 3.00 per unit

const BookingSystem: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
  
  const [formData, setFormData] = useState<Booking>({
    customerName: '',
    phone: '',
    address: '',
    quantity: 1,
    paymentMethod: 'cod',
    status: 'pending',
    totalPrice: BASE_PRICE,
    notes: ''
  });

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    // Auto-calculate total price based on quantity
    setFormData(prev => ({
      ...prev,
      totalPrice: prev.quantity * BASE_PRICE
    }));
  }, [formData.quantity]);

  // Function to capitalize each word
  const capitalizeWords = (str: string) => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const loadBookings = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, BOOKINGS_COLLECTION), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const bookingsData: Booking[] = [];
      
      querySnapshot.forEach((doc) => {
        bookingsData.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        } as Booking);
      });
      
      setBookings(bookingsData);
    } catch (error) {
      console.error("Error loading bookings:", error);
      alert("Error loading bookings");
    }
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    let processedValue = value;
    
    // Auto-capitalize customer name and address as user types
    if (name === 'customerName' || name === 'address') {
      processedValue = capitalizeWords(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value) || 1 : processedValue
    }));
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      phone: '',
      address: '',
      quantity: 1,
      paymentMethod: 'cod',
      status: 'pending',
      totalPrice: BASE_PRICE,
      notes: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.phone || !formData.address) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      // Prepare booking data with auto-status based on payment method
      const bookingData = {
        ...formData,
        status: formData.paymentMethod === 'online' ? 'confirmed' : 'pending'
      };

      if (editingId) {
        // Update existing booking
        await updateDoc(doc(db, BOOKINGS_COLLECTION, editingId), {
          ...bookingData,
          updatedAt: Timestamp.now()
        });
        alert('Booking updated successfully!');
      } else {
        // Create new booking
        await addDoc(collection(db, BOOKINGS_COLLECTION), {
          ...bookingData,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        alert('Booking created successfully!');
      }
      
      resetForm();
      loadBookings();
    } catch (error) {
      console.error("Error saving booking:", error);
      alert("Error saving booking");
    }
  };

  const handleEdit = (booking: Booking) => {
    setFormData({
      customerName: booking.customerName,
      phone: booking.phone,
      address: booking.address,
      quantity: booking.quantity,
      paymentMethod: booking.paymentMethod,
      status: booking.status,
      totalPrice: booking.totalPrice,
      notes: booking.notes || ''
    });
    setEditingId(booking.id || null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this booking?')) {
      try {
        await deleteDoc(doc(db, BOOKINGS_COLLECTION, id));
        alert('Booking deleted successfully!');
        loadBookings();
      } catch (error) {
        console.error("Error deleting booking:", error);
        alert("Error deleting booking");
      }
    }
  };

  const handleStatusChange = async (id: string, newStatus: Booking['status']) => {
    try {
      await updateDoc(doc(db, BOOKINGS_COLLECTION, id), {
        status: newStatus,
        updatedAt: Timestamp.now()
      });
      loadBookings();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Error updating status");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={14} />;
      case 'confirmed': return <CheckCircle size={14} />;
      case 'completed': return <CheckCircle size={14} />;
      case 'cancelled': return <XCircle size={14} />;
      default: return <AlertCircle size={14} />;
    }
  };

  // Filter bookings
  const filteredBookings = bookings
    .filter(booking => filterStatus === 'all' || booking.status === filterStatus)
    .filter(booking => 
      booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.phone.includes(searchTerm)
    );

  // Calculate statistics
  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    totalRevenue: bookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + b.totalPrice, 0),
    pendingRevenue: bookings
      .filter(b => b.status === 'pending' || b.status === 'confirmed')
      .reduce((sum, b) => sum + b.totalPrice, 0)
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-8 text-white mb-8 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
              <ShoppingCart size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black">Bulk Order Booking System</h1>
              <p className="text-orange-100 font-medium mt-1">Manage your wholesale orders efficiently</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-white text-orange-600 font-black px-6 py-3 rounded-xl hover:bg-orange-50 transition-all shadow-lg active:scale-95"
          >
            {showForm ? 'Cancel' : '+ New Booking'}
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm font-bold">Total Bookings</span>
            <Package className="text-orange-500" size={24} />
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.total}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm font-bold">Pending Orders</span>
            <Clock className="text-amber-500" size={24} />
          </div>
          <p className="text-3xl font-black text-amber-600">{stats.pending}</p>
          <p className="text-xs text-slate-400 mt-1">RM {stats.pendingRevenue.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm font-bold">Confirmed</span>
            <CheckCircle className="text-blue-500" size={24} />
          </div>
          <p className="text-3xl font-black text-blue-600">{stats.confirmed}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm font-bold">Total Revenue</span>
            <CheckCircle className="text-emerald-500" size={24} />
          </div>
          <p className="text-3xl font-black text-emerald-600">RM {stats.totalRevenue.toFixed(2)}</p>
          <p className="text-xs text-slate-400 mt-1">{stats.completed} completed</p>
        </div>
      </div>

      {/* Booking Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 mb-8 animate-in slide-in-from-top-4 duration-300">
          <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
            <Package className="text-orange-600" />
            {editingId ? 'Edit Booking' : 'New Bulk Order Booking'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Name */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-900 flex items-center gap-1">
                  <User size={16} className="text-orange-600" />
                  Customer Name *
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  placeholder="Enter full name"
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 font-medium focus:border-orange-500 focus:bg-white outline-none transition-all"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-900 flex items-center gap-1">
                  <Phone size={16} className="text-orange-600" />
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="e.g., 012-3456789"
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 font-medium focus:border-orange-500 focus:bg-white outline-none transition-all"
                />
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-900 flex items-center gap-1">
                  <Package size={16} className="text-orange-600" />
                  Quantity
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="1"
                    required
                    className="w-full px-4 py-3 pr-16 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 font-bold text-xl focus:border-orange-500 focus:bg-white outline-none transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    pcs
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Total: RM {formData.totalPrice.toFixed(2)} ({formData.quantity} × RM {BASE_PRICE.toFixed(2)})
                </p>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-900 flex items-center gap-1">
                  <CreditCard size={16} className="text-orange-600" />
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'online' }))}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold transition-all ${
                      formData.paymentMethod === 'online'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <CreditCard size={18} />
                    Online
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'cod' }))}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold transition-all ${
                      formData.paymentMethod === 'cod'
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Wallet size={18} />
                    COD/Cash
                  </button>
                </div>
                {formData.paymentMethod === 'cod' && (
                  <p className="text-xs text-amber-600 font-medium flex items-center gap-1 mt-2">
                    <Clock size={12} />
                    COD orders will be set as "Pending" status
                  </p>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-900 flex items-center gap-1">
                <MapPin size={16} className="text-orange-600" />
                Delivery Address *
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Enter complete delivery address"
                required
                rows={3}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 font-medium focus:border-orange-500 focus:bg-white outline-none transition-all resize-none"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-900">
                Additional Notes (Optional)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Any special instructions or requests..."
                rows={2}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 font-medium focus:border-orange-500 focus:bg-white outline-none transition-all resize-none"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-xl shadow-lg shadow-orange-200 transition-all active:scale-95"
              >
                {editingId ? 'Update Booking' : 'Create Booking'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-8 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black py-4 rounded-xl transition-all active:scale-95"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or phone..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 font-medium focus:border-orange-500 focus:bg-white outline-none transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-3 rounded-xl font-bold transition-all capitalize ${
                  filterStatus === status
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status} {status !== 'all' && `(${bookings.filter(b => b.status === status).length})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Package className="text-purple-600" />
            </div>
            <p className="text-slate-500 font-medium">Loading bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 text-center">
            <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">No bookings found</h3>
            <p className="text-slate-500 max-w-md mx-auto mt-2">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your filters or search term' 
                : 'Start by creating your first bulk order booking!'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Quantity</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Total</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Payment</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Date</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-black">
                          {booking.customerName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{booking.customerName}</p>
                          <p className="text-xs text-slate-500 truncate max-w-[200px]" title={booking.address}>
                            {booking.address}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-700">{booking.phone}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-900">{booking.quantity} pcs</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-orange-700">RM {booking.totalPrice.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-black uppercase border ${
                        booking.paymentMethod === 'online'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {booking.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={booking.status}
                        onChange={(e) => handleStatusChange(booking.id!, e.target.value as Booking['status'])}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase border cursor-pointer outline-none ${getStatusColor(booking.status)}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-600">
                        <p className="font-semibold">
                          {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : '-'}
                        </p>
                        <p className="text-slate-400">
                          {booking.createdAt ? new Date(booking.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setViewingBooking(booking)}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                          title="View details"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleEdit(booking)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Edit booking"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(booking.id!)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete booking"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-orange-50 rounded-xl border border-orange-100">
        <p className="text-sm text-orange-900 font-medium flex items-center gap-2">
          <AlertCircle size={16} />
          <span>
            <strong>Tip:</strong> Online payments are automatically marked as "Confirmed", while COD/Cash orders start as "Pending". 
            You can change the status anytime by clicking the status dropdown.
          </span>
        </p>
      </div>

      {/* View Details Modal */}
      {viewingBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-white rounded-t-3xl sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                    <Eye size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black">Booking Details</h2>
                    <p className="text-orange-100 text-sm font-medium">Complete order information</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingBooking(null)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-8 space-y-6">
              {/* Customer Info Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 pb-2 border-b-2 border-orange-100">
                  <User size={20} className="text-orange-600" />
                  Customer Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Full Name</p>
                    <p className="text-lg font-black text-slate-900">{viewingBooking.customerName}</p>
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                      <Phone size={12} />
                      Phone Number
                    </p>
                    <p className="text-lg font-bold text-slate-900">{viewingBooking.phone}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                    <MapPin size={12} />
                    Delivery Address
                  </p>
                  <p className="text-sm font-medium text-slate-900 leading-relaxed">{viewingBooking.address}</p>
                </div>
              </div>

              {/* Order Details Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 pb-2 border-b-2 border-orange-100">
                  <Package size={20} className="text-orange-600" />
                  Order Details
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-orange-50 rounded-xl p-4 border-2 border-orange-200">
                    <p className="text-xs font-bold text-orange-700 uppercase mb-1">Quantity</p>
                    <p className="text-3xl font-black text-orange-900">{viewingBooking.quantity}</p>
                    <p className="text-xs text-orange-600 mt-1">pcs</p>
                  </div>
                  
                  <div className="bg-orange-50 rounded-xl p-4 border-2 border-orange-200">
                    <p className="text-xs font-bold text-orange-700 uppercase mb-1">Total Price</p>
                    <p className="text-3xl font-black text-orange-900">RM {viewingBooking.totalPrice.toFixed(2)}</p>
                    <p className="text-xs text-orange-600 mt-1">{viewingBooking.quantity} × RM {BASE_PRICE.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Payment & Status Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 pb-2 border-b-2 border-orange-100">
                  <CreditCard size={20} className="text-orange-600" />
                  Payment & Status
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Payment Method</p>
                    <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-black uppercase border ${
                      viewingBooking.paymentMethod === 'online'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {viewingBooking.paymentMethod === 'online' ? <CreditCard size={16} /> : <Wallet size={16} />}
                      {viewingBooking.paymentMethod}
                    </span>
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Order Status</p>
                    <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-black uppercase border ${getStatusColor(viewingBooking.status)}`}>
                      {getStatusIcon(viewingBooking.status)}
                      {viewingBooking.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              {viewingBooking.notes && (
                <div className="space-y-4">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 pb-2 border-b-2 border-orange-100">
                    <AlertCircle size={20} className="text-orange-600" />
                    Additional Notes
                  </h3>
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <p className="text-sm font-medium text-slate-900 leading-relaxed">{viewingBooking.notes}</p>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="space-y-4">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 pb-2 border-b-2 border-orange-100">
                  <Calendar size={20} className="text-orange-600" />
                  Timeline
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Created On</p>
                    <p className="text-sm font-bold text-slate-900">
                      {viewingBooking.createdAt ? new Date(viewingBooking.createdAt).toLocaleDateString('en-MY', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      }) : '-'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {viewingBooking.createdAt ? new Date(viewingBooking.createdAt).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      }) : ''}
                    </p>
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Last Updated</p>
                    <p className="text-sm font-bold text-slate-900">
                      {viewingBooking.updatedAt ? new Date(viewingBooking.updatedAt).toLocaleDateString('en-MY', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      }) : '-'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {viewingBooking.updatedAt ? new Date(viewingBooking.updatedAt).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      }) : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => {
                    handleEdit(viewingBooking);
                    setViewingBooking(null);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Edit2 size={18} />
                  Edit Booking
                </button>
                <button
                  onClick={() => setViewingBooking(null)}
                  className="px-8 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black py-3 rounded-xl transition-all active:scale-95"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingSystem;