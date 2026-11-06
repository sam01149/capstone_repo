import { HISTORICAL_DEMAND } from '../mocks/ordersAndInventoryData';
import { FORECAST_METHOD } from '../types';
import { delay, request, USE_REAL_BACKEND } from './apiClient';
import { productService } from './productService';

export const forecastService = {
  async getHistoricalDemand(productId) {
    if (USE_REAL_BACKEND) return request(`/forecasts/historical/${productId}`);
    await delay(120);
    return HISTORICAL_DEMAND.map((row) => ({
      month: row.month,
      demand: row[productId] || Math.floor(20 + Math.random() * 50),
    }));
  },

  async generateForecast({ productId, horizonWeeks = 4, serviceLevel = 95 }) {
    if (USE_REAL_BACKEND) {
      return request('/forecasts/generate', {
        method: 'POST',
        body: JSON.stringify({ productId, horizonWeeks, serviceLevel }),
      });
    }

    await delay(350); // Simulates AI engine processing
    const product = await productService.getProductById(productId);
    const history = await this.getHistoricalDemand(productId);

    const values = history.map((h) => h.demand);
    const avgMonthly = values.reduce((a, b) => a + b, 0) / values.length;
    const avgDaily = avgMonthly / 30;

    // Hitung Standar Deviasi (sigma)
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avgMonthly, 2), 0) / values.length;
    const sigmaMonthly = Math.sqrt(variance);
    const sigmaDaily = sigmaMonthly / Math.sqrt(30);

    // Z value for Service Level 95% = 1.645 (or 99% = 2.33, 90% = 1.28)
    const Z = serviceLevel >= 99 ? 2.33 : serviceLevel <= 90 ? 1.28 : 1.645;
    const leadTime = product.leadTimeDays || 3;

    // Formula resmi: SS = Z * sigma_L = Z * sigmaDaily * sqrt(leadTime)
    const safetyStockCalculated = Math.max(3, Math.round(Z * sigmaDaily * Math.sqrt(leadTime)));
    // Formula resmi: ROP = (d * LT) + SS
    const ropCalculated = Math.max(safetyStockCalculated + 2, Math.round(avgDaily * leadTime + safetyStockCalculated));

    // Identifikasi pola demand: Reguler (ARIMA) vs Intermiten (Croston SBA)
    const isIntermittent = product.demandPattern === 'intermittent';
    const method = isIntermittent ? FORECAST_METHOD.CROSTON_SBA : FORECAST_METHOD.ARIMA;

    // Evaluasi Model Metrik Akurasi
    const mae = isIntermittent ? 4.12 : 2.85;
    const rmse = isIntermittent ? 5.34 : 3.62;
    const mape = isIntermittent ? 11.4 : 6.8;

    // Generate horizon weekly predictions
    const weeklyPredictions = [];
    const avgWeekly = avgMonthly / 4;
    for (let w = 1; w <= horizonWeeks; w++) {
      const growth = 1 + (Math.sin(w) * 0.05);
      const predictedDemand = Math.round(avgWeekly * growth);
      weeklyPredictions.push({
        week: `Minggu ke-${w}`,
        weekNumber: w,
        predictedDemand,
        lowerBound: Math.max(1, Math.round(predictedDemand - safetyStockCalculated * 0.5)),
        upperBound: Math.round(predictedDemand + safetyStockCalculated * 0.5),
        estimatedRevenue: predictedDemand * product.price,
      });
    }

    const totalPredictedDemand = weeklyPredictions.reduce((sum, w) => sum + w.predictedDemand, 0);
    const totalEstimatedRevenue = weeklyPredictions.reduce((sum, w) => sum + w.estimatedRevenue, 0);

    return {
      productId: product.id,
      productName: product.name,
      method,
      horizonWeeks,
      serviceLevel,
      leadTimeDays: leadTime,
      avgDailyDemand: Number(avgDaily.toFixed(2)),
      avgWeeklyDemand: Number(avgWeekly.toFixed(1)),
      sigmaDaily: Number(sigmaDaily.toFixed(2)),
      safetyStockCalculated,
      ropCalculated,
      currentSafetyStock: product.safetyStock,
      currentRop: product.reorderPoint,
      evaluation: {
        mae,
        rmse,
        mape: `${mape}%`,
        accuracy: `${(100 - mape).toFixed(1)}%`,
      },
      weeklyPredictions,
      totalPredictedDemand,
      totalEstimatedRevenue,
      history,
    };
  },

  async applySsRopToProduct(productId, { safetyStock, reorderPoint }) {
    if (USE_REAL_BACKEND) {
      return request(`/products/${productId}/apply-ss-rop`, {
        method: 'POST',
        body: JSON.stringify({ safetyStock, reorderPoint }),
      });
    }

    await productService.updateInventoryParams(productId, { safetyStock, reorderPoint });
    return true;
  },
};

