'use client';

import { supabase } from '@/lib/supabase';

export class ApiClientError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (data.session?.access_token) headers.set('Authorization', `Bearer ${data.session.access_token}`);
  if (init.body && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...init, headers });
  const payload = await response.json().catch(() => null) as { error?: string; code?: string } | null;
  if (!response.ok) {
    throw new ApiClientError(response.status, payload?.error ?? 'La operacion no pudo completarse.', payload?.code);
  }
  return payload as T;
}

export async function uploadCatalogImage(file: File, entity: string): Promise<string> {
  const formData = new FormData();
  formData.set('image', file);
  formData.set('entity', entity);
  const response = await apiFetch<{ asset: { url: string } }>('/api/uploads/images', {
    method: 'POST',
    body: formData,
  });
  return response.asset.url;
}
