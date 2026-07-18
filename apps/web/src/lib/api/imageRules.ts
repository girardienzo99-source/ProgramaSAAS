export const MAX_CATALOG_IMAGE_BYTES = 5 * 1024 * 1024;
export const CATALOG_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

type CatalogImageType = (typeof CATALOG_IMAGE_TYPES)[number];

const extensions: Record<CatalogImageType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function isValidImageMetadata(file: { size: number; type: string }): boolean {
  return file.size > 0
    && file.size <= MAX_CATALOG_IMAGE_BYTES
    && CATALOG_IMAGE_TYPES.includes(file.type as CatalogImageType);
}

export function isValidImageSignature(bytes: Uint8Array, type: string): boolean {
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.length >= 8
    && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  const isWebp = bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
    && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';

  return (type === 'image/jpeg' && isJpeg)
    || (type === 'image/png' && isPng)
    || (type === 'image/webp' && isWebp);
}

export function normalizeAssetEntityValue(value: unknown): string | null {
  const entity = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return /^[a-z][a-z0-9_-]{1,40}$/.test(entity) ? entity : null;
}

export function extensionForValidImageType(type: string): string | null {
  return extensions[type as CatalogImageType] ?? null;
}
