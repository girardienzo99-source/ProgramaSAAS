export type ARCAEnvironment = 'homologacion' | 'produccion';

export interface ARCAAuthResponse {
  token: string;
  sign: string;
  expiration: string;
}

export interface SolicitarCAEParams {
  invoiceType: 'FA' | 'FB' | 'FC';
  pointOfSale: number;
  clientDocType: 'DNI' | 'CUIT' | 'CUIL' | '99';
  clientDocNumber: string;
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
  vatRate: number;
}

export interface CAEResponse {
  cae: string;
  caeDueDate: string;
  cbteNumber: number;
  status: 'approved' | 'observed' | 'rejected' | 'uncertain' | 'error';
  errors: string[];
  payloadSent: unknown;
  responseRaw: unknown;
}

export interface QRParams {
  date: string;
  cuit: string;
  pointOfSale: number;
  invoiceType: number;
  invoiceNumber: number;
  total: number;
  cae: string;
  recipientDocumentType?: number;
  recipientDocumentNumber?: number;
}

export interface ARCATransportConfig {
  cuit: string;
  certificate: string;
  privateKey: string;
  environment: ARCAEnvironment;
}

export interface ARCATransport {
  authenticate(config: ARCATransportConfig): Promise<ARCAAuthResponse>;
  getLastAuthorizedInvoice(
    config: ARCATransportConfig,
    pointOfSale: number,
    invoiceTypeCode: number,
  ): Promise<number>;
  solicitarCAE(config: ARCATransportConfig, params: SolicitarCAEParams): Promise<CAEResponse>;
}

export class ARCATransportUnavailableError extends Error {
  readonly code = 'ARCA_TRANSPORT_NOT_IMPLEMENTED';

  constructor() {
    super('No hay un transporte SOAP ARCA homologado configurado.');
    this.name = 'ARCATransportUnavailableError';
  }
}

function invoiceTypeCode(invoiceType: SolicitarCAEParams['invoiceType']): number {
  if (invoiceType === 'FA') return 1;
  if (invoiceType === 'FB') return 6;
  return 11;
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 1) throw new Error(`${label} debe ser un entero positivo.`);
}

export class ARCAClient {
  private readonly config: ARCATransportConfig;
  private readonly transport?: ARCATransport;

  constructor(
    cuit: string,
    certificate: string,
    privateKey: string,
    environment: ARCAEnvironment = 'homologacion',
    transport?: ARCATransport,
  ) {
    const normalizedCuit = cuit.replace(/\D/g, '');
    if (!/^\d{11}$/.test(normalizedCuit)) throw new Error('El CUIT emisor debe contener 11 digitos.');
    if (!certificate.includes('BEGIN CERTIFICATE')) throw new Error('El certificado PEM no es valido.');
    if (!privateKey.includes('BEGIN') || !privateKey.includes('PRIVATE KEY')) throw new Error('La clave privada PEM no es valida.');
    this.config = { cuit: normalizedCuit, certificate, privateKey, environment };
    this.transport = transport;
  }

  private requireTransport(): ARCATransport {
    if (!this.transport) throw new ARCATransportUnavailableError();
    return this.transport;
  }

  async authenticate(): Promise<ARCAAuthResponse> {
    return this.requireTransport().authenticate(this.config);
  }

  async getLastAuthorizedInvoice(pointOfSale: number, typeCode: number): Promise<number> {
    assertPositiveInteger(pointOfSale, 'El punto de venta');
    assertPositiveInteger(typeCode, 'El tipo de comprobante');
    return this.requireTransport().getLastAuthorizedInvoice(this.config, pointOfSale, typeCode);
  }

  async solicitarCAE(params: SolicitarCAEParams): Promise<CAEResponse> {
    assertPositiveInteger(params.pointOfSale, 'El punto de venta');
    if (params.invoiceType === 'FA' && params.clientDocType !== 'CUIT') {
      throw new Error('La Factura A requiere CUIT del receptor.');
    }
    if (Math.abs(params.subtotal - params.discount + params.taxAmount - params.total) > 0.01) {
      throw new Error('El total no coincide con el neto, descuento e IVA.');
    }
    invoiceTypeCode(params.invoiceType);
    return this.requireTransport().solicitarCAE(this.config, params);
  }

  generateQRLink(params: QRParams): string {
    const cuit = params.cuit.replace(/\D/g, '');
    if (!/^\d{11}$/.test(cuit)) throw new Error('El CUIT del QR debe contener 11 digitos.');
    if (!/^\d{14}$/.test(params.cae)) throw new Error('Solo se puede generar QR con un CAE real de 14 digitos.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(params.date)) throw new Error('La fecha del QR no es valida.');
    assertPositiveInteger(params.pointOfSale, 'El punto de venta');
    assertPositiveInteger(params.invoiceType, 'El tipo de comprobante');
    assertPositiveInteger(params.invoiceNumber, 'El numero de comprobante');
    if (!Number.isFinite(params.total) || params.total <= 0) throw new Error('El importe del QR debe ser positivo.');

    const qrData = {
      ver: 1,
      fecha: params.date,
      cuit: Number(cuit),
      ptoVta: params.pointOfSale,
      tipoCbte: params.invoiceType,
      nroCbte: params.invoiceNumber,
      importe: Number(params.total.toFixed(2)),
      moneda: 'PES',
      ctz: 1,
      tipoDocRec: params.recipientDocumentType ?? 99,
      nroDocRec: params.recipientDocumentNumber ?? 0,
      tipoCodAut: 'E',
      codAut: Number(params.cae),
    };
    const json = JSON.stringify(qrData);
    const base64 = typeof window === 'undefined'
      ? Buffer.from(json, 'utf8').toString('base64')
      : btoa(unescape(encodeURIComponent(json)));
    return `https://www.afip.gob.ar/fe/qr/?p=${base64}`;
  }
}
