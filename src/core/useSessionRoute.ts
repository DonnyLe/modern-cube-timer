import { useEffect, useState } from 'react';

export function sessionLink(id: string, tab = 'overview') {
  return `#session/${encodeURIComponent(id)}/${tab}`;
}

function readRoute() {
  const match = /^#session\/([^/]+)(?:\/([^/]+))?$/.exec(window.location.hash);

  if (!match) return null;

  try {
    const [tab = 'overview', search = ''] = (match[2] || 'overview').split('?');

    return { id: decodeURIComponent(match[1]), tab: tab === 'graphs' ? 'data' : tab, search };
  } catch {
    return null;
  }
}

export function useSessionRoute() {
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const update = () => setRoute(readRoute());

    window.addEventListener('hashchange', update);

    return () => window.removeEventListener('hashchange', update);
  }, []);

  return route;
}
