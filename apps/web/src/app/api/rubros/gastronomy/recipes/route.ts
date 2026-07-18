import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { ApiError, readJsonObject, requiredArray, requiredNumber, requiredString } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { listGastronomyRecipes, saveGastronomyRecipe } from '@/lib/api/gastronomyRepository';

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'gastronomy.recipes.read', 'gastronomy');
    const items = await listGastronomyRecipes(tenant.companyId);
    return NextResponse.json({ success: true, items });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudieron consultar las recetas.');
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'gastronomy.recipes.write', 'gastronomy');
    const body = await readJsonObject(request);
    const productId = requiredString(body, 'productId', 'El producto');
    const portions = requiredNumber(body, 'portions', { min: 0.001, label: 'Las porciones' });
    const rawLines = requiredArray(body, 'lines', 'La receta');
    if (rawLines.length > 100) throw new ApiError(400, 'La receta no puede superar 100 insumos.', 'VALIDATION_ERROR');
    const lines = rawLines.map((value, index) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new ApiError(400, `El insumo ${index + 1} no es valido.`, 'VALIDATION_ERROR');
      }
      const line = value as Record<string, unknown>;
      return {
        ingredientId: requiredString(line, 'ingredientId', `El insumo ${index + 1}`),
        quantity: requiredNumber(line, 'quantity', { min: 0.0001, label: `La cantidad ${index + 1}` }),
      };
    });
    if (new Set(lines.map((line) => line.ingredientId)).size !== lines.length) {
      throw new ApiError(400, 'Un insumo no puede repetirse en la misma receta.', 'DUPLICATE_RECIPE_INGREDIENT');
    }

    const item = await saveGastronomyRecipe(tenant, { productId, portions, lines });
    return NextResponse.json({ success: true, message: 'Receta guardada.', item });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo guardar la receta.');
  }
}
