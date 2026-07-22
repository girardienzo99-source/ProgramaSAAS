export interface ScaleEan13Payload {
  prefix: "20" | "21";
  productCode: string;
  encodedValue: number;
}

export interface CutPlan {
  commercialPieces: number;
  cutsPerPiece: number;
  totalUsedMeters: number;
  totalScrapMeters: number;
}

export function isValidEan13(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false;
  const digits = [...value].map(Number);
  const expected = digits[12];
  const weighted = digits
    .slice(0, 12)
    .reduce((sum, digit, index) => sum + digit * (index % 2 === 0 ? 1 : 3), 0);
  return (10 - (weighted % 10)) % 10 === expected;
}

export function decodeScaleEan13(value: string): ScaleEan13Payload | null {
  if (!isValidEan13(value)) return null;
  const prefix = value.slice(0, 2);
  if (prefix !== "20" && prefix !== "21") return null;
  return {
    prefix,
    productCode: value.slice(2, 7),
    encodedValue: Number(value.slice(7, 12)),
  };
}

export function calculateCutPlan(
  commercialLengthMeters: number,
  cutLengthMeters: number,
  cutQuantity: number,
): CutPlan {
  if (!Number.isFinite(commercialLengthMeters) || commercialLengthMeters <= 0) {
    throw new Error("El largo comercial debe ser mayor que cero.");
  }
  if (!Number.isFinite(cutLengthMeters) || cutLengthMeters <= 0) {
    throw new Error("La medida de corte debe ser mayor que cero.");
  }
  if (!Number.isInteger(cutQuantity) || cutQuantity <= 0) {
    throw new Error("La cantidad de cortes debe ser un entero mayor que cero.");
  }
  if (cutLengthMeters > commercialLengthMeters) {
    throw new Error("La medida de corte supera el largo comercial disponible.");
  }

  const cutsPerPiece = Math.floor(commercialLengthMeters / cutLengthMeters);
  const commercialPieces = Math.ceil(cutQuantity / cutsPerPiece);
  const totalUsedMeters = cutLengthMeters * cutQuantity;
  const totalScrapMeters =
    commercialPieces * commercialLengthMeters - totalUsedMeters;
  return { commercialPieces, cutsPerPiece, totalUsedMeters, totalScrapMeters };
}
