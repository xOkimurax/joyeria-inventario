import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import insforge from '../lib/insforge';
import { Gem } from 'lucide-react';

export default function AuthCallback() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    (async () => {
      try {
        // Wait for the SDK to auto-detect and exchange the OAuth code
        await insforge.auth.authCallbackHandled;

        // getSession() returns { data: { user }, error } — NOT accessToken
        const { data: sessionData, error: sessionError } = await insforge.auth.getSession();

        if (sessionError || !sessionData?.user) {
          console.error('No session after OAuth:', sessionError);
          navigate('/login', { replace: true });
          return;
        }

        // Get the access token via getAccessToken()
        const accessToken = insforge.auth.getAccessToken();

        if (!accessToken) {
          console.error('No access token after OAuth');
          navigate('/login', { replace: true });
          return;
        }

        // Exchange InsForge token for our local JWT
        const { data: session } = await api.post('/auth/insforge-callback', {
          accessToken,
        });

        login(session.token, session.user);
        navigate('/dashboard', { replace: true });
      } catch (e) {
        console.error('Auth callback error:', e);
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
