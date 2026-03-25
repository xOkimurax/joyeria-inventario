import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import { Plus, Search, Edit2, Trash2, Truck, Mail, Phone, MapPin } from 'lucide-react';

const EMPTY_FORM = {
  name: '', contact_name: '', email: '', phone: '', address: '', notes: '',
};

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/suppliers');
      setSuppliers(data);
    } catch {
      toast.error('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const openCreate = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setEditItem(s);
    setForm({
      name: s.name || '',
      contact_name: s.contact_name || '',
      email: s.email || '',
      phone: s.phone || '',
      address: s.address || '',
      notes: s.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/suppliers/${editItem.id}`, form);
        toast.success('Proveedor actualizado');
      } else {
        await api.post('/suppliers', form);
        toast.success('Proveedor creado');
      }
      setModalOpen(false);
      fetchSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/suppliers/${deleteId}`);
      toast.success('Proveedor eliminado');
      setDeleteId(null);
      fetchSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
    }
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contact_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-cream">Proveedores</h1>
          <p className="text-gray-500 text-sm mt-0.5">{suppliers.length} proveedores registrados</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} />
          <span className="hidden sm:inline">Nuevo proveedor</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
        <input
          type="text" value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, contacto, email..."
          className="input-field pl-9"
        />
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Proveedor</th>
              <th className="hidden md:table-cell">Contacto</th>
              <th className="hidden sm:table-cell">Email / Teléfono</th>
              <th className="hidden lg:table-cell">Productos</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-600">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
                    Cargando...
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-gray-600">
                    <Truck size={32} className="opacity-30" />
                    <p>{search ? 'Sin resultados' : 'No hay proveedores'}</p>
                  </div>
                </td>
              </tr>
            ) : filtered.map(s => (
              <tr key={s.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gold-500/10 border border-gold-500/20
                                    flex items-center justify-center shrink-0">
                      <Truck size={15} className="text-gold-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-cream truncate max-w-[180px]">{s.name}</p>
                      {s.address && (
                        <p className="text-xs text-gray-600 flex items-center gap-1 truncate max-w-[180px]">
                          <MapPin size={10} /> {s.address}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="hidden md:table-cell text-gray-400">
                  {s.contact_name || '—'}
                </td>
                <td className="hidden sm:table-cell">
                  <div className="space-y-0.5">
                    {s.email && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Mail size={11} className="text-gray-600" /> {s.email}
                      </p>
                    )}
                    {s.phone && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Phone size={11} className="text-gray-600" /> {s.phone}
                      </p>
                    )}
                    {!s.email && !s.phone && <span className="text-gray-600">—</span>}
                  </div>
                </td>
                <td className="hidden lg:table-cell">
                  <span className="badge-gold">{s.product_count} productos</span>
                </td>
                <td>
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => openEdit(s)}
                      className="p-1.5 text-gray-500 hover:text-gold-400 hover:bg-gold-500/10 rounded-lg transition-all">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => setDeleteId(s.id)}
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

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editItem ? 'Editar proveedor' : 'Nuevo proveedor'} size="md">
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Nombre *</label>
              <input type="text" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required placeholder="Nombre del proveedor" className="input-field" />
            </div>
            <div>
              <label className="label">Persona de contacto</label>
              <input type="text" value={form.contact_name}
                onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                placeholder="Nombre del contacto" className="input-field" />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input type="text" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+54 9 11..." className="input-field" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Email</label>
              <input type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="proveedor@ejemplo.com" className="input-field" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Dirección</label>
              <input type="text" value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Dirección completa" className="input-field" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notas</label>
              <textarea value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3} placeholder="Observaciones, condiciones de pago, etc."
                className="input-field resize-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1 justify-center">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Guardando...' : editItem ? 'Actualizar' : 'Crear proveedor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Eliminar proveedor" size="sm">
        <div className="p-6">
          <p className="text-gray-400 mb-6">¿Estás seguro que querés eliminar este proveedor? Esta acción no se puede deshacer.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button onClick={handleDelete} className="btn-danger flex-1 justify-center">Eliminar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
