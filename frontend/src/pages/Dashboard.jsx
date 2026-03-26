import { useState, useEffect } from 'react';
import api from '../api/client';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';
import {
  Package, TrendingUp, AlertTriangle, Wallet,
  FileDown, RefreshCw, BarChart3,
} from 'lucide-react';

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/dashboard/metrics');
      setMetrics(data);
    } catch {
      toast.error('Error al cargar métricas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMetrics(); }, []);

  useEffect(() => {
    const handleVisibility = () => { if (document.visibilityState === 'visible') fetchMetrics(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const exportPDF = () => {
    if (!metrics) return;
    const doc = new jsPDF();

    // Header
    doc.setFillColor(13, 13, 13);
    doc.rect(0, 0, 220, 30, 'F');
    doc.setTextColor(201, 168, 76);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DE INVENTARIO', 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(new Date().toLocaleDateString('es-ES', { dateStyle: 'full' }), 14, 26);

    let y = 40;

    // Metrics summary
    doc.setTextColor(201, 168, 76);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Métricas Generales', 14, y);
    y += 8;

    const summaryData = [
      ['Stock Total', metrics.total_stock.toString()],
      ['Ventas Hoy', fmt(metrics.sales_today.total)],
      ['Ventas del Mes', fmt(metrics.sales_month.total)],
      ['Valor Inventario (Compra)', fmt(metrics.inventory_value.purchase)],
      ['Valor Inventario (Venta)', fmt(metrics.inventory_value.sale)],
    ];

    doc.autoTable({
      startY: y,
      head: [['Métrica', 'Valor']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [201, 168, 76], textColor: [13, 13, 13], fontStyle: 'bold' },
      styles: { fontSize: 10 },
    });

    y = doc.lastAutoTable.finalY + 10;

    // Low stock
    if (metrics.low_stock_products.length > 0) {
      doc.setTextColor(201, 168, 76);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Productos con Stock Bajo', 14, y);
      y += 6;

      doc.autoTable({
        startY: y,
        head: [['Producto', 'Stock', 'Mínimo', 'Precio Venta']],
        body: metrics.low_stock_products.map(p => [
          p.name, p.stock, p.min_stock,
          fmt(p.sale_price),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [180, 50, 50], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 10 },
      });

      y = doc.lastAutoTable.finalY + 10;
    }

    // Top products
    if (metrics.top_products.length > 0) {
      doc.setTextColor(201, 168, 76);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Productos Más Vendidos (Mes)', 14, y);
      y += 6;

      doc.autoTable({
        startY: y,
        head: [['Producto', 'Unidades', 'Ingresos']],
        body: metrics.top_products.map(p => [
          p.product_name, p.total_qty,
          fmt(p.total_revenue),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [201, 168, 76], textColor: [13, 13, 13], fontStyle: 'bold' },
        styles: { fontSize: 10 },
      });
    }

    doc.save(`reporte-inventario-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('Reporte exportado');
  };

  const fmt = (n) => `₲ ${new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(parseInt(n || 0))}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-gold-500 border-t-transparent animate-spin" />
          <p className="text-gray-500 text-sm">Cargando métricas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-cream">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Resumen del inventario y ventas</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchMetrics} className="btn-secondary">
            <RefreshCw size={16} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
          <button onClick={exportPDF} className="btn-primary">
            <FileDown size={16} />
            <span className="hidden sm:inline">Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Package size={22} className="text-gold-500" />}
          label="Stock Total"
          value={metrics?.total_stock?.toLocaleString('es-ES') || '0'}
          sub="unidades en inventario"
          color="gold"
        />
        <MetricCard
          icon={<TrendingUp size={22} className="text-emerald-400" />}
          label="Ventas Hoy"
          value={fmt(metrics?.sales_today?.total)}
          sub={`${metrics?.sales_today?.count || 0} transacciones`}
          color="green"
        />
        <MetricCard
          icon={<BarChart3 size={22} className="text-blue-400" />}
          label="Ventas del Mes"
          value={fmt(metrics?.sales_month?.total)}
          sub={`${metrics?.sales_month?.count || 0} transacciones`}
          color="blue"
        />
        <MetricCard
          icon={<Wallet size={22} className="text-purple-400" />}
          label="Valor Inventario"
          value={fmt(metrics?.inventory_value?.sale)}
          sub={`Costo: ${fmt(metrics?.inventory_value?.purchase)}`}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low stock */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-amber-400" />
            <h2 className="font-semibold text-cream">Stock Bajo</h2>
            {metrics?.low_stock_products?.length > 0 && (
              <span className="badge-red ml-auto">{metrics.low_stock_products.length}</span>
            )}
          </div>
          {metrics?.low_stock_products?.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-gray-600">
              <Package size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Todo el stock está bien</p>
            </div>
          ) : (
            <div className="space-y-2">
              {metrics.low_stock_products.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-surface-100 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-cream truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">Mínimo: {p.min_stock}</p>
                  </div>
                  <span className={`badge ml-2 shrink-0 ${p.stock === 0 ? 'badge-red' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                    {p.stock} uds
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-gold-500" />
            <h2 className="font-semibold text-cream">Más Vendidos (Mes)</h2>
          </div>
          {metrics?.top_products?.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-gray-600">
              <BarChart3 size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Sin ventas este mes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.top_products.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-gold-500/20 text-gold-500 text-xs font-bold
                                   flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-cream truncate">{p.product_name}</p>
                      <span className="text-sm font-semibold text-gold-400 ml-2 shrink-0">
                        {fmt(p.total_revenue)}
                      </span>
                    </div>
                    <div className="w-full bg-surface-300 rounded-full h-1.5">
                      <div
                        className="bg-gold-gradient h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(100, (p.total_revenue / metrics.top_products[0].total_revenue) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Categories breakdown */}
      {metrics?.categories_breakdown?.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-cream mb-4">Inventario por Categoría</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {metrics.categories_breakdown.map(cat => (
              <div key={cat.name} className="bg-surface-100 border border-surface-300 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">{cat.name}</p>
                <p className="text-lg font-semibold text-cream">{cat.count}</p>
                <p className="text-xs text-gray-600">{cat.total_stock} uds. en stock</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value, sub, color }) {
  const borders = {
    gold: 'before:bg-gold-gradient',
    green: 'before:bg-gradient-to-r before:from-emerald-600 before:to-emerald-400',
    blue: 'before:bg-gradient-to-r before:from-blue-600 before:to-blue-400',
    purple: 'before:bg-gradient-to-r before:from-purple-600 before:to-purple-400',
  };

  return (
    <div className={`metric-card ${borders[color] || borders.gold}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
        <div className="p-2 bg-surface-100 rounded-lg">{icon}</div>
      </div>
      <p className="text-2xl font-bold text-cream mt-1">{value}</p>
      <p className="text-xs text-gray-600">{sub}</p>
    </div>
  );
}
