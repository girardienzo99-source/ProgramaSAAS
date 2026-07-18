import { NextResponse } from 'next/server';
import { ApiError, type JsonObject, readJsonObject, requiredString } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { authorizeRequest } from '@/lib/api/authorization';

const ANALYTICS_DATA = {
  salesThisWeek: 345_000,
  bestSeller: { name: 'Remera Algodón Premium', sku: 'REM-ALG-001', salesCount: 142 },
  lowStockItems: [{ name: 'Pantalón Jean Slim Fit', sku: 'PAN-JEA-002', currentStock: 3, minStock: 10 }],
  latePayingClients: [{ name: 'Distribuidora Oeste S.A.', balance: 87_500, dueDays: 45 }],
};

export async function POST(request: Request) {
  try {
    await authorizeRequest(request, 'platform.ai.use');
    const body = await readJsonObject(request);
    const query = requiredString(body, 'query', 'La consulta');
    if (query.length > 500) throw new ApiError(400, 'La consulta no puede superar los 500 caracteres.', 'VALIDATION_ERROR');

    const cleanQuery = query.toLocaleLowerCase('es-AR');
    let answer: string;
    let data: JsonObject | null = null;

    if (cleanQuery.includes('semana') || cleanQuery.includes('cuanto vendi') || cleanQuery.includes('ventas')) {
      answer = `Esta semana registraste ventas netas por $${ANALYTICS_DATA.salesThisWeek.toLocaleString('es-AR')} ARS.`;
      data = { sales: ANALYTICS_DATA.salesThisWeek };
    } else if (cleanQuery.includes('producto') || cleanQuery.includes('rota') || cleanQuery.includes('mas vendido')) {
      answer = `Tu producto más vendido es ${ANALYTICS_DATA.bestSeller.name} (${ANALYTICS_DATA.bestSeller.sku}), con ${ANALYTICS_DATA.bestSeller.salesCount} unidades.`;
      data = { bestSeller: ANALYTICS_DATA.bestSeller };
    } else if (cleanQuery.includes('stock') || cleanQuery.includes('critico') || cleanQuery.includes('bajo')) {
      const item = ANALYTICS_DATA.lowStockItems[0];
      answer = `Tenés ${ANALYTICS_DATA.lowStockItems.length} producto por debajo del mínimo. Conviene reponer ${item.name}; quedan ${item.currentStock} unidades.`;
      data = { lowStock: ANALYTICS_DATA.lowStockItems };
    } else if (cleanQuery.includes('moroso') || cleanQuery.includes('deuda') || cleanQuery.includes('deben')) {
      const client = ANALYTICS_DATA.latePayingClients[0];
      answer = `${client.name} tiene el mayor saldo vencido: $${client.balance.toLocaleString('es-AR')} ARS, con ${client.dueDays} días de mora.`;
      data = { latePaying: ANALYTICS_DATA.latePayingClients };
    } else {
      answer = 'No pude asociar la consulta a un reporte. Podés consultar ventas, productos más vendidos, stock crítico o clientes morosos.';
    }

    console.info('[AI Copilot Auditoría] Consulta procesada', { queryLength: query.length });
    return NextResponse.json({ success: true, query, answer, data });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo procesar la consulta.');
  }
}
