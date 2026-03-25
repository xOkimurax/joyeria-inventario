import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import GuaraniInput from '../components/GuaraniInput';
import { Plus, ShoppingCart, Trash2, Search, Calendar } from 'lucide-react';

const EMPTY_FORM = {
  product_id: '', quantity: '1', unit_price: '', client_name: '', notes: '',
};

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [total, setTotal] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [filters, setFilters] = useState({ from: '', to: '', page: 1 });

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters, limit: 100 };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const { data } = await api.get('/sales', { params });
      setSales(data.sales);
      setTotal(data.total);
      setGrandTotal(data.grand_total);
    } catch {
      toast.error('Error al cargar ventas');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  useEffect(() => {
    api.get('/products', { params: { limit: 500 } }).then(({ data }) => setProducts(data.products));
  }, []);

  const onProductChange = (e) => {
    const pid = e.target.value;
    const prod = products.find(p => p.id === parseInt(pid));
    setSelectedProduct(prod || null);
    setForm(f => ({ ...f, product_id: pid, unit_price: prod ? String(Math.round(prod.sale_price || 0)) : '' }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/sales', form);
      toast.success('Venta registrada');
      setModalOpen(false);
      setForm(EMPTY_FORM);
      setSelectedProduct(null);
      fetchSales();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar venta');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/sales/${deleteId}`);
      toast.success('Venta eliminada y stock restaurado');
      setDeleteId(null);
      fetchSales();
    } catch {
      toast.error('Error al eliminar venta');
    }
  };

  const fmt = (n) => `₲ ${parseInt(n || 0).toLocaleString('es-PY')}`;
  const fmtDate = (d) => new Date(d).toLocaleDateString('es-ES', { dateStyle: 'short' });
  const fmtTime = (d) => new Date(d).toLocaleTimeString('es-ES', { timeStyle: 'short' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-cream">Ventas</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} transacciones</p>
        </div>
        <button onClick={() => { setForm(EMPTY_FORM); setSelectedProduct(null); setModalOpen(true); }}
          className="btn-primary">
          <Plus size={16} />
          <span className="hidden sm:inline">Nueva venta</span>
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Total en período</p>
          <p className="text-2xl font-bold text-gold-400 mt-1">{fmt(grandTotal)}</p>
          <p className="text-xs text-gray-600">{total} transacciones</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Promedio por venta</p>
          <p className="text-2xl font-bold text-cream mt-1">
            {total > 0 ? fmt(grandTotal / total) : '₲ 0'}
          </p>
          <p className="text-xs text-gray-600">por transacción</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-2 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2">
          <Calendar size={14} className="text-gray-600" />
          <input type="date" value={filters.from}
            onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
            className="bg-transparent text-sm text-gray-400 outline-none w-32" />
          <span className="text-gray-600">—</span>
          <input type="date" value={filters.to}
            onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
            className="bg-transparent text-sm text-gray-400 outline-none w-32" />
        </div>
        {(filters.from || filters.to) && (
          <button onClick={() => setFilters({ from: '', to: '', page: 1 })}
            className="btn-secondary text-red-400 hover:text-red-400 text-sm py-2">
            Limpiar fechas
          </button>
        )}
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Cant.</th>
              <th>Precio unit.</th>
              <th>Total</th>
              <th className="hidden md:table-cell">Cliente</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-600">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
                    Cargando...
                  </div>
                </td>
              </tr>
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-gray-600">
                    <ShoppingCart size={32} className="opacity-30" />
                    <p>No hay ventas</p>
                  </div>
                </td>
              </tr>
            ) : sales.map(s => (
              <tr key={s.id}>
                <td>
                  <p className="text-sm text-cream">{fmtDate(s.sold_at)}</p>
                  <p className="text-xs text-gray-600">{fmtTime(s.sold_at)}</p>
                </td>
                <td>
                  <p className="font-medium text-cream">{s.product_name || s.product_name_ref}</p>
                  {s.category_name && <p className="text-xs text-gray-600">{s.category_name}</p>}
                </td>
                <td className="font-mono text-gray-300">{s.quantity}</td>
                <td className="font-mono text-gray-300">{fmt(s.unit_price)}</td>
                <td className="font-semibold text-gold-400">{fmt(s.total)}</td>
                <td className="hidden md:table-cell text-gray-400 text-sm">{s.client_name || '—'}</td>
                <td>
                  <button onClick={() => setDeleteId(s.id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New sale modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Registrar venta" size="md">
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="label">Producto *</label>
            <select value={form.product_id} onChange={onProductChange}
              required className="input-field">
              <option value="">Seleccionar producto...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — Stock: {p.stock} — {fmt(p.sale_price)}
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="bg-surface-100 border border-surface-300 rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Stock disponible</span>
                <span className={`font-semibold ${selectedProduct.stock <= selectedProduct.min_stock ? 'text-amber-400' : 'text-green-400'}`}>
                  {selectedProduct.stock} uds.
                </span>
              </div>
              {selectedProduct.category_name && (
                <div className="flex justify-between mt-1">
                  <span className="text-gray-500">Categoría</span>
                  <span className="text-gray-300">{selectedProduct.category_name}</span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Cantidad *</label>
              <input type="number" min="1" value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                required className="input-field" />
            </div>
            <div>
              <label className="label">Precio unitario</label>
              <GuaraniInput
                value={form.unit_price}
                onChange={v => setForm(f => ({ ...f, unit_price: v }))}
                placeholder="Precio de venta"
                className="input-field"
              />
            </div>
          </div>

          {form.product_id && form.quantity && (
            <div className="bg-gold-500/10 border border-gold-500/30 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-0.5">Total estimado</p>
              <p className="text-xl font-bold text-gold-400">
                {fmt((parseFloat(form.unit_price) || 0) * parseInt(form.quantity || 0))}
              </p>
            </div>
          )}

          <div>
            <label className="label">Nombre del cliente</label>
            <input type="text" value={form.client_name}
              onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
              placeholder="Opcional" className="input-field" />
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} placeholder="Observaciones..." className="input-field resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1 justify-center">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Registrando...' : 'Registrar venta'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Eliminar venta" size="sm">
        <div className="p-6">
          <p className="text-gray-400 mb-6">¿Eliminar esta venta? El stock del producto será restaurado automáticamente.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button onClick={handleDelete} className="btn-danger flex-1 justify-center">Eliminar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
