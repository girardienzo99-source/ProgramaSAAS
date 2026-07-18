import { NextResponse } from 'next/server';
import { ApiError, optionalNumber, readJsonObject } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { authorizeRequest } from '@/lib/api/authorization';

export async function POST(request: Request) {
  try {
    await authorizeRequest(request, 'platform.diagnostics.view');
    const body = await readJsonObject(request);
    const priceIncreasePercentage = optionalNumber(body, 'priceIncreasePercentage', 0);
    const demandElasticity = optionalNumber(body, 'demandElasticity', 0.3, { min: 0 });
    if (priceIncreasePercentage < -100 || priceIncreasePercentage > 1_000) {
      throw new ApiError(400, 'La variación de precio debe estar entre -100% y 1000%.', 'VALIDATION_ERROR');
    }
    if (demandElasticity > 10) {
      throw new ApiError(400, 'La elasticidad no puede superar 10.', 'VALIDATION_ERROR');
    }

    const projectedVolumeChange = -(priceIncreasePercentage * demandElasticity);
    const originalRevenue = 100_000;
    const originalMargin = 30_000;
    const projectedRevenue = Math.max(0, originalRevenue * (1 + priceIncreasePercentage / 100) * (1 + projectedVolumeChange / 100));
    const projectedMargin = projectedRevenue * 0.35;

    return NextResponse.json({
      success: true,
      simulation: {
        volumeChangePercentage: Number(projectedVolumeChange.toFixed(2)),
        revenueChangePercentage: Number((((projectedRevenue - originalRevenue) / originalRevenue) * 100).toFixed(2)),
        marginChangePercentage: Number((((projectedMargin - originalMargin) / originalMargin) * 100).toFixed(2)),
        projectedRevenue: Math.round(projectedRevenue),
        projectedMargin: Math.round(projectedMargin),
      },
    });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo ejecutar la simulación.');
  }
}
