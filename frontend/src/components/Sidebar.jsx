import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Package, ShoppingCart, Users, Tag, Settings, LogOut, Gem,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/inventory',  label: 'Inventario',   icon: Package },
  { to: '/sales',      label: 'Ventas',       icon: ShoppingCart },
  { to: '/suppliers',  label: 'Proveedores',  icon: Users },
  { to: '/categories', label: 'Categorías',   icon: Tag },
  { to: '/settings',   label: 'Configuración',icon: Settings },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();

  return (
    <aside
      className={`
        fixed lg:relative inset-y-0 left-0 z-30
        w-64 flex flex-col
        bg-[#0A0A0A] border-r border-surface-200
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-surface-200">
        <div className="p-2 bg-gold-500/10 rounded-lg border border-gold-500/30">
          <Gem size={20} className="text-gold-500" />
        </div>
        <div>
          <h1 className="font-serif text-lg font-semibold text-gold-gradient">Joyería</h1>
          <p className="text-xs text-gray-600">Sistema de Inventario</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
               ${isActive
                 ? 'bg-gold-500/15 text-gold-400 border border-gold-500/25 shadow-gold-sm'
                 : 'text-gray-500 hover:text-gray-300 hover:bg-surface-100'
               }`
            }
          >
            <Icon size={18} className="shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div className="px-3 pb-4 pt-2 border-t border-surface-200">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1">
          <div className="w-8 h-8 rounded-full bg-gold-gradient flex items-center justify-center text-[#0D0D0D] font-bold text-sm shrink-0">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-cream truncate">{user?.username}</p>
            <p className="text-xs text-gray-600 truncate">{user?.email || 'Sin email'}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                     text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-all duration-150"
        >
          <LogOut size={18} className="shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
