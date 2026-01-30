
import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { TrendingUp, Package, Wallet, CreditCard } from 'lucide-react';
import { BusinessStats, Sale, PaymentMethod } from '../types';

interface DashboardProps {
  stats: BusinessStats;
  sales: Sale[];
}

const Dashboard: React.FC<DashboardProps> = ({ stats, sales }) => {
  // Aggregate data for daily revenue chart (last 7 days)
  const chartData = React.useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    }).reverse();

    const dataMap = sales.reduce((acc: any, sale) => {
      const day = new Date(sale.timestamp).toLocaleDateString('en-US', { weekday: 'short' });
      acc[day] = (acc[day] || 0) + sale.totalPrice;
      return acc;
    }, {});

    return last7Days.map(day => ({
      name: day,
      revenue: dataMap[day] || 0
    }));
  }, [sales]);

  const pieData = [
    { name: 'Cash', value: stats.cashRevenue, color: '#f97316' },
    { name: 'QR', value: stats.qrRevenue, color: '#0ea5e9' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Revenue" 
          value={`RM ${stats.totalRevenue.toFixed(2)}`} 
          icon={<TrendingUp className="text-emerald-500" />}
          bgColor="bg-emerald-50"
        />
        <StatCard 
          title="Total Pcs Sold" 
          value={`${stats.totalQuantity} pcs`} 
          icon={<Package className="text-orange-500" />}
          bgColor="bg-orange-50"
        />
        <StatCard 
          title="Cash Sales" 
          value={`RM ${stats.cashRevenue.toFixed(2)}`} 
          icon={<Wallet className="text-amber-500" />}
          bgColor="bg-amber-50"
        />
        <StatCard 
          title="QR Sales" 
          value={`RM ${stats.qrRevenue.toFixed(2)}`} 
          icon={<CreditCard className="text-sky-500" />}
          bgColor="bg-sky-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Revenue Trend (Last 7 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Payment Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-center gap-6">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                <span className="text-sm text-slate-600 font-medium">{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; bgColor: string }> = ({ title, value, icon, bgColor }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
    <div className={`p-3 rounded-xl ${bgColor}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
  </div>
);

export default Dashboard;
