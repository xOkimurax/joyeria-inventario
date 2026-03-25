import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import { Plus, Search, Edit2, Trash2, Filter, X, Package, Image, Upload } from 'lucide-react';

const EMPTY_FORM = {
  name: '', description: '', category_id: '', type: '',
  purchase_price: '', sale_price: '', stock: '', min_stock: '5',
  image_url: '', supplier_id: '', sku: '',
};

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [filters, setFilters] = useState({
    search: '', category_id: '', supplier_id: '',
    type: '', min_price: '', max_price: '', low_stock: false,
    page: 1,
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters, low_stock: filters.low_stock ? 'true' : '', limit: 50 };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const { data } = await api.get('/products', { params });
      setProducts(data.products);
      setTotal(data.total);
    } catch {
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    Promise.all([
      api.get('/categories'),
      api.get('/suppliers'),
    ]).then(([cats, sups]) => {
      setCategories(cats.data);
      setSuppliers(sups.data);
    });
  }, []);

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Local preview
    setImagePreview(URL.createObjectURL(file));
    // Upload immediately
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await api.post('/products/upload-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm(f => ({ ...f, image_url: data.url }));
      toast.success('Imagen subida');
    } catch {
      toast.error('Error al subir imagen');
      setImagePreview('');
    } finally {
      setUploading(false);
    }
  };

  const openCreate = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setImagePreview('');
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditItem(p);
    setImagePreview(p.image_url || '');
    setForm({
      name: p.name || '',
      description: p.description || '',
      category_id: p.category_id || '',
      type: p.type || '',
      purchase_price: p.purchase_price || '',
      sale_price: p.sale_price || '',
      stock: p.stock ?? '',
      min_stock: p.min_stock ?? '5',
      image_url: p.image_url || '',
      supplier_id: p.supplier_id || '',
      sku: p.sku || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        category_id: form.category_id || null,
        supplier_id: form.supplier_id || null,
        sku: form.sku || null,
      };
      if (editItem) {
        await api.put(`/products/${editItem.id}`, payload);
        toast.success('Producto actualizado');
      } else {
        await api.post('/products', payload);
        toast.success('Producto creado');
      }
      setModalOpen(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/products/${deleteId}`);
      toast.success('Producto eliminado');
      setDeleteId(null);
      fetchProducts();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v, page: 1 }));
  const clearFilters = () => setFilters({ search: '', category_id: '', supplier_id: '', type: '', min_price: '', max_price: '', low_stock: false, page: 1 });
  const activeFilters = Object.values({ ...filters, search: '', page: 1 }).some(Boolean);

  const fmt = (n) => `$${parseFloat(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-cream">Inventario</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} productos en total</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} />
          <span className="hidden sm:inline">Nuevo producto</span>
        </button>
      </div>

      {/* Search & filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            type="text" value={filters.search}
            onChange={e => setFilter('search', e.target.value)}
            placeholder="Buscar por nombre, SKU..."
            className="input-field pl-9"
          />
        </div>
        <button
          onClick={() => setShowFilters(s => !s)}
          className={`btn-secondary ${showFilters ? 'border-gold-500 text-gold-500' : ''}`}
        >
          <Filter size={16} />
          Filtros
          {activeFilters && <span className="w-2 h-2 rounded-full bg-gold-500" />}
        </button>
        {activeFilters && (
          <button onClick={clearFilters} className="btn-secondary text-red-400 hover:text-red-400">
            <X size={16} /> Limpiar
          </button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="card grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="label">Categoría</label>
            <select value={filters.category_id} onChange={e => setFilter('category_id', e.target.value)}
              className="input-field">
              <option value="">Todas</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Proveedor</label>
            <select value={filters.supplier_id} onChange={e => setFilter('supplier_id', e.target.value)}
              className="input-field">
              <option value="">Todos</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tipo</label>
            <input type="text" value={filters.type} onChange={e => setFilter('type', e.target.value)}
              placeholder="Ej: Oro, Plata..." className="input-field" />
          </div>
          <div>
            <label className="label">Precio mín.</label>
            <input type="number" value={filters.min_price} onChange={e => setFilter('min_price', e.target.value)}
              placeholder="0" className="input-field" />
          </div>
          <div>
            <label className="label">Precio máx.</label>
            <input type="number" value={filters.max_price} onChange={e => setFilter('max_price', e.target.value)}
              placeholder="999999" className="input-field" />
          </div>
          <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
            <input type="checkbox" id="low_stock" checked={filters.low_stock}
              onChange={e => setFilter('low_stock', e.target.checked)}
              className="w-4 h-4 rounded accent-gold-500" />
            <label htmlFor="low_stock" className="text-sm text-gray-400 cursor-pointer">Stock bajo</label>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Producto</th>
              <th className="hidden sm:table-cell">Categoría</th>
              <th className="hidden md:table-cell">Tipo</th>
              <th>Precio venta</th>
              <th>Stock</th>
              <th className="hidden lg:table-cell">Proveedor</th>
              <th className="hidden lg:table-cell">SKU</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-600">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
                    Cargando...
                  </div>
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-gray-600">
                    <Package size={32} className="opacity-30" />
                    <p>No hay productos</p>
                  </div>
                </td>
              </tr>
            ) : products.map(p => (
              <tr key={p.id}>
                <td>
                  <div className="flex items-center gap-3">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name}
                        className="w-9 h-9 rounded-lg object-cover border border-surface-300 shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-surface-200 border border-surface-300
                                      flex items-center justify-center shrink-0">
                        <Image size={14} className="text-gray-600" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-cream truncate max-w-[160px]">{p.name}</p>
                      {p.description && (
                        <p className="text-xs text-gray-600 truncate max-w-[160px]">{p.description}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="hidden sm:table-cell">
                  {p.category_name ? <span className="badge-gold">{p.category_name}</span> : '—'}
                </td>
                <td className="hidden md:table-cell text-gray-400">{p.type || '—'}</td>
                <td className="font-semibold text-gold-400">{fmt(p.sale_price)}</td>
                <td>
                  <span className={`badge ${
                    p.stock === 0 ? 'badge-red' :
                    p.stock <= p.min_stock ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'badge-green'
                  }`}>
                    {p.stock}
                  </span>
                </td>
                <td className="hidden lg:table-cell text-gray-400 text-xs">{p.supplier_name || '—'}</td>
                <td className="hidden lg:table-cell text-gray-600 text-xs font-mono">{p.sku || '—'}</td>
                <td>
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => openEdit(p)}
                      className="p-1.5 text-gray-500 hover:text-gold-400 hover:bg-gold-500/10 rounded-lg transition-all">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => setDeleteId(p.id)}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Product Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editItem ? 'Editar producto' : 'Nuevo producto'} size="lg">
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Nombre *</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required placeholder="Ej: Anillo de oro 18k" className="input-field" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Descripción</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2} placeholder="Descripción del producto..." className="input-field resize-none" />
            </div>
            <div>
              <label className="label">Categoría</label>
              <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                className="input-field">
                <option value="">Sin categoría</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tipo / Material</label>
              <input type="text" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                placeholder="Ej: Oro 18k, Plata 925..." className="input-field" />
            </div>
            <div>
              <label className="label">Precio de compra</label>
              <input type="number" step="0.01" min="0" value={form.purchase_price}
                onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))}
                placeholder="0.00" className="input-field" />
            </div>
            <div>
              <label className="label">Precio de venta *</label>
              <input type="number" step="0.01" min="0" value={form.sale_price}
                onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))}
                required placeholder="0.00" className="input-field" />
            </div>
            <div>
              <label className="label">Stock</label>
              <input type="number" min="0" value={form.stock}
                onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                placeholder="0" className="input-field" />
            </div>
            <div>
              <label className="label">Stock mínimo</label>
              <input type="number" min="0" value={form.min_stock}
                onChange={e => setForm(f => ({ ...f, min_stock: e.target.value }))}
                placeholder="5" className="input-field" />
            </div>
            <div>
              <label className="label">Proveedor</label>
              <select value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}
                className="input-field">
                <option value="">Sin proveedor</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">SKU</label>
              <input type="text" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                placeholder="Código único" className="input-field" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Imagen del producto</label>
              <div className="flex items-start gap-4">
                {/* Preview */}
                <div className="w-20 h-20 rounded-xl border border-surface-300 bg-surface-200 flex items-center justify-center shrink-0 overflow-hidden">
                  {imagePreview ? (
                    <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <Image size={24} className="text-gray-600" />
                  )}
                </div>
                {/* Upload button */}
                <div className="flex-1 flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="btn-secondary justify-center"
                  >
                    <Upload size={15} />
                    {uploading ? 'Subiendo...' : imagePreview ? 'Cambiar imagen' : 'Subir imagen'}
                  </button>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={() => { setImagePreview(''); setForm(f => ({ ...f, image_url: '' })); }}
                      className="text-xs text-gray-600 hover:text-red-400 transition-colors text-left"
                    >
                      Quitar imagen
                    </button>
                  )}
                  <p className="text-xs text-gray-600">JPG, PNG, WebP · máx. 5 MB</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1 justify-center">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Guardando...' : editItem ? 'Actualizar' : 'Crear producto'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Eliminar producto" size="sm">
        <div className="p-6">
          <p className="text-gray-400 mb-6">¿Estás seguro que quieres eliminar este producto? Esta acción no se puede deshacer.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button onClick={handleDelete} className="btn-danger flex-1 justify-center">Eliminar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
