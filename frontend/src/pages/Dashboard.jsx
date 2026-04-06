import { useState, useEffect } from 'react';
import { api, formatCurrency } from '../utils/api';
import { Package, ShoppingCart, Truck, Tags, AlertTriangle, TrendingUp, FileText } from 'lucide-react';

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const res = await api.get('/dashboard/metrics');
      setMetrics(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (type) => {
    try {
      const res = await api.get(`/dashboard/report/pdf?type=${type}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte-${type}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  const stats = [
    { label: 'Total Productos', value: metrics?.totalProducts || 0, icon: Package, color: 'bg-blue-500' },
    { label: 'Categorías', value: metrics?.totalCategories || 0, icon: Tags, color: 'bg-purple-500' },
    { label: 'Proveedores', value: metrics?.totalSuppliers || 0, icon: Truck, color: 'bg-green-500' },
    { label: 'Stock Bajo', value: metrics?.lowStockProducts || 0, icon: AlertTriangle, color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500">Resumen de tu negocio</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportReport('inventory')} className="btn-secondary flex items-center gap-2">
            <FileText size={18} />
            <span className="hidden md:inline">Reporte Inventario</span>
          </button>
          <button onClick={() => exportReport('sales')} className="btn-primary flex items-center gap-2">
            <FileText size={18} />
            <span className="hidden md:inline">Reporte Ventas</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card">
            <div className="flex items-center gap-3">
              <div className={`${color} p-3 rounded-lg`}>
                <Icon size={20} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sales Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-rose-600" />
            <h2 className="font-semibold">Ventas de Hoy</h2>
          </div>
          <p className="text-3xl font-bold text-gray-800">
            {formatCurrency(metrics?.todaySales?.total || 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {metrics?.todaySales?.count || 0} ventas
          </p>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart size={20} className="text-rose-600" />
            <h2 className="font-semibold">Ventas del Mes</h2>
          </div>
          <p className="text-3xl font-bold text-gray-800">
            {formatCurrency(metrics?.monthSales?.total || 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {metrics?.monthSales?.count || 0} ventas
          </p>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="card">
        <h2 className="font-semibold mb-4">Ventas Recientes</h2>
        {metrics?.recentSales?.length > 0 ? (
          <div className="space-y-3">
            {metrics.recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium">{sale.invoiceNumber}</p>
                  <p className="text-sm text-gray-500">
                    {sale.clientName || 'Cliente general'} • {new Date(sale.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <p className="font-semibold text-rose-600">
                  {formatCurrency(Number(sale.total))}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No hay ventas registradas</p>
        )}
      </div>
    </div>
  );
}
