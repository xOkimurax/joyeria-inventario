import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import { Plus, Edit2, Trash2, Tag } from 'lucide-react';

const EMPTY_FORM = { name: '', description: '' };

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/categories');
      setCategories(data);
    } catch {
      toast.error('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const openCreate = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setEditItem(c);
    setForm({ name: c.name || '', description: c.description || '' });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/categories/${editItem.id}`, form);
        toast.success('Categoría actualizada');
      } else {
        await api.post('/categories', form);
        toast.success('Categoría creada');
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/categories/${deleteId}`);
      toast.success('Categoría eliminada');
      setDeleteId(null);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-cream">Categorías</h1>
          <p className="text-gray-500 text-sm mt-0.5">{categories.length} categorías registradas</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} />
          <span className="hidden sm:inline">Nueva categoría</span>
        </button>
      </div>

      {/* Grid of categories */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-gold-500 border-t-transparent animate-spin" />
            <p className="text-gray-500 text-sm">Cargando categorías...</p>
          </div>
        </div>
      ) : categories.length === 0 ? (
        <div className="card flex flex-col items-center py-16 text-gray-600">
          <Tag size={40} className="mb-3 opacity-30" />
          <p className="text-base">No hay categorías todavía</p>
          <p className="text-sm text-gray-700 mt-1">Creá la primera para organizar tu inventario</p>
          <button onClick={openCreate} className="btn-primary mt-6">
            <Plus size={16} /> Nueva categoría
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(c => (
            <div key={c.id}
              className="card flex items-start justify-between gap-3 hover:border-gold-500/30 transition-all">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-gold-500/10 border border-gold-500/20
                                flex items-center justify-center shrink-0 mt-0.5">
                  <Tag size={16} className="text-gold-500" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-cream truncate">{c.name}</p>
                  {c.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{c.description}</p>
                  )}
                  <div className="mt-2">
                    <span className="badge-gold">{c.product_count} productos</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(c)}
                  className="p-1.5 text-gray-500 hover:text-gold-400 hover:bg-gold-500/10 rounded-lg transition-all">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => setDeleteId(c.id)}
                  className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editItem ? 'Editar categoría' : 'Nueva categoría'} size="sm">
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input type="text" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required placeholder="Ej: Anillos, Collares, Pulseras..." className="input-field" />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} placeholder="Descripción opcional de la categoría..."
              className="input-field resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1 justify-center">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Guardando...' : editItem ? 'Actualizar' : 'Crear categoría'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Eliminar categoría" size="sm">
        <div className="p-6">
          <p className="text-gray-400 mb-6">¿Estás seguro que querés eliminar esta categoría? Los productos asociados quedarán sin categoría.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button onClick={handleDelete} className="btn-danger flex-1 justify-center">Eliminar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
