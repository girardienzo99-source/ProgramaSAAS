import { ApiError, isUuid } from './core';
import {
  createCompanyProduct,
  enqueueLocalApiEvent,
  findCompanyProductBySku,
  listCompanyProducts,
  type PublicProductRecord,
} from './publicDataStore';
import { createAdminServerClient, isServerSupabaseAdminConfigured } from '@/lib/server/supabase';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

interface ProductCursor {
  createdAt: string;
  id: string;
}

interface DatabaseProduct {
  id: string;
  company_id: string;
  name: string;
  sku: string;
  price: number | string;
  stock: number | string;
  created_at: string;
}

export interface PublicProductPage {
  products: PublicProductRecord[];
  nextCursor: string | null;
}

export interface EnqueuedPublicEvent {
  id: string;
  status: string;
  duplicate: boolean;
  createdAt: string;
}

function databaseRequired(): never {
  throw new ApiError(
    503,
    'La persistencia de la API publica no esta configurada.',
    'PERSISTENCE_NOT_CONFIGURED',
  );
}

function mapProduct(product: DatabaseProduct): PublicProductRecord {
  return {
    id: product.id,
    companyId: product.company_id,
    name: product.name,
    sku: product.sku,
    price: Number(product.price),
    stock: Number(product.stock),
    createdAt: product.created_at,
  };
}

function encodeCursor(product: PublicProductRecord): string {
  return Buffer.from(JSON.stringify({ createdAt: product.createdAt, id: product.id }), 'utf8').toString('base64url');
}

function decodeCursor(value: string | null): ProductCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<ProductCursor>;
    if (!parsed.createdAt || Number.isNaN(Date.parse(parsed.createdAt)) || !parsed.id || !isUuid(parsed.id)) {
      throw new Error('invalid cursor');
    }
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    throw new ApiError(400, 'El cursor de paginacion no es valido.', 'INVALID_CURSOR');
  }
}

export function parseProductPage(url: string): { limit: number; cursor: ProductCursor | null } {
  const params = new URL(url).searchParams;
  const rawLimit = params.get('limit');
  const limit = rawLimit === null ? DEFAULT_PAGE_SIZE : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    throw new ApiError(400, `limit debe ser un entero entre 1 y ${MAX_PAGE_SIZE}.`, 'INVALID_PAGE_SIZE');
  }
  return { limit, cursor: decodeCursor(params.get('cursor')) };
}

export async function listPersistentCompanyProducts(
  companyId: string,
  options: { limit: number; cursor: ProductCursor | null },
): Promise<PublicProductPage> {
  if (isServerSupabaseAdminConfigured) {
    const supabase = createAdminServerClient();
    const { data, error } = await supabase.rpc('public_api_list_products', {
      p_company_id: companyId,
      p_limit: options.limit + 1,
      p_cursor_created_at: options.cursor?.createdAt ?? null,
      p_cursor_id: options.cursor?.id ?? null,
    });
    if (error) throw new ApiError(503, 'No se pudo consultar el catalogo.', 'CATALOG_UNAVAILABLE');

    const rows = (data ?? []) as DatabaseProduct[];
    const hasNextPage = rows.length > options.limit;
    const products = rows.slice(0, options.limit).map(mapProduct);
    return {
      products,
      nextCursor: hasNextPage && products.length ? encodeCursor(products[products.length - 1]) : null,
    };
  }

  if (process.env.NODE_ENV === 'production') databaseRequired();
  const allProducts = listCompanyProducts(companyId);
  const startIndex = options.cursor
    ? Math.max(allProducts.findIndex((product) => product.id === options.cursor?.id) + 1, 0)
    : 0;
  const products = allProducts.slice(startIndex, startIndex + options.limit);
  const hasNextPage = startIndex + options.limit < allProducts.length;
  return {
    products,
    nextCursor: hasNextPage && products.length ? encodeCursor(products[products.length - 1]) : null,
  };
}

export async function createPersistentCompanyProduct(
  companyId: string,
  input: { name: string; sku: string; price: number; stock: number },
): Promise<PublicProductRecord> {
  if (isServerSupabaseAdminConfigured) {
    const supabase = createAdminServerClient();
    const { data, error } = await supabase.rpc('public_api_create_product', {
      p_company_id: companyId,
      p_name: input.name,
      p_sku: input.sku,
      p_price: input.price,
      p_stock: input.stock,
    });
    if (error?.message.includes('SKU_ALREADY_EXISTS')) {
      throw new ApiError(409, 'Ya existe un producto con ese SKU.', 'SKU_ALREADY_EXISTS');
    }
    if (error?.message.includes('DEFAULT_BRANCH_REQUIRED')) {
      throw new ApiError(409, 'La empresa necesita una sucursal principal para registrar stock.', 'BRANCH_REQUIRED');
    }
    if (error || !Array.isArray(data) || !data[0]) {
      throw new ApiError(503, 'No se pudo guardar el producto.', 'CATALOG_UNAVAILABLE');
    }
    return mapProduct(data[0] as DatabaseProduct);
  }

  if (process.env.NODE_ENV === 'production') databaseRequired();
  try {
    return createCompanyProduct(companyId, input);
  } catch (error) {
    if (error instanceof Error && error.message === 'SKU_ALREADY_EXISTS') {
      throw new ApiError(409, 'Ya existe un producto con ese SKU.', 'SKU_ALREADY_EXISTS');
    }
    throw error;
  }
}

export async function findPersistentCompanyProductBySku(companyId: string, sku: string) {
  if (isServerSupabaseAdminConfigured) {
    const supabase = createAdminServerClient();
    const { data, error } = await supabase.rpc('public_api_find_product_by_sku', {
      p_company_id: companyId,
      p_sku: sku,
    });
    if (error) throw new ApiError(503, 'No se pudo consultar el stock.', 'STOCK_UNAVAILABLE');
    return Array.isArray(data) && data[0] ? mapProduct(data[0] as DatabaseProduct) : undefined;
  }

  if (process.env.NODE_ENV === 'production') databaseRequired();
  return findCompanyProductBySku(companyId, sku);
}

export async function enqueuePersistentApiEvent(
  companyId: string,
  eventType: string,
  idempotencyKey: string,
  payload: Record<string, unknown>,
): Promise<EnqueuedPublicEvent> {
  if (isServerSupabaseAdminConfigured) {
    const supabase = createAdminServerClient();
    const { data, error } = await supabase.rpc('public_api_enqueue_event', {
      p_company_id: companyId,
      p_event_type: eventType,
      p_idempotency_key: idempotencyKey,
      p_payload: payload,
    });
    if (error || !Array.isArray(data) || !data[0]) {
      throw new ApiError(503, 'No se pudo encolar la operacion.', 'EVENT_QUEUE_UNAVAILABLE');
    }
    const row = data[0] as { id: string; status: string; duplicate: boolean; created_at: string };
    return { id: row.id, status: row.status, duplicate: row.duplicate, createdAt: row.created_at };
  }

  if (process.env.NODE_ENV === 'production') databaseRequired();
  const result = enqueueLocalApiEvent(companyId, eventType, idempotencyKey, payload);
  return {
    id: result.event.id,
    status: result.event.status,
    duplicate: result.duplicate,
    createdAt: result.event.createdAt,
  };
}
