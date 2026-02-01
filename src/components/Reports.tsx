import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import React, { useState, useEffect } from 'react';
import { FileDown, FileText, Calendar, Table, Download } from 'lucide-react';
import { Sale, PaymentMethod } from '../types';
import { getAllSales } from '../salesService';

interface ReportsProps {
  sales: Sale[];
}

const Reports: React.FC<ReportsProps> = ({ sales: propSales }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
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
    }
    
    setLoading(false);
  };

  const formatDate = (timestamp: string | number | Date, includeTime: boolean = true) => {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    let formatted = `${day}/${month}/${year}`;
    if (includeTime) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      formatted += ` ${hours}:${minutes}`;
    }
    return formatted;
  };

  const titleCase = (name: string) => {
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  const filterSalesByDate = (dateStr: string) => {
    return sales.filter(s => new Date(s.timestamp).toISOString().split('T')[0] === dateStr);
  };

  const filterSalesByMonth = (monthStr: string) => {
    return sales.filter(s => new Date(s.timestamp).toISOString().slice(0, 7) === monthStr);
  };

  const downloadCSV = (filteredSales: Sale[], filename: string) => {
    if (filteredSales.length === 0) {
      alert("No data found for the selected period.");
      return;
    }

    const headers = ["ID", "Timestamp", "Customer Name", "Quantity", "Total Price (RM)", "Payment Method", "Promos"];
    
    const rows = filteredSales.map(s => [
      s.id,
      new Date(s.timestamp),
      s.customerName,
      s.quantity,
      s.totalPrice.toFixed(2),
      s.paymentMethod,
      s.appliedPromos.join('; ')
    ]);

    //function to escape CSV values
    const escapeCSV = (value: any): string => {
      if (value == null) return '';
      const str = value.toString();
      if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`; //escape quotes
      }
      return str;
    }

    const csvContent = [headers, ...rows]
    .map(e => e.map(escapeCSV).join(","))
    .join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDF = (filteredSales: Sale[], title: string, filename: string) => {
    if (filteredSales.length === 0) {
      alert("No data found for the selected period.");
      return;
    }

    // Using any for the instance to resolve standard jsPDF methods and autoTable plugin methods without complex interface inheritance issues
    const doc = new jsPDF() as any;
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(249, 115, 22); // Orange-500
    doc.text("KACANG PARPU BUSINESS REPORT", 105, 20, { align: "center" });
    
    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text(title, 105, 30, { align: "center" });
    
    const totalRev = filteredSales.reduce((sum, s) => sum + s.totalPrice, 0);
    const totalQty = filteredSales.reduce((sum, s) => sum + s.quantity, 0);

    // Summary Box
    doc.setDrawColor(200);
    doc.setFillColor(245, 247, 250);
    doc.rect(14, 40, 182, 20, 'F');
    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text(`Total Revenue: RM ${totalRev.toFixed(2)}`, 20, 52);
    doc.text(`Total Items Sold: ${totalQty} pcs`, 100, 52);
    doc.text(`Total Orders: ${filteredSales.length}`, 160, 52);

    // Table
    const tableData = filteredSales.map(s => [
      formatDate(s.timestamp, true),
      titleCase(s.customerName),
      s.quantity,
      s.paymentMethod,
      `RM ${s.totalPrice.toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 70,
      head: [['Date', 'Customer', 'Qty', 'Payment', 'Total']],
      body: tableData,
      headStyles: { fillColor: [249, 115, 22] }, // Orange-500
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { top: 70 },
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(`Generated on ${new Date().toLocaleString()} - Page ${i} of ${pageCount}`, 105, 285, { align: "center" });
    }

    doc.save(filename);
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-10">
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
          <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <FileText className="text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Loading reports...</h3>
          <p className="text-slate-500 max-w-xs mx-auto mt-2">Please wait while we fetch your data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black text-slate-900">Reports & Exports</h2>
        <p className="text-slate-500 font-medium">Generate detailed performance reports for your records.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Daily Report Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-orange-500 p-6 text-white flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black">Daily Report</h3>
              <p className="text-orange-100 text-sm font-medium">By specific calendar date</p>
            </div>
            <Calendar size={32} className="opacity-20" />
          </div>
          <div className="p-8 space-y-6 flex-1 flex flex-col">
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-900 uppercase tracking-widest">Select Date</label>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 font-black text-lg focus:border-orange-500 focus:bg-white outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 pt-4 mt-auto">
              <button 
                onClick={() => downloadCSV(filterSalesByDate(selectedDate), `Daily_Report_${selectedDate}.csv`)}
                className="flex items-center justify-center gap-3 bg-slate-900 hover:bg-black text-white font-black py-4 rounded-2xl transition-all shadow-lg active:scale-95"
              >
                <Table size={20} className="text-emerald-400" />
                Export CSV
              </button>
              <button 
                onClick={() => downloadPDF(filterSalesByDate(selectedDate), `Daily Sales Report: ${selectedDate}`, `Daily_Report_${selectedDate}.pdf`)}
                className="flex items-center justify-center gap-3 bg-white border-2 border-slate-200 hover:border-orange-500 text-slate-900 font-black py-4 rounded-2xl transition-all active:scale-95"
              >
                <FileText size={20} className="text-orange-500" />
                Export PDF
              </button>
            </div>
          </div>
        </div>

        {/* Monthly Report Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-sky-600 p-6 text-white flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black">Monthly Report</h3>
              <p className="text-sky-100 text-sm font-medium">Full month performance summary</p>
            </div>
            <Calendar size={32} className="opacity-20" />
          </div>
          <div className="p-8 space-y-6 flex-1 flex flex-col">
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-900 uppercase tracking-widest">Select Month</label>
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 font-black text-lg focus:border-sky-500 focus:bg-white outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 pt-4 mt-auto">
              <button 
                onClick={() => downloadCSV(filterSalesByMonth(selectedMonth), `Monthly_Report_${selectedMonth}.csv`)}
                className="flex items-center justify-center gap-3 bg-slate-900 hover:bg-black text-white font-black py-4 rounded-2xl transition-all shadow-lg active:scale-95"
              >
                <Table size={20} className="text-emerald-400" />
                Export CSV
              </button>
              <button 
                onClick={() => downloadPDF(filterSalesByMonth(selectedMonth), `Monthly Sales Report: ${selectedMonth}`, `Monthly_Report_${selectedMonth}.pdf`)}
                className="flex items-center justify-center gap-3 bg-white border-2 border-slate-200 hover:border-sky-500 text-slate-900 font-black py-4 rounded-2xl transition-all active:scale-95"
              >
                <FileText size={20} className="text-sky-600" />
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-4">
        <div className="p-2 bg-amber-200 rounded-lg shrink-0">
          <Download className="text-amber-700" size={20} />
        </div>
        <div>
          <h4 className="font-black text-amber-900 text-sm">Pro Tip</h4>
          <p className="text-amber-800 text-xs mt-1 leading-relaxed font-medium">
            Keep your digital records updated daily! Use Monthly Reports to track your long-term growth and adjust your Kacang Parpu promotions accordingly. 
            PDF reports are best for printing, while CSV reports are perfect for advanced analysis in Excel or Google Sheets.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Reports;