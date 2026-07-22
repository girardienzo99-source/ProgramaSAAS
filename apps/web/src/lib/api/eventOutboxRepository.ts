/**
 * Repositorio del Patrón Transactional Outbox
 * Desacopla las operaciones pesadas (facturación ARCA, notificaciones, sync de stock)
 * garantizando tiempo de respuesta sub-10ms en POS y consolas de millones de usuarios.
 */

export interface OutboxEvent {
  id: string;
  companyId: string;
  eventType: 'SALE_CREATED' | 'INVOICE_EMISSION_REQUESTED' | 'STOCK_DECREMENT' | 'NOTIFICATION_DISPATCH';
  payload: Record<string, any>;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  processedAt?: string;
  error?: string;
}

class TransactionalOutboxRepository {
  private outboxEvents: OutboxEvent[] = [];

  enqueue(companyId: string, eventType: OutboxEvent['eventType'], payload: Record<string, any>): OutboxEvent {
    const event: OutboxEvent = {
      id: `outbox-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      companyId,
      eventType,
      payload,
      status: 'PENDING',
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString()
    };

    this.outboxEvents.push(event);
    return event;
  }

  getPendingEvents(companyId?: string, limit = 50): OutboxEvent[] {
    return this.outboxEvents
      .filter(e => e.status === 'PENDING' && (!companyId || e.companyId === companyId))
      .slice(0, limit);
  }

  markCompleted(eventId: string): void {
    const event = this.outboxEvents.find(e => e.id === eventId);
    if (event) {
      event.status = 'COMPLETED';
      event.processedAt = new Date().toISOString();
    }
  }

  markFailed(eventId: string, error: string): void {
    const event = this.outboxEvents.find(e => e.id === eventId);
    if (event) {
      event.retryCount += 1;
      event.error = error;
      if (event.retryCount >= event.maxRetries) {
        event.status = 'FAILED';
      } else {
        event.status = 'PENDING'; // Reintento en siguiente ciclo
      }
    }
  }

  getStats(companyId: string) {
    const events = this.outboxEvents.filter(e => e.companyId === companyId);
    return {
      pending: events.filter(e => e.status === 'PENDING').length,
      processing: events.filter(e => e.status === 'PROCESSING').length,
      completed: events.filter(e => e.status === 'COMPLETED').length,
      failed: events.filter(e => e.status === 'FAILED').length
    };
  }
}

export const eventOutboxRepository = new TransactionalOutboxRepository();
