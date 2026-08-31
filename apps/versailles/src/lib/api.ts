const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

export async function apiFetch(path: string, options?: RequestInit) {
  return fetch(`${BACKEND_URL}${path}`, options);
}
