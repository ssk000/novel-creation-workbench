import type { Novel, NovelMeta, Settings } from './types';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let msg = `请求失败 (${res.status})`;
    try {
      const j = await res.json();
      if (j && j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listNovels: () => request<NovelMeta[]>('/novels'),
  getNovel: (id: string) => request<Novel>(`/novels/${id}`),
  createNovel: (data: Partial<Novel>) =>
    request<Novel>('/novels', { method: 'POST', body: JSON.stringify(data) }),
  createSample: () => request<Novel>('/novels/sample', { method: 'POST' }),
  saveNovel: (novel: Novel) =>
    request<Novel>(`/novels/${novel.id}`, {
      method: 'PUT',
      body: JSON.stringify(novel),
    }),
  deleteNovel: (id: string) =>
    request<{ ok: boolean }>(`/novels/${id}`, { method: 'DELETE' }),
  getSettings: () => request<Settings>('/settings'),
  saveSettings: (s: Settings) =>
    request<Settings>('/settings', { method: 'PUT', body: JSON.stringify(s) }),
  testProvider: (providerId: string, model?: string) =>
    request<{ ok: boolean; sample?: string; error?: string }>('/test', {
      method: 'POST',
      body: JSON.stringify({ providerId, model }),
    }),
};

export interface GenerateOptions {
  providerId?: string;
  model?: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  maxTokens?: number;
}

export async function streamGenerate(
  opts: GenerateOptions,
  onToken: (t: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(BASE + '/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
    signal,
  });
  if (!res.ok || !res.body) {
    let msg = `生成失败 (${res.status})`;
    try {
      const j = await res.json();
      if (j && j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      try {
        const obj = JSON.parse(data);
        if (obj.error) throw new Error(obj.error);
        if (obj.token) onToken(obj.token);
        if (obj.done) return;
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
}
