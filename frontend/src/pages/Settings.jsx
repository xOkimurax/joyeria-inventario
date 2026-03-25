import { useState } from 'react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Lock, Mail, Shield, User } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwSaving, setPwSaving] = useState(false);

  const [emailForm, setEmailForm] = useState({ email: user?.email || '' });
  const [emailSaving, setEmailSaving] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast.error('Las contraseñas nuevas no coinciden');
      return;
    }
    if (pwForm.new_password.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    setPwSaving(true);
    try {
      await api.put('/settings/password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      toast.success('Contraseña actualizada correctamente');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al actualizar contraseña');
    } finally {
      setPwSaving(false);
    }
  };

  const handleEmailChange = async (e) => {
    e.preventDefault();
    setEmailSaving(true);
    try {
      await api.put('/settings/email', { email: emailForm.email });
      toast.success('Email actualizado correctamente');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al actualizar email');
    } finally {
      setEmailSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-semibold text-cream">Configuración</h1>
        <p className="text-gray-500 text-sm mt-0.5">Administrá tu cuenta y seguridad</p>
      </div>

      {/* Account info */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gold-500/10 rounded-lg">
            <User size={18} className="text-gold-500" />
          </div>
          <h2 className="font-semibold text-cream">Información de cuenta</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-100 border border-surface-300 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Usuario</p>
            <p className="text-sm font-medium text-cream">{user?.username || '—'}</p>
          </div>
          <div className="bg-surface-100 border border-surface-300 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Rol</p>
            <p className="text-sm font-medium text-cream capitalize">{user?.role || 'admin'}</p>
          </div>
        </div>
      </div>

      {/* Email */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Mail size={18} className="text-blue-400" />
          </div>
          <h2 className="font-semibold text-cream">Cambiar email</h2>
        </div>
        <form onSubmit={handleEmailChange} className="space-y-4">
          <div>
            <label className="label">Nuevo email</label>
            <input
              type="email"
              value={emailForm.email}
              onChange={e => setEmailForm({ email: e.target.value })}
              required
              placeholder="tu@email.com"
              className="input-field"
            />
          </div>
          <button type="submit" disabled={emailSaving} className="btn-primary">
            {emailSaving ? 'Guardando...' : 'Actualizar email'}
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Lock size={18} className="text-purple-400" />
          </div>
          <h2 className="font-semibold text-cream">Cambiar contraseña</h2>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="label">Contraseña actual</label>
            <input
              type="password"
              value={pwForm.current_password}
              onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))}
              required
              placeholder="••••••••"
              className="input-field"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="label">Nueva contraseña</label>
            <input
              type="password"
              value={pwForm.new_password}
              onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))}
              required
              placeholder="••••••••"
              className="input-field"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label">Confirmar nueva contraseña</label>
            <input
              type="password"
              value={pwForm.confirm_password}
              onChange={e => setPwForm(f => ({ ...f, confirm_password: e.target.value }))}
              required
              placeholder="••••••••"
              className="input-field"
              autoComplete="new-password"
            />
          </div>
          {pwForm.new_password && pwForm.confirm_password && pwForm.new_password !== pwForm.confirm_password && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              Las contraseñas no coinciden
            </p>
          )}
          <button type="submit" disabled={pwSaving} className="btn-primary">
            {pwSaving ? 'Guardando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>

      {/* Security info */}
      <div className="card border-gold-500/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-gold-500/10 rounded-lg">
            <Shield size={18} className="text-gold-500" />
          </div>
          <h2 className="font-semibold text-cream">Seguridad</h2>
        </div>
        <ul className="space-y-2 text-sm text-gray-500">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-500/60 shrink-0" />
            Las sesiones expiran automáticamente por inactividad
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-500/60 shrink-0" />
            Todas las contraseñas están encriptadas con bcrypt
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-500/60 shrink-0" />
            La comunicación está protegida con JWT
          </li>
        </ul>
      </div>
    </div>
  );
}
