import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/api/authorization';
import { ApiError } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { getGastronomySalesReport, type GastronomySalesReportRecord } from '@/lib/api/gastronomyRepository';

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
  return { from, to, fromLabel: from.toISOString().slice(0, 10), toLabel: today };
}

function reportCsv(report: GastronomySalesReportRecord): string {
  const lines = [
    ['resumen', 'valor'],
    ['ventas', report.summary.salesTotal.toFixed(2)],
    ['neto', report.summary.netTotal.toFixed(2)],
    ['iva', report.summary.taxTotal.toFixed(2)],
    ['propinas', report.summary.tipsTotal.toFixed(2)],
    ['cierres', String(report.summary.settlementsCount)],
    [],
    ['fecha', 'ventas', 'cierres', 'propinas'],
    ...report.daily.map((row) => [row.day, row.sales.toFixed(2), String(row.settlements), row.tips.toFixed(2)]),
    [],
    ['medio_pago', 'importe', 'operaciones'],
    ...report.payments.map((row) => [row.method, row.amount.toFixed(2), String(row.payments)]),
  ];
  return lines.map((line) => line.join(',')).join('\r\n');
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get('format');
    const permission = format === 'csv' ? 'gastronomy.reports.export' : 'gastronomy.reports.read';
    const tenant = await authorizeRequest(request, permission, 'gastronomy');
    const defaults = defaultDates();
    const fromLabel = url.searchParams.get('from') ?? defaults.fromLabel;
    const toLabel = url.searchParams.get('to') ?? defaults.toLabel;
    const from = argentinaDate(fromLabel);
    const to = argentinaDate(toLabel, true);
    if (from >= to || to.getTime() - from.getTime() > MAX_PERIOD_MS) {
      throw new ApiError(400, 'El periodo debe contener entre 1 y 366 dias.', 'INVALID_REPORT_PERIOD');
    }
    const report = await getGastronomySalesReport(tenant, from, to);
    if (format === 'csv') {
      return new NextResponse(reportCsv(report), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="gastronomia_${fromLabel}_${toLabel}.csv"`,
          'Cache-Control': 'private, no-store',
        },
      });
    }
    return NextResponse.json({ success: true, report }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo generar el reporte gastronomico.');
  }
}
