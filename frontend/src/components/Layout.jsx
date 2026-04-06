import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, Package, ShoppingCart, Truck, Tags, Settings, LogOut, Menu, X 
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/inventario', icon: Package, label: 'Inventario' },
  { path: '/ventas', icon: ShoppingCart, label: 'Ventas' },
  { path: '/proveedores', icon: Truck, label: 'Proveedores' },
  { path: '/categorias', icon: Tags, label: 'Categorías' },
  { path: '/configuracion', icon: Settings, label: 'Configuración' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-rose-600 text-white p-4 flex items-center justify-between">
        <span className="text-lg font-bold">Joyería</span>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2">
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        ${mobileOpen ? 'block' : 'hidden'}
        md:block w-full md:w-64 bg-white border-r border-gray-200 md:min-h-screen
      `}>
        <div className="p-4 md:p-6 border-b border-gray-100">
          <h1 className="text-xl md:text-2xl font-bold text-rose-600">Joyería</h1>
          <p className="text-sm text-gray-500 mt-1">Sistema de Inventario</p>
        </div>
        
        <nav className="p-4 space-y-1">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                ${isActive 
                  ? 'bg-rose-50 text-rose-600 font-medium' 
                  : 'text-gray-600 hover:bg-gray-50'}
              `}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="absolute md:fixed bottom-0 left-0 w-full md:w-64 p-4 border-t border-gray-100 bg-white">
          <div className="flex items-center justify-between">
            <div className="hidden md:block">
              <p className="font-medium text-sm">{user?.username}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-rose-600 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
