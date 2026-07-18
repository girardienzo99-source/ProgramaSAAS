import { ApiError } from './core';
import {
  CATALOG_IMAGE_TYPES,
  extensionForValidImageType,
  isValidImageMetadata,
  isValidImageSignature,
  MAX_CATALOG_IMAGE_BYTES,
  normalizeAssetEntityValue,
} from './imageRules';

export { CATALOG_IMAGE_TYPES, MAX_CATALOG_IMAGE_BYTES };

export function validateImageMetadata(file: { size: number; type: string }) {
  if (file.size <= 0 || file.size > MAX_CATALOG_IMAGE_BYTES) {
    throw new ApiError(413, 'La imagen debe pesar entre 1 byte y 5 MB.', 'IMAGE_SIZE_INVALID');
  }
  if (!isValidImageMetadata(file)) {
    throw new ApiError(415, 'Solo se admiten imagenes JPEG, PNG o WebP.', 'IMAGE_TYPE_INVALID');
  }
}

export function validateImageSignature(bytes: Uint8Array, type: string) {
  if (!isValidImageSignature(bytes, type)) {
    throw new ApiError(415, 'El contenido del archivo no coincide con el formato declarado.', 'IMAGE_SIGNATURE_INVALID');
  }
}

export function normalizeAssetEntity(value: FormDataEntryValue | null): string {
  const entity = normalizeAssetEntityValue(value);
  if (!entity) throw new ApiError(400, 'La entidad del archivo no es valida.', 'INVALID_ASSET_ENTITY');
  return entity;
}

export function extensionForImageType(type: string): string {
  const extension = extensionForValidImageType(type);
  if (!extension) throw new ApiError(415, 'Formato de imagen no admitido.', 'IMAGE_TYPE_INVALID');
  return extension;
}
