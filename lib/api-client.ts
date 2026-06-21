import { auth } from "./firebase-client";

async function getAuthHeader(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export async function apiGet(url: string) {
  const headers = await getAuthHeader();
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error((await res.json()).error || "Request failed");
  return res.json();
}

export async function apiPost(url: string, body: unknown) {
  const headers = await getAuthHeader();
  const res = await fetch(url, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Request failed");
  return res.json();
}

export async function apiPatch(url: string, body: unknown) {
  const headers = await getAuthHeader();
  const res = await fetch(url, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Request failed");
  return res.json();
}

export async function apiDelete(url: string) {
  const headers = await getAuthHeader();
  const res = await fetch(url, { method: "DELETE", headers });
  if (!res.ok) throw new Error((await res.json()).error || "Request failed");
  return res.json();
}