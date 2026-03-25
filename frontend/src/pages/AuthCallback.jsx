import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import insforge from '../lib/insforge';
import { Gem } from 'lucide-react';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get('insforge_code');
    const error = searchParams.get('error');

    if (error || !code) {
      navigate('/login', { replace: true });
      return;
    }

    (async () => {
      try {
        const { data, error: exchangeError } = await insforge.auth.exchangeOAuthCode(code);
        if (exchangeError || !data?.accessToken) {
          navigate('/login', { replace: true });
          return;
        }

        const { data: session } = await api.post('/auth/insforge-callback', {
          accessToken: data.accessToken,
        });

        login(session.token, session.user);
        navigate('/dashboard', { replace: true });
      } catch {
        navigate('/login', { replace: true });
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D0D0D]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 bg-gold-500/20 blur-2xl rounded-full" />
          <Gem size={40} className="relative text-gold-500 opacity-60" />
        </div>
        <div className="w-8 h-8 rounded-full border-2 border-gold-500 border-t-transparent animate-spin" />
        <p className="text-gray-500 text-sm">Iniciando sesión con Google...</p>
      </div>
    </div>
  );
}
