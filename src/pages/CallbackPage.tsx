import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserManager } from '../auth/oidc';

export function CallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const manager = createUserManager();
    manager
      .signinRedirectCallback()
      .then(() => navigate('/', { replace: true }))
      .catch((err) => {
        console.error('[auth] callback error', err);
        navigate('/', { replace: true });
      });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center py-24 text-gray-500">
      Autenticando...
    </div>
  );
}
