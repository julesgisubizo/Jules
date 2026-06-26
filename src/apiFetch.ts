export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = localStorage.getItem('ubuntu-flimsy-token');
  const headers = new Headers(init?.headers);
  
  const isApi = typeof input === 'string' 
    ? input.startsWith('/api/') 
    : (input instanceof URL ? input.pathname.startsWith('/api/') : false);

  if (token && isApi) {
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return window.fetch(input, {
    ...init,
    headers
  });
}
