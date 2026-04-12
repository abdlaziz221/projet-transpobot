export const BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    // On force l'inclusion des cookies (HttpOnly) dans les requêtes
    options.credentials = 'include';
    
    // Garder le support localStorage en fallback temporaire si nécessaire, 
    // mais la priorité est désormais au cookie géré par le navigateur.
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };
    }
    const res = await fetch(`${BASE_URL}${url}`, options);
    return res;
}

/** Helper pour les appels GET JSON avec gestion d'erreur */
export async function getJSON<T>(url: string): Promise<T | null> {
    try {
        const res = await fetchWithAuth(url);
        if (!res.ok) {
            console.error(`GET ${url} failed: ${res.status}`);
            return null;
        }
        return await res.json() as T;
    } catch (err) {
        console.error(`GET ${url} error:`, err);
        return null;
    }
}
