import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import { Plus, ShoppingCart, Trash2, Calendar, Search, Minus, PackageSearch } from 'lucide-react';

const EMPTY_FORM = { client_name: '', notes: '' };

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
  const [cartError, setCartError] = useState(false);

  // Cart state
  const [cartItems, setCartItems] = useState([]);       // confirmed items
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [cartDraft, setCartDraft] = useState([]);        // in-progress inside picker
  const [cartSearch, setCartSearch] = useState('');

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

  // --- Cart picker ---
  const openCartModal = () => {
    setCartDraft(cartItems.map(i => ({ ...i })));
    setCartSearch('');
    setCartModalOpen(true);
  };

  const draftQty = (productId) => cartDraft.find(i => i.product.id === productId)?.quantity || 0;

  const addToDraft = (product) => {
    setCartDraft(d => {
      const exists = d.find(i => i.product.id === product.id);
      if (exists) return d.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...d, { product, quantity: 1 }];
    });
  };

  const updateDraftQty = (productId, delta) => {
    setCartDraft(d => d.flatMap(i => {
      if (i.product.id !== productId) return [i];
      const newQty = i.quantity + delta;
      return newQty <= 0 ? [] : [{ ...i, quantity: newQty }];
    }));
  };

  const confirmCart = () => {
    setCartItems(cartDraft);
    if (cartDraft.length > 0) setCartError(false);
    setCartModalOpen(false);
  };

  const cancelCart = () => {
    setCartDraft([]);
    setCartModalOpen(false);
  };

  const filteredProducts = cartSearch.length >= 3
    ? products.filter(p => p.name.toLowerCase().includes(cartSearch.toLowerCase()))
    : [];

  const cartTotal = cartItems.reduce((sum, i) => sum + (parseFloat(i.product.sale_price || 0) * i.quantity), 0);

  // --- Save ---
  const handleSave = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      setCartError(true);
      return;
    }
    setCartError(false);
    setSaving(true);
    try {
      await Promise.all(cartItems.map(item =>
        api.post('/sales', {
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: Math.round(parseFloat(item.product.sale_price || 0)),
          client_name: form.client_name || null,
          notes: form.notes || null,
        })
      ));
      toast.success('Venta registrada');
      setModalOpen(false);
      setForm(EMPTY_FORM);
      setCartItems([]);
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

  const fmt = (n) => `₲ ${new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(parseInt(n || 0))}`;
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
        <button onClick={() => { setForm(EMPTY_FORM); setCartItems([]); setCartError(false); setModalOpen(true); }}
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

          {/* Product selector button */}
          <div>
            <label className="label">Productos *</label>
            <button type="button" onClick={openCartModal}
              className={`w-full flex items-center gap-2 px-4 py-2.5 bg-surface-50 border rounded-lg text-sm transition-all ${
                cartError
                  ? 'border-red-500 text-red-400 hover:border-red-400'
                  : 'border-surface-200 text-gray-400 hover:border-gold-500/50 hover:text-cream'
              }`}>
              <PackageSearch size={16} />
              Seleccionar productos
              {cartItems.length > 0 && (
                <span className="ml-auto bg-gold-500/20 text-gold-400 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {cartItems.length} {cartItems.length === 1 ? 'producto' : 'productos'}
                </span>
              )}
            </button>
            {cartError && (
              <p className="text-red-400 text-xs mt-1">Seleccioná al menos un producto para registrar la venta.</p>
            )}
          </div>

          {/* Cart items list */}
          {cartItems.length > 0 && (
            <div className="space-y-2">
              {cartItems.map(({ product, quantity }) => {
                const subtotal = parseFloat(product.sale_price || 0) * quantity;
                return (
                  <div key={product.id}
                    className="flex items-center justify-between bg-surface-100 border border-surface-300 rounded-lg px-3 py-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-cream truncate">{product.name}</p>
                      <p className="text-xs text-gray-500">{fmt(product.sale_price)} × {quantity}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <p className="font-semibold text-gold-400 whitespace-nowrap">{fmt(subtotal)}</p>
                      <button
                        type="button"
                        onClick={() => setCartItems(items => items.filter(i => i.product.id !== product.id))}
                        className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Quitar producto"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Total */}
              <div className="bg-gold-500/10 border border-gold-500/30 rounded-lg p-3 flex items-center justify-between">
                <p className="text-sm text-gray-400">Total</p>
                <p className="text-xl font-bold text-gold-400">{fmt(cartTotal)}</p>
              </div>
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

      {/* Product picker modal */}
      <Modal isOpen={cartModalOpen} onClose={cancelCart} title="Seleccionar productos" size="md">
        <div className="flex flex-col" style={{ maxHeight: '70vh' }}>
          {/* Search */}
          <div className="px-6 pt-4 pb-3 border-b border-surface-200">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={cartSearch}
                onChange={e => setCartSearch(e.target.value)}
                placeholder="Buscar producto..."
                className="input-field pl-9"
                autoFocus
              />
            </div>
          </div>

          {/* Product list */}
          <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
            {cartSearch.length < 3 ? (
              <div className="flex flex-col items-center gap-2 text-gray-600 py-10">
                <Search size={28} className="opacity-30" />
                <p className="text-sm">Escribí al menos 3 letras para buscar...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <p className="text-center text-gray-600 py-8">No se encontraron productos</p>
            ) : filteredProducts.map(product => {
              const qty = draftQty(product.id);
              return (
                <div key={product.id}
                  className="flex items-center justify-between bg-surface-100 border border-surface-300 rounded-lg px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-cream text-sm truncate">{product.name}</p>
                    <div className="flex gap-3 mt-0.5">
                      <span className="text-xs text-gold-400">{fmt(product.sale_price)}</span>
                      <span className={`text-xs ${product.stock <= (product.min_stock || 0) ? 'text-amber-400' : 'text-gray-500'}`}>
                        Stock: {product.stock}
                      </span>
                    </div>
                  </div>

                  {qty === 0 ? (
                    <button type="button" onClick={() => addToDraft(product)}
                      disabled={product.stock === 0}
                      className="ml-3 px-3 py-1 text-xs font-semibold bg-gold-500/20 text-gold-400 hover:bg-gold-500/30 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                      Añadir
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 ml-3">
                      <button type="button" onClick={() => updateDraftQty(product.id, -1)}
                        className="p-1 rounded-lg bg-surface-200 hover:bg-surface-300 text-gray-300 transition-all">
                        <Minus size={13} />
                      </button>
                      <span className="text-sm font-semibold text-cream w-5 text-center">{qty}</span>
                      <button type="button" onClick={() => updateDraftQty(product.id, +1)}
                        disabled={qty >= product.stock}
                        className="p-1 rounded-lg bg-surface-200 hover:bg-surface-300 text-gray-300 transition-all disabled:opacity-40">
                        <Plus size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-surface-200 flex gap-3">
            <button type="button" onClick={cancelCart} className="btn-secondary flex-1 justify-center">
              Cancelar
            </button>
            <button type="button" onClick={confirmCart} className="btn-primary flex-1 justify-center">
              Listo {cartDraft.length > 0 && `(${cartDraft.length})`}
            </button>
          </div>
        </div>
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
