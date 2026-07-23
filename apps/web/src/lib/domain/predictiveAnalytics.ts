/**
 * Motor de Analítica Predictiva & Detección de Anomalías Operativas Multirubro
 * Permite detectar desvíos inusuales en caja, stock y proyectar flujo de ventas.
 */

export interface CashAnomalyResult {
  isAnomaly: boolean;
  difference: number;
  variancePercentage: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

export interface StockAnomalyResult {
  isAnomaly: boolean;
  usageRatio: number;
  alertType: 'excessive_consumption' | 'abnormal_stagnation' | 'normal';
  recommendation: string;
}

export interface SalesForecastResult {
  projected30DaySales: number;
  dailyAverage: number;
  trend: 'growing' | 'stable' | 'declining';
  growthRatePercent: number;
}

/**
 * Evalúa desvíos en arqueos de caja en relación a la facturación esperada.
 */
export function detectCashAnomaly(expectedCash: number, declaredCash: number, thresholdPercent = 2.0): CashAnomalyResult {
  const difference = declaredCash - expectedCash;
  const absDiff = Math.abs(difference);
  
  if (expectedCash <= 0) {
    return {
      isAnomaly: difference !== 0,
      difference,
      variancePercentage: 0,
      severity: difference < 0 ? 'high' : 'low',
      recommendation: 'Caja sin movimientos previos registrados.'
    };
  }

  const variancePercentage = (absDiff / expectedCash) * 100;
  const isAnomaly = variancePercentage > thresholdPercent;

  let severity: CashAnomalyResult['severity'] = 'low';
  if (variancePercentage > 10) severity = 'critical';
  else if (variancePercentage > 5) severity = 'high';
  else if (variancePercentage > 2) severity = 'medium';

  let recommendation = 'Arqueo dentro de los márgenes normales de tolerancia.';
  if (isAnomaly) {
    if (difference < 0) {
      recommendation = `Faltante inusual de $${absDiff.toLocaleString('es-AR')} (${variancePercentage.toFixed(1)}%). Auditoría recomendada.`;
    } else {
      recommendation = `Sobrante no justificado de $${absDiff.toLocaleString('es-AR')} (${variancePercentage.toFixed(1)}%). Reorganizar comprobantes.`;
    }
  }

  return {
    isAnomaly,
    difference,
    variancePercentage,
    severity,
    recommendation
  };
}

/**
 * Evalúa anomalías en consumo de inventario comparando el uso actual vs promedio histórico.
 */
export function detectStockAnomaly(historicalDailyAvg: number, currentDailyUsage: number): StockAnomalyResult {
  if (historicalDailyAvg <= 0) {
    return {
      isAnomaly: false,
      usageRatio: 1.0,
      alertType: 'normal',
      recommendation: 'Sin histórico suficiente para determinar desviaciones.'
    };
  }

  const usageRatio = currentDailyUsage / historicalDailyAvg;

  if (usageRatio >= 2.5) {
    return {
      isAnomaly: true,
      usageRatio,
      alertType: 'excessive_consumption',
      recommendation: 'Pico crítico de egreso de stock (+150%). Verificar posible merma no declarada o venta masiva.'
    };
  } else if (usageRatio <= 0.1 && historicalDailyAvg > 5) {
    return {
      isAnomaly: true,
      usageRatio,
      alertType: 'abnormal_stagnation',
      recommendation: 'Rotación paralizada respecto al promedio habitual. Considerar promociones de descuento.'
    };
  }

  return {
    isAnomaly: false,
    usageRatio,
    alertType: 'normal',
    recommendation: 'Rotación de inventario en niveles históricos estables.'
  };
}

/**
 * Proyecta ventas a 30 días basándose en la serie de tiempo histórica de ventas diarias.
 */
export function forecastSales30Days(historicalDailySales: number[]): SalesForecastResult {
  if (!historicalDailySales || historicalDailySales.length === 0) {
    return {
      projected30DaySales: 0,
      dailyAverage: 0,
      trend: 'stable',
      growthRatePercent: 0
    };
  }

  const total = historicalDailySales.reduce((acc, curr) => acc + curr, 0);
  const dailyAverage = total / historicalDailySales.length;
  const projected30DaySales = Math.round(dailyAverage * 30);

  // Análisis simple de tendencia comparando la primera mitad vs la segunda mitad
  const midPoint = Math.floor(historicalDailySales.length / 2);
  const firstHalf = historicalDailySales.slice(0, midPoint);
  const secondHalf = historicalDailySales.slice(midPoint);

  const avgFirst = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : dailyAverage;
  const avgSecond = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : dailyAverage;

  let growthRatePercent = 0;
  if (avgFirst > 0) {
    growthRatePercent = ((avgSecond - avgFirst) / avgFirst) * 100;
  }

  let trend: SalesForecastResult['trend'] = 'stable';
  if (growthRatePercent > 3.0) trend = 'growing';
  else if (growthRatePercent < -3.0) trend = 'declining';

  return {
    projected30DaySales,
    dailyAverage: Math.round(dailyAverage),
    trend,
    growthRatePercent: parseFloat(growthRatePercent.toFixed(1))
  };
}
