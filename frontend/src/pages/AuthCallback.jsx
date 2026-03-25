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
        // The InsForge SDK auto-detects and exchanges the OAuth code on init.
        // Wait for that async process to complete, then read the session.
        await insforge.auth.authCallbackHandled;

        const { data: sessionData } = await insforge.auth.getSession();

        if (!sessionData?.accessToken) {
          navigate('/login', { replace: true });
          return;
        }

        // Exchange InsForge token for our local JWT
        const { data: session } = await api.post('/auth/insforge-callback', {
          accessToken: sessionData.accessToken,
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
