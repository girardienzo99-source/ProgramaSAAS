import { NextResponse } from 'next/server';
import { resolveTenantContext } from '@/lib/api/tenant';
import { requirePermission } from '@/lib/api/authorization';
import { ApiError } from '@/lib/api/core';
import {
  extensionForImageType,
  MAX_CATALOG_IMAGE_BYTES,
  normalizeAssetEntity,
  validateImageMetadata,
  validateImageSignature,
} from '@/lib/api/imageUpload';
import { apiErrorResponse } from '@/lib/api/responses';
import { createAdminServerClient, isServerSupabaseAdminConfigured } from '@/lib/server/supabase';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const tenant = requirePermission(await resolveTenantContext(request), 'platform.files.create');
    if (!isServerSupabaseAdminConfigured) {
      throw new ApiError(503, 'El almacenamiento de archivos no esta configurado.', 'STORAGE_NOT_CONFIGURED');
    }

    const contentLength = Number(request.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_CATALOG_IMAGE_BYTES + 256 * 1024) {
      throw new ApiError(413, 'La solicitud de imagen supera el limite permitido.', 'PAYLOAD_TOO_LARGE');
    }

    const formData = await request.formData();
    const image = formData.get('image');
    if (!(image instanceof File)) {
      throw new ApiError(400, 'Debe adjuntar una imagen en el campo image.', 'IMAGE_REQUIRED');
    }

    const entity = normalizeAssetEntity(formData.get('entity'));
    validateImageMetadata(image);
    const bytes = new Uint8Array(await image.arrayBuffer());
    validateImageSignature(bytes, image.type);

    const extension = extensionForImageType(image.type);
    const objectPath = `${tenant.companyId}/${tenant.businessTypeCode}/${entity}/${crypto.randomUUID()}.${extension}`;
    const supabase = createAdminServerClient();
    const { error } = await supabase.storage
      .from('catalog-assets')
      .upload(objectPath, bytes, {
        cacheControl: '31536000',
        contentType: image.type,
        upsert: false,
      });
    if (error) {
      throw new ApiError(503, 'No se pudo almacenar la imagen.', 'IMAGE_UPLOAD_FAILED');
    }

    const { data } = supabase.storage.from('catalog-assets').getPublicUrl(objectPath);
    return NextResponse.json({
      success: true,
      asset: {
        bucket: 'catalog-assets',
        path: objectPath,
        url: data.publicUrl,
        contentType: image.type,
        size: image.size,
      },
    }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo subir la imagen.');
  }
}
