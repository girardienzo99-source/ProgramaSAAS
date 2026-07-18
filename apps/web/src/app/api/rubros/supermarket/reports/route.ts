import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { ApiError, isUuid } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { getSupermarketSalesReport, type SupermarketSalesReportRecord } from '@/lib/api/supermarketRepository';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PERIOD_MS = 366 * 24 * 60 * 60 * 1000;

function argentinaDate(value: string, endExclusive = false): Date {
  if (!DATE_PATTERN.test(value)) throw new ApiError(400, 'La fecha debe usar formato YYYY-MM-DD.', 'INVALID_REPORT_DATE');
  const date = new Date(`${value}T03:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new ApiError(400, 'La fecha del reporte no es valida.', 'INVALID_REPORT_DATE');
  }
  if (endExclusive) date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

function defaultDates() {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  const to = argentinaDate(today, true);
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { fromLabel: from.toISOString().slice(0, 10), toLabel: today };
}

function csvCell(value: string | number): string {
  const raw = String(value);
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

function reportCsv(report: SupermarketSalesReportRecord): string {
  const lines: Array<Array<string | number>> = [
    ['resumen', 'valor'],
    ['ventas_brutas', report.summary.salesTotal.toFixed(2)],
    ['ventas_netas', report.summary.netTotal.toFixed(2)],
    ['costo_historico', report.summary.costTotal.toFixed(2)],
    ['ganancia_bruta', report.summary.grossProfit.toFixed(2)],
    ['margen_porcentaje', report.summary.marginPercent.toFixed(2)],
    ['tickets', report.summary.tickets],
    ['ticket_promedio', report.summary.averageTicket.toFixed(2)],
    ['descuentos', report.summary.discountTotal.toFixed(2)],
    ['iva', report.summary.taxTotal.toFixed(2)],
    ['cobertura_costos_porcentaje', report.summary.costCoveragePercent.toFixed(2)],
    [],
    ['categoria', 'cantidad', 'venta_neta', 'costo', 'ganancia', 'margen_porcentaje'],
    ...report.categories.map((row) => [row.category, row.quantity, row.netSales.toFixed(2), row.cost.toFixed(2), row.profit.toFixed(2), row.marginPercent.toFixed(2)]),
    [],
    ['producto', 'categoria', 'cantidad', 'venta_neta', 'costo', 'ganancia', 'margen_porcentaje'],
    ...report.products.map((row) => [row.name, row.category, row.quantity, row.netSales.toFixed(2), row.cost.toFixed(2), row.profit.toFixed(2), row.marginPercent.toFixed(2)]),
    [],
    ['sucursal', 'ventas', 'costo', 'ganancia', 'margen_porcentaje', 'tickets'],
    ...report.branches.map((row) => [row.name, row.sales.toFixed(2), row.cost.toFixed(2), row.profit.toFixed(2), row.marginPercent.toFixed(2), row.tickets]),
  ];
  return `\uFEFF${lines.map((line) => line.map(csvCell).join(',')).join('\r\n')}`;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get('format');
    const permission = format === 'csv' ? 'supermarket.reports.export' : 'supermarket.reports.read';
    const tenant = await authorizeRequest(request, permission, 'supermarket');
    const defaults = defaultDates();
    const fromLabel = url.searchParams.get('from') ?? defaults.fromLabel;
    const toLabel = url.searchParams.get('to') ?? defaults.toLabel;
    const branchParam = url.searchParams.get('branchId');
    const selectedBranchId = !branchParam || branchParam === 'all' ? null : branchParam;
    if (selectedBranchId && !isUuid(selectedBranchId)) {
      throw new ApiError(400, 'La sucursal seleccionada no es valida.', 'INVALID_BRANCH_ID');
    }
    const from = argentinaDate(fromLabel);
    const to = argentinaDate(toLabel, true);
    if (from >= to || to.getTime() - from.getTime() > MAX_PERIOD_MS) {
      throw new ApiError(400, 'El periodo debe contener entre 1 y 366 dias.', 'INVALID_REPORT_PERIOD');
    }
    const report = await getSupermarketSalesReport(tenant, from, to, selectedBranchId);
    if (format === 'csv') {
      return new NextResponse(reportCsv(report), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="supermercado_${fromLabel}_${toLabel}.csv"`,
          'Cache-Control': 'private, no-store',
        },
      });
    }
    return NextResponse.json({ success: true, report }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo generar el reporte del supermercado.');
  }
}
