const TOKEN_KEY = "cc_token";

export const API_URL =
  typeof window === "undefined"
    ? (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000")
    : "";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) window.sessionStorage.setItem(TOKEN_KEY, token);
    else window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

function friendlyError(text: string, status: number): string {
  try {
    const json = JSON.parse(text) as { message?: string | string[] | { formErrors?: string[] } };
    if (typeof json.message === "string") return json.message;
    if (Array.isArray(json.message)) return json.message.join(", ");
  } catch {
    // fall through
  }
  if (status === 401) return "Invalid email or password";
  if (status === 403) return "You do not have permission";
  if (status >= 500) return "Server error — please try again";
  return text || "Request failed";
}

export async function api<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.json !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  const token = getStoredToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers,
    credentials: "include",
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(friendlyError(text, res.status));
  }
  return res.json() as Promise<T>;
}

export async function loginWithPassword(email: string, password: string) {
  const result = await api<{ token: string; user: { id: string; email: string; role: string } }>(
    "/auth/login",
    { method: "POST", json: { email, password } },
  );
  setStoredToken(result.token);
  return result;
}

export async function loginWithTracking(trackingId: string, phoneLast4: string) {
  const result = await api<{ token: string; user: { id: string; email: string; role: string } }>(
    "/auth/login/tracking",
    { method: "POST", json: { trackingId, phoneLast4 } },
  );
  setStoredToken(result.token);
  return result;
}

export async function logout() {
  try {
    await api("/auth/logout", { method: "POST" });
  } finally {
    setStoredToken(null);
  }
}
