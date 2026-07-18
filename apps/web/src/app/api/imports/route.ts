import { NextResponse } from 'next/server';
import { ApiError, enumValue, parseCsv, readJsonObject, requiredString } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { authorizeRequest } from '@/lib/api/authorization';

const TARGET_TYPES = ['products', 'contacts'] as const;
const MAX_CSV_SIZE = 5 * 1024 * 1024;

interface ImportRowError {
  row: number;
  error: string;
}

const MOCK_IMPORTS = [
  {
    id: 'imp-1',
    fileName: 'productos_iniciales.csv',
    targetType: 'products',
    status: 'completed',
    totalRows: 120,
    successfulRows: 120,
    failedRows: 0,
    errorSummary: null,
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
  },
];

export async function GET(request: Request) {
  try {
    await authorizeRequest(request, 'platform.imports.view');
    return NextResponse.json({ success: true, imports: MOCK_IMPORTS });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await authorizeRequest(request, 'platform.imports.create');
    const body = await readJsonObject(request, 6 * 1024 * 1024);
    const fileName = requiredString(body, 'fileName', 'El nombre del archivo');
    const targetType = enumValue(body, 'targetType', TARGET_TYPES);
    const csvData = requiredString(body, 'csvData', 'El contenido CSV');
    if (csvData.length > MAX_CSV_SIZE) {
      throw new ApiError(413, 'El archivo CSV supera el límite de 5 MB.', 'PAYLOAD_TOO_LARGE');
    }

    const rows = parseCsv(csvData);
    if (rows.length < 2) {
      throw new ApiError(400, 'El archivo CSV está vacío o le falta la cabecera.', 'INVALID_CSV');
    }

    const dataRows = rows.slice(1);
    const errorSummary: ImportRowError[] = [];

    if (targetType === 'products') {
      dataRows.forEach((columns, index) => {
        const [name, sku, price, stock] = columns;
        if (!name || !sku || !Number.isFinite(Number(price)) || !Number.isFinite(Number(stock))) {
          errorSummary.push({
            row: index + 2,
            error: `Formato inválido en fila ${index + 2}. Nombre y SKU son obligatorios; precio y stock deben ser numéricos.`,
          });
        }
      });
    }

    if (errorSummary.length > 0) {
      return NextResponse.json(
        {
          success: false,
          status: 'rolled_back',
          message: 'Importación cancelada. Se revirtió la operación por errores de formato.',
          totalRows: dataRows.length,
          successfulRows: 0,
          failedRows: errorSummary.length,
          errorSummary,
        },
        { status: 422 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        status: 'completed',
        importId: `imp-${crypto.randomUUID()}`,
        fileName,
        totalRows: dataRows.length,
        successfulRows: dataRows.length,
        failedRows: 0,
      },
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo procesar la importación CSV.');
  }
}
