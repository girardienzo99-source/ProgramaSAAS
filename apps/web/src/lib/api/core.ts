export type JsonObject = Record<string, unknown>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_MAX_JSON_BYTES = 1_048_576;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    status: number,
    message: string,
    code = 'BAD_REQUEST',
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function readJsonObject(
  request: Request,
  maxBytes = DEFAULT_MAX_JSON_BYTES,
): Promise<JsonObject> {
  let value: unknown;

  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new ApiError(413, 'El cuerpo de la solicitud supera el limite permitido.', 'PAYLOAD_TOO_LARGE');
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > maxBytes) {
    throw new ApiError(413, 'El cuerpo de la solicitud supera el limite permitido.', 'PAYLOAD_TOO_LARGE');
  }

  try {
    value = JSON.parse(rawBody);
  } catch {
    throw new ApiError(400, 'El cuerpo de la solicitud debe ser un JSON válido.', 'INVALID_JSON');
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(400, 'El cuerpo de la solicitud debe ser un objeto JSON.', 'INVALID_BODY');
  }

  return value as JsonObject;
}

export function requiredString(body: JsonObject, field: string, label = field): string {
  const value = body[field];
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, `${label} es obligatorio.`, 'VALIDATION_ERROR');
  }
  return value.trim();
}

export function requiredBoundedString(
  body: JsonObject,
  field: string,
  options: { label?: string; maxLength: number },
): string {
  const value = requiredString(body, field, options.label ?? field);
  if (value.length > options.maxLength) {
    throw new ApiError(
      400,
      `${options.label ?? field} no puede superar ${options.maxLength} caracteres.`,
      'VALIDATION_ERROR',
    );
  }
  return value;
}

export function requiredIdempotencyKey(request: Request): string {
  const value = request.headers.get('idempotency-key')?.trim();
  if (!value || value.length < 8 || value.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(value)) {
    throw new ApiError(
      400,
      'Idempotency-Key es obligatorio y debe contener entre 8 y 128 caracteres seguros.',
      'INVALID_IDEMPOTENCY_KEY',
    );
  }
  return value;
}

export function optionalString(body: JsonObject, field: string): string | undefined {
  const value = body[field];
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') {
    throw new ApiError(400, `${field} debe ser texto.`, 'VALIDATION_ERROR');
  }
  return value.trim();
}

export function requiredNumber(
  body: JsonObject,
  field: string,
  options: { min?: number; label?: string } = {},
): number {
  const value = body[field];
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(parsed) || (options.min !== undefined && parsed < options.min)) {
    const constraint = options.min !== undefined ? ` mayor o igual a ${options.min}` : '';
    throw new ApiError(400, `${options.label ?? field} debe ser un número válido${constraint}.`, 'VALIDATION_ERROR');
  }
  return parsed;
}

export function optionalNumber(
  body: JsonObject,
  field: string,
  fallback: number,
  options: { min?: number; label?: string } = {},
): number {
  if (body[field] === undefined || body[field] === null || body[field] === '') return fallback;
  return requiredNumber(body, field, options);
}

export function requiredArray(body: JsonObject, field: string, label = field): unknown[] {
  const value = body[field];
  if (!Array.isArray(value) || value.length === 0) {
    throw new ApiError(400, `${label} debe contener al menos un elemento.`, 'VALIDATION_ERROR');
  }
  return value;
}

export function requiredBoolean(body: JsonObject, field: string, label = field): boolean {
  const value = body[field];
  if (typeof value !== 'boolean') {
    throw new ApiError(400, `${label} debe ser verdadero o falso.`, 'VALIDATION_ERROR');
  }
  return value;
}

export function enumValue<const T extends readonly string[]>(
  body: JsonObject,
  field: string,
  allowed: T,
  fallback?: T[number],
): T[number] {
  const value = body[field];
  if ((value === undefined || value === null || value === '') && fallback !== undefined) return fallback;
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw new ApiError(400, `${field} debe ser uno de: ${allowed.join(', ')}.`, 'VALIDATION_ERROR');
  }
  return value as T[number];
}

export function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    const next = csv[index + 1];

    if (character === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }

  if (quoted) throw new ApiError(400, 'El CSV contiene una celda entre comillas sin cerrar.', 'INVALID_CSV');
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
