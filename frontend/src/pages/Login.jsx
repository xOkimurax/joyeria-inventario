import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if any user exists
    api.get('/auth/check').then(res => {
      setIsRegister(!res.data.exists);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register(username, email, password);
      } else {
        await login(username, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-rose-600">Joyería</h1>
          <p className="text-gray-500 mt-2">
            {isRegister ? 'Crea tu cuenta' : 'Inicia sesión'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
              required
              autoComplete="username"
            />
          </div>

          {isRegister && (
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                required
                autoComplete="email"
              />
            </div>
          )}

          <div>
            <label className="label">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </button>
        </form>

        {!isRegister && (
          <p className="text-center text-sm text-gray-500 mt-4">
            Primera vez?{' '}
            <button
              type="button"
              onClick={() => setIsRegister(true)}
              className="text-rose-600 font-medium hover:underline"
            >
              Crear cuenta
            </button>
          </p>
        )}

        {isRegister && (
          <p className="text-center text-sm text-gray-500 mt-4">
            Ya tienes cuenta?{' '}
            <button
              type="button"
              onClick={() => setIsRegister(false)}
              className="text-rose-600 font-medium hover:underline"
            >
              Inicia sesión
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
