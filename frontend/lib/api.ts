/**
 * OPC API Client — 调后端接口
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface FetchOptions extends RequestInit {
  token?: string;
}

async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOpts } = opts;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOpts.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...fetchOpts, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────
export const auth = {
  register: (email: string, password: string) =>
    apiFetch<{ access_token: string; user_id: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    apiFetch<{ access_token: string; user_id: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
};

// ── Canvas ────────────────────────────────────────
export interface ModuleItem {
  id: string;
  text: string;
  tags: string[];
}

export interface ModuleContent {
  summary: string;
  items: ModuleItem[];
  notes: string;
  status: "active" | "stagnant" | "attention" | "not_started";
  last_reviewed_at: string | null;
}

export interface ModuleOut {
  id: string;
  module_key: string;
  content: ModuleContent;
  updated_at: string;
}

export interface CanvasOut {
  id: string;
  name: string;
  created_at: string;
  modules: ModuleOut[];
}

export const canvas = {
  list: (token: string) =>
    apiFetch<CanvasOut[]>("/canvas", { token }),
  get: (id: string, token: string) =>
    apiFetch<CanvasOut>(`/canvas/${id}`, { token }),
  create: (name: string, token: string) =>
    apiFetch<CanvasOut>("/canvas", {
      method: "POST",
      token,
      body: JSON.stringify({ name }),
    }),
  updateModule: (canvasId: string, moduleKey: string, content: ModuleContent, token: string) =>
    apiFetch<ModuleOut>(`/canvas/${canvasId}/modules/${moduleKey}`, {
      method: "PUT",
      token,
      body: JSON.stringify({ content }),
    }),
  getVersions: (canvasId: string, moduleKey: string, token: string) =>
    apiFetch<{ id: string; version_num: number; content: ModuleContent; created_at: string }[]>(
      `/canvas/${canvasId}/modules/${moduleKey}/versions`,
      { token }
    ),
  diff: (canvasId: string, moduleKey: string, vA: number, vB: number, token: string) =>
    apiFetch<{ module_key: string; changes: Record<string, { old: unknown; new: unknown }> }>(
      `/canvas/${canvasId}/modules/${moduleKey}/diff?version_a=${vA}&version_b=${vB}`,
      { token }
    ),
};

// ── Review ────────────────────────────────────────
export interface ReviewAnswer {
  module_key: string;
  module_name: string;
  question: string;
  answer?: string;
}

export interface ReviewOut {
  id: string;
  canvas_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  answers: ReviewAnswer[];
}

export const review = {
  start: (canvasId: string, token: string) =>
    apiFetch<ReviewOut>("/review/start", {
      method: "POST",
      token,
      body: JSON.stringify({ canvas_id: canvasId }),
    }),
  get: (reviewId: string, token: string) =>
    apiFetch<ReviewOut>(`/review/${reviewId}`, { token }),
  answer: (reviewId: string, moduleKey: string, question: string, answer: string, token: string) =>
    apiFetch<{ ok: boolean }>(`/review/${reviewId}/answer`, {
      method: "POST",
      token,
      body: JSON.stringify({ module_key: moduleKey, question, answer }),
    }),
};
