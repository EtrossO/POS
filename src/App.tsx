
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  Settings as SettingsIcon,
  BrainCircuit,
  Package,
  FileText
} from 'lucide-react';
import { Sale, PromoRule, PaymentMethod, BusinessStats } from './types';
import Dashboard from './components/Dashboard';
import OrderForm from './components/OrderForm';
import SalesHistory from './components/SalesHistory';
import Settings from './components/Settings';
import GeminiInsights from './components/GeminiInsight';
import Reports from './components/Reports';
import CustomerManager from './components/CustomerManager';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'order' | 'history' | 'settings' | 'ai' | 'reports' | 'customers'>('dashboard');
  
  // State Initialization
  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('kp_sales');
    return saved ? JSON.parse(saved) : [];
  });

  const [promos, setPromos] = useState<PromoRule[]>(() => {
    const saved = localStorage.getItem('kp_promos');
    return saved ? JSON.parse(saved) : [
      { id: '1', quantity: 2, price: 5 },
      { id: '2', quantity: 4, price: 10 }
    ];
  });

  const [basePrice, setBasePrice] = useState<number>(() => {
    const saved = localStorage.getItem('kp_base_price');
    return saved ? Number(saved) : 3;
  });

  // Persist to LocalStorage
  useEffect(() => {
    localStorage.setItem('kp_sales', JSON.stringify(sales));
    localStorage.setItem('kp_promos', JSON.stringify(promos));
    localStorage.setItem('kp_base_price', basePrice.toString());
  }, [sales, promos, basePrice]);

  // Derived Stats
  const stats: BusinessStats = useMemo(() => {
    return sales.reduce((acc, sale) => {
      acc.totalRevenue += sale.totalPrice;
      acc.totalQuantity += sale.quantity;
      acc.totalOrders += 1;
      if (sale.paymentMethod === PaymentMethod.CASH) {
        acc.cashRevenue += sale.totalPrice;
      } else {
        acc.qrRevenue += sale.totalPrice;
      }
      return acc;
    }, {
      totalRevenue: 0,
      totalQuantity: 0,
      totalOrders: 0,
      cashRevenue: 0,
      qrRevenue: 0
    });
  }, [sales]);

  const addSale = (sale: Sale) => {
    setSales(prev => [sale, ...prev]);
    setActiveTab('dashboard');
  };

  const deleteSale = useCallback((id: string) => {
    setSales(prev => prev.filter(s => s.id !== id));
  }, []);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 sticky top-0 h-screen p-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-orange-500 p-2 rounded-lg">
            <Package className="text-white w-6 h-6" />
          </div>
          <h1 className="font-bold text-xl text-slate-800">Kacang Parpu</h1>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
          />
          <NavItem 
            active={activeTab === 'order'} 
            onClick={() => setActiveTab('order')}
            icon={<PlusCircle size={20} />} 
            label="New Order" 
          />
          <NavItem 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')}
            icon={<History size={20} />} 
            label="History" 
          />
          <NavItem 
            active={activeTab === 'reports'} 
            onClick={() => setActiveTab('reports')}
            icon={<FileText size={20} />} 
            label="Reports" 
          />
          <NavItem 
            active={activeTab === 'ai'} 
            onClick={() => setActiveTab('ai')}
            icon={<BrainCircuit size={20} />} 
            label="AI Insights" 
          />
          <NavItem 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')}
            icon={<SettingsIcon size={20} />} 
            label="Settings" 
          />
          <NavItem 
            active={activeTab === 'customers'} 
            onClick={() => setActiveTab('customers')}
            icon={<Package size={20} />} 
            label="Customers" 
          />
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <p className="text-xs text-slate-400">© 2024 Kacang Parpu POS</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 pb-24 md:pb-10">
        <header className="mb-8 md:hidden">
           <h1 className="font-bold text-2xl text-slate-800">Kacang Parpu</h1>
        </header>

        <div className="max-w-5xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard stats={stats} sales={sales} />}
          {activeTab === 'order' && (
            <OrderForm 
              promos={promos} 
              basePrice={basePrice} 
              onAddSale={addSale} 
            />
          )}
          {activeTab === 'history' && (
            <SalesHistory 
              sales={sales} 
              onDelete={deleteSale} 
            />
          )}
          {activeTab === 'reports' && (
            <Reports sales={sales} />
          )}
          {activeTab === 'ai' && (
            <GeminiInsights sales={sales} promos={promos} basePrice={basePrice} />
          )}
          {activeTab === 'settings' && (
            <Settings 
              promos={promos} 
              setPromos={setPromos} 
              basePrice={basePrice} 
              setBasePrice={setBasePrice} 
            />
          )}
          {activeTab === 'customers' && (
            <CustomerManager />
          )}
        </div>
      </main>

      {/* Bottom Nav - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-50">
        <MobileNavItem 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')}
          icon={<LayoutDashboard size={24} />} 
        />
        <MobileNavItem 
          active={activeTab === 'order'} 
          onClick={() => setActiveTab('order')}
          icon={<PlusCircle size={24} />} 
        />
        <MobileNavItem 
          active={activeTab === 'history'} 
          onClick={() => setActiveTab('history')}
          icon={<History size={24} />} 
        />
        <MobileNavItem 
          active={activeTab === 'reports'} 
          onClick={() => setActiveTab('reports')}
          icon={<FileText size={24} />} 
        />
        <MobileNavItem 
          active={activeTab === 'ai'} 
          onClick={() => setActiveTab('ai')}
          icon={<BrainCircuit size={24} />} 
        />
        <MobileNavItem 
          active={activeTab === 'settings'} 
          onClick={() => setActiveTab('settings')}
          icon={<SettingsIcon size={24} />} 
        />
        <MobileNavItem 
          active={activeTab === 'customers'} 
          onClick={() => setActiveTab('customers')}
          icon={<Package size={24} />} 
        />
      </nav>
    </div>
  );
};

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    type="button"
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-orange-500 text-white shadow-md shadow-orange-200' 
        : 'text-slate-500 hover:bg-slate-100'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

const MobileNavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode }> = ({ active, onClick, icon }) => (
  <button 
    type="button"
    onClick={onClick}
    className={`p-2 rounded-xl transition-colors ${active ? 'text-orange-500' : 'text-slate-400'}`}
  >
    {icon}
  </button>
);

export default App;
