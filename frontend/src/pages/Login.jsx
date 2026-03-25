import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Gem, Eye, EyeOff, Lock, User, Mail, KeyRound } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot' | 'reset'
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [form, setForm] = useState({
    username: '', password: '', confirmPassword: '',
    email: '', code: '', newPassword: '',
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        username: form.username,
        password: form.password,
      });
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        username: form.username,
        password: form.password,
        email: form.email,
      });
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { username: form.username });
      toast.success('Si existe el usuario con email, recibirás el código');
      setMode('reset');
    } catch {
      toast.error('Error al enviar código');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        username: form.username,
        token: form.code,
        newPassword: form.newPassword,
      });
      toast.success('Contraseña actualizada. Inicia sesión.');
      setMode('login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Código incorrecto o expirado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#080808] items-center justify-center relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, #C9A84C 0, #C9A84C 1px, transparent 0, transparent 50%)`,
            backgroundSize: '30px 30px',
          }}
        />
        {/* Center decoration */}
        <div className="relative z-10 flex flex-col items-center gap-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gold-500/20 blur-3xl rounded-full" />
            <div className="relative p-8 border border-gold-500/30 rounded-full bg-gold-500/5">
              <Gem size={64} className="text-gold-500" />
            </div>
          </div>
          <div className="text-center">
            <h2 className="font-serif text-4xl font-semibold text-gold-gradient mb-3">
              Joyería
            </h2>
            <p className="text-gray-600 text-lg">Sistema de Inventario Premium</p>
          </div>
          {/* Decorative diamonds */}
          <div className="flex gap-3 opacity-40">
            {[...Array(5)].map((_, i) => (
              <div key={i}
                className="w-2 h-2 rotate-45 bg-gold-500"
                style={{ opacity: i === 2 ? 1 : 0.4 + i * 0.15 }}
              />
            ))}
          </div>
          <div className="max-w-xs text-center">
            <p className="text-gray-700 text-sm leading-relaxed italic font-serif">
              "La elegancia no es ser notado, sino ser recordado"
            </p>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#0D0D0D]">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <Gem size={28} className="text-gold-500" />
            <span className="font-serif text-2xl text-gold-gradient font-semibold">Joyería</span>
          </div>

          {/* Card */}
          <div className="bg-surface-50 border border-surface-200 rounded-2xl p-8"
            style={{ boxShadow: '0 0 40px rgba(0,0,0,0.6)' }}>

            {mode === 'login' && (
              <>
                <div className="mb-6">
                  <h1 className="font-serif text-2xl font-semibold text-cream mb-1">Bienvenido</h1>
                  <p className="text-gray-500 text-sm">Inicia sesión para continuar</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="label">Usuario</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                      <input
                        type="text" value={form.username} onChange={set('username')}
                        placeholder="tu_usuario" required
                        className="input-field pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">Contraseña</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                      <input
                        type={showPass ? 'text' : 'password'} value={form.password} onChange={set('password')}
                        placeholder="••••••••" required
                        className="input-field pl-9 pr-10"
                      />
                      <button type="button" onClick={() => setShowPass(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                    {loading ? 'Iniciando...' : 'Iniciar sesión'}
                  </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-surface-300" />
                  <span className="text-xs text-gray-600">o</span>
                  <div className="flex-1 h-px bg-surface-300" />
                </div>

                {/* Google OAuth */}
                <a
                  href="/api/auth/google"
                  className="flex items-center justify-center gap-3 w-full py-2.5 px-4
                             border border-surface-300 rounded-xl text-gray-300
                             hover:border-gray-500 hover:text-white transition-all bg-surface-100"
                >
                  {/* Google icon SVG */}
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
                    <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
                  </svg>
                  Continuar con Google
                </a>

                <div className="mt-4 flex flex-col gap-2 text-center">
                  <button onClick={() => setMode('forgot')}
                    className="text-sm text-gray-600 hover:text-gold-500 transition-colors">
                    ¿Olvidaste tu contraseña?
                  </button>
                  <button onClick={() => setMode('register')}
                    className="text-sm text-gray-500 hover:text-cream transition-colors">
                    ¿No tienes cuenta? <span className="text-gold-500">Regístrate</span>
                  </button>
                </div>
              </>
            )}

            {mode === 'register' && (
              <>
                <div className="mb-6">
                  <h1 className="font-serif text-2xl font-semibold text-cream mb-1">Crear cuenta</h1>
                  <p className="text-gray-500 text-sm">Regístrate para empezar</p>
                </div>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="label">Usuario</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                      <input type="text" value={form.username} onChange={set('username')}
                        placeholder="tu_usuario" required minLength={3}
                        className="input-field pl-9" />
                    </div>
                  </div>
                  <div>
                    <label className="label">Email (para recuperación)</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                      <input type="email" value={form.email} onChange={set('email')}
                        placeholder="correo@ejemplo.com"
                        className="input-field pl-9" />
                    </div>
                  </div>
                  <div>
                    <label className="label">Contraseña</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                      <input type={showPass ? 'text' : 'password'} value={form.password} onChange={set('password')}
                        placeholder="••••••••" required minLength={6}
                        className="input-field pl-9 pr-10" />
                      <button type="button" onClick={() => setShowPass(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="label">Confirmar contraseña</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                      <input type={showPass ? 'text' : 'password'} value={form.confirmPassword}
                        onChange={set('confirmPassword')} placeholder="••••••••" required
                        className="input-field pl-9" />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                    {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                  </button>
                </form>
                <button onClick={() => setMode('login')}
                  className="mt-4 w-full text-sm text-gray-500 hover:text-cream transition-colors text-center">
                  ¿Ya tienes cuenta? <span className="text-gold-500">Inicia sesión</span>
                </button>
              </>
            )}

            {mode === 'forgot' && (
              <>
                <div className="mb-6">
                  <h1 className="font-serif text-2xl font-semibold text-cream mb-1">Recuperar contraseña</h1>
                  <p className="text-gray-500 text-sm">Ingresa tu usuario para recibir el código</p>
                </div>
                <form onSubmit={handleForgot} className="space-y-4">
                  <div>
                    <label className="label">Usuario</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                      <input type="text" value={form.username} onChange={set('username')}
                        placeholder="tu_usuario" required className="input-field pl-9" />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                    {loading ? 'Enviando...' : 'Enviar código'}
                  </button>
                </form>
                <button onClick={() => setMode('login')}
                  className="mt-4 w-full text-sm text-gray-500 hover:text-cream transition-colors text-center">
                  Volver al inicio de sesión
                </button>
              </>
            )}

            {mode === 'reset' && (
              <>
                <div className="mb-6">
                  <h1 className="font-serif text-2xl font-semibold text-cream mb-1">Nueva contraseña</h1>
                  <p className="text-gray-500 text-sm">Ingresa el código recibido por email</p>
                </div>
                <form onSubmit={handleReset} className="space-y-4">
                  <div>
                    <label className="label">Usuario</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                      <input type="text" value={form.username} onChange={set('username')}
                        placeholder="tu_usuario" required className="input-field pl-9" />
                    </div>
                  </div>
                  <div>
                    <label className="label">Código de recuperación</label>
                    <div className="relative">
                      <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                      <input type="text" value={form.code} onChange={set('code')}
                        placeholder="XXXXXX" required className="input-field pl-9 uppercase tracking-widest" />
                    </div>
                  </div>
                  <div>
                    <label className="label">Nueva contraseña</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                      <input type={showPass ? 'text' : 'password'} value={form.newPassword}
                        onChange={set('newPassword')} placeholder="••••••••" required minLength={6}
                        className="input-field pl-9 pr-10" />
                      <button type="button" onClick={() => setShowPass(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                    {loading ? 'Actualizando...' : 'Actualizar contraseña'}
                  </button>
                </form>
                <button onClick={() => setMode('login')}
                  className="mt-4 w-full text-sm text-gray-500 hover:text-cream transition-colors text-center">
                  Volver al inicio de sesión
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
