export interface PublicProductRecord {
  id: string;
  companyId: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  createdAt: string;
}

export interface PublicApiEventRecord {
  id: string;
  companyId: string;
  eventType: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  status: 'queued';
  createdAt: string;
}

const productsByCompany = new Map<string, PublicProductRecord[]>();
const eventsByIdempotencyKey = new Map<string, PublicApiEventRecord>();

export function listCompanyProducts(companyId: string) {
  return [...(productsByCompany.get(companyId) ?? [])];
}

export function createCompanyProduct(
  companyId: string,
  input: Omit<PublicProductRecord, 'id' | 'companyId' | 'createdAt'>,
) {
  if (findCompanyProductBySku(companyId, input.sku)) {
    throw new Error('SKU_ALREADY_EXISTS');
  }
  const product: PublicProductRecord = {
    id: crypto.randomUUID(),
    companyId,
    createdAt: new Date().toISOString(),
    ...input,
  };
  const current = productsByCompany.get(companyId) ?? [];
  productsByCompany.set(companyId, [product, ...current]);
  return product;
}

export function findCompanyProductBySku(companyId: string, sku: string) {
  return (productsByCompany.get(companyId) ?? []).find((product) => product.sku === sku);
}

export function enqueueLocalApiEvent(
  companyId: string,
  eventType: string,
  idempotencyKey: string,
  payload: Record<string, unknown>,
) {
  const key = `${companyId}:${eventType}:${idempotencyKey}`;
  const existing = eventsByIdempotencyKey.get(key);
  if (existing) return { event: existing, duplicate: true };

  const event: PublicApiEventRecord = {
    id: crypto.randomUUID(),
    companyId,
    eventType,
    idempotencyKey,
    payload,
    status: 'queued',
    createdAt: new Date().toISOString(),
  };
  eventsByIdempotencyKey.set(key, event);
  return { event, duplicate: false };
}
