import { createHash } from 'node:crypto';
import { ApiError } from './core';

export const MAX_SUPPLIER_DOCUMENT_BYTES = 10 * 1024 * 1024;

export function validateSupplierPdf(file: File, bytes: Uint8Array): { digest: string; safeName: string } {
  if (file.type !== 'application/pdf') {
    throw new ApiError(400, 'El remito debe estar en formato PDF.', 'INVALID_SUPPLIER_DOCUMENT_TYPE');
  }
  if (file.size < 8 || file.size > MAX_SUPPLIER_DOCUMENT_BYTES || bytes.byteLength !== file.size) {
    throw new ApiError(413, 'El PDF supera el limite de 10 MB o esta vacio.', 'INVALID_SUPPLIER_DOCUMENT_SIZE');
  }
  const header = new TextDecoder('ascii').decode(bytes.slice(0, 5));
  const trailer = new TextDecoder('ascii').decode(bytes.slice(Math.max(0, bytes.length - 2048)));
  if (header !== '%PDF-' || !trailer.includes('%%EOF')) {
    throw new ApiError(400, 'El archivo no contiene una estructura PDF valida.', 'INVALID_SUPPLIER_DOCUMENT_SIGNATURE');
  }
  const baseName = file.name.replace(/[^A-Za-z0-9._ -]/g, '').trim().slice(0, 240) || 'remito.pdf';
  const safeName = baseName.toLowerCase().endsWith('.pdf') ? baseName : `${baseName}.pdf`;
  return { digest: createHash('sha256').update(bytes).digest('hex'), safeName };
}
