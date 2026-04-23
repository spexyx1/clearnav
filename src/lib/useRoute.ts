import { useState, useEffect } from 'react';

export type AppRoute =
  | 'landing'
  | 'login'
  | 'accept-invite'
  | 'signup'
  | 'debug'
  | 'sales-sheet'
  | 'terms'
  | 'privacy'
  | 'investors';

function detectRoute(): AppRoute {
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname;

  if (params.get('token'))          return 'accept-invite';
  if (params.get('login'))          return 'login';
  if (path === '/signup')           return 'signup';
  if (path === '/debug')            return 'debug';
  if (path === '/sales-sheet')      return 'sales-sheet';
  if (path === '/terms')            return 'terms';
  if (path === '/privacy')          return 'privacy';
  if (path === '/investors')        return 'investors';
  return 'landing';
}

/**
 * Reads the current URL and re-evaluates on popstate (back/forward, pushState).
 * Returns [route, navigate].
 *
 * navigate(path) calls history.pushState and triggers the listener.
 */
export function useRoute(): [AppRoute, (path: string) => void] {
  const [route, setRoute] = useState<AppRoute>(detectRoute);

  useEffect(() => {
    const handle = () => setRoute(detectRoute());
    window.addEventListener('popstate', handle);
    return () => window.removeEventListener('popstate', handle);
  }, []);

  function navigate(path: string) {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  return [route, navigate];
}
