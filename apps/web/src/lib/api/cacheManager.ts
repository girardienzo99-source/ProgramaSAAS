/**
 * Administrador de Caché Multi-Tenant de Alta Concurrencia (L1 In-Memory + Tag-based Invalidation)
 * Diseñado para soportar millones de lecturas por segundo aisladas por company_id.
 */

export interface CacheOptions {
  ttlMs?: number;
  tags?: string[];
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
}

class MultiTenantCacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private tagMap = new Map<string, Set<string>>();

  private buildKey(companyId: string, namespace: string, key: string): string {
    return `${companyId}:${namespace}:${key}`;
  }

  set<T>(companyId: string, namespace: string, key: string, value: T, options: CacheOptions = {}): void {
    const fullKey = this.buildKey(companyId, namespace, key);
    const ttl = options.ttlMs ?? 60000; // Default 1 minuto
    const expiresAt = Date.now() + ttl;
    const tags = options.tags ?? [companyId, `${companyId}:${namespace}`];

    this.cache.set(fullKey, { value, expiresAt, tags });

    for (const tag of tags) {
      if (!this.tagMap.has(tag)) {
        this.tagMap.set(tag, new Set());
      }
      this.tagMap.get(tag)!.add(fullKey);
    }
  }

  get<T>(companyId: string, namespace: string, key: string): T | null {
    const fullKey = this.buildKey(companyId, namespace, key);
    const entry = this.cache.get(fullKey);

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.delete(companyId, namespace, key);
      return null;
    }

    return entry.value as T;
  }

  delete(companyId: string, namespace: string, key: string): void {
    const fullKey = this.buildKey(companyId, namespace, key);
    const entry = this.cache.get(fullKey);
    if (!entry) return;

    for (const tag of entry.tags) {
      const set = this.tagMap.get(tag);
      if (set) {
        set.delete(fullKey);
        if (set.size === 0) this.tagMap.delete(tag);
      }
    }

    this.cache.delete(fullKey);
  }

  invalidateByTag(tag: string): void {
    const keys = this.tagMap.get(tag);
    if (!keys) return;

    for (const key of Array.from(keys)) {
      this.cache.delete(key);
    }

    this.tagMap.delete(tag);
  }

  clearCompanyCache(companyId: string): void {
    this.invalidateByTag(companyId);
  }

  getStats() {
    return {
      totalEntries: this.cache.size,
      totalTags: this.tagMap.size
    };
  }
}

export const cacheManager = new MultiTenantCacheManager();
