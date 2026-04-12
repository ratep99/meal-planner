import axios from "axios";

/** Empty string = same-origin `/api` (use Vite dev proxy or same-host deploy). */
const baseURL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";

export const api = axios.create({
  baseURL,
});

/** Absolute URL for fetch/blob downloads (PDF). */
export function resolveApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (baseURL) return `${baseURL}${p}`;
  if (typeof window !== "undefined") return `${window.location.origin}${p}`;
  return p;
}
