import { NextResponse } from 'next/server';
import { enumValue, readJsonObject, requiredString } from '@/lib/api/core';
import { apiErrorResponse } from '@/lib/api/responses';
import { authorizeRequest } from '@/lib/api/authorization';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
interface Ticket {
  id: string;
  companyId: string;
  subject: string;
  description: string;
  status: string;
  priority: typeof PRIORITIES[number];
  createdAt: string;
}

const ticketsByCompany = new Map<string, Ticket[]>();

function getTickets(companyId: string): Ticket[] {
  const current = ticketsByCompany.get(companyId);
  if (current) return current;
  const initial: Ticket[] = [
    { id: 't1', companyId, subject: 'Problema al imprimir comanda', description: 'La impresora de cocina no toma WebUSB en la tablet.', status: 'open', priority: 'high', createdAt: new Date().toISOString() },
    { id: 't2', companyId, subject: 'Consulta de facturación', description: '¿Cuándo se debita la mensualidad del plan?', status: 'resolved', priority: 'low', createdAt: new Date(Date.now() - 86_400_000).toISOString() },
  ];
  ticketsByCompany.set(companyId, initial);
  return initial;
}

export async function GET(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'platform.support.view');
    return NextResponse.json({ success: true, tickets: getTickets(tenant.companyId) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await authorizeRequest(request, 'platform.support.create');
    const body = await readJsonObject(request);
    const subject = requiredString(body, 'subject', 'El asunto');
    const description = requiredString(body, 'description', 'La descripción');
    const priority = enumValue(body, 'priority', PRIORITIES, 'medium');
    const ticket = {
      id: crypto.randomUUID(), companyId: tenant.companyId, subject, description,
      status: 'open', priority, createdAt: new Date().toISOString(),
    };
    ticketsByCompany.set(tenant.companyId, [ticket, ...getTickets(tenant.companyId)]);
    return NextResponse.json({ success: true, message: 'Ticket creado con éxito.', ticket }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo registrar el ticket.');
  }
}
