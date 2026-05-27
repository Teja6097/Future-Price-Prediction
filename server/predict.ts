import { GoogleGenAI, Type } from "@google/genai";
import { DB, Product, PriceHistoryRecord, PredictionRecord } from "./db.js";

// Initialize Gemini SDK with custom user agent telemetry as required
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

/**
 * Modern machine learning time-series regression implemented locally.
 * Extrapolates pricing history using Double Exponential Smoothing (Holt's Linear Trend method)
 * to model both the level and trend of the electronics' pricing.
 */
export function calculateLocalPredictions(
  product: Product,
  history: PriceHistoryRecord[]
): Omit<PredictionRecord, "id" | "productId" | "updatedAt"> {
  // Sort history chronologically
  const sorted = [...history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const currentPrice = product.currentPrice;

  if (sorted.length < 5) {
    // Insufficient historical records, fall back to simple depreciation rules
    const delayFactor = (Date.now() - new Date(product.releaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365);
    const expectedDiscount = Math.max(0.7, 1 - delayFactor * 0.12); // ~12% depreciation per year
    return {
      predicted7d: Math.round(currentPrice * 0.995 * 100) / 100,
      predicted30d: Math.round(currentPrice * 0.98 * 100) / 100,
      predicted90d: Math.round(product.originalPrice * expectedDiscount * 100) / 100,
      action: expectedDiscount < 0.85 ? "BUY" : "WAIT",
      confidence: 0.7,
      analysis: `*Using mathematical Baseline Moving Averages due to basic model fallback.*
Currently trading at $${currentPrice}. Minimal data supports high-confidence time-series regression. Default depreciation estimates are modeled.`,
    };
  }

  // Double Exponential Smoothing (Holt's Method) Parameters
  // alpha controls the level component (smooths out noise)
  // beta controls the trend component (projects price shifts)
  const alpha = 0.2;
  const beta = 0.1;

  // Group price records by date to compute clean daily indices
  const priceByDay: Record<string, number> = {};
  sorted.forEach((record) => {
    const dayStr = record.timestamp.split("T")[0];
    // If multiple retailers have records for the same day, take average
    if (priceByDay[dayStr]) {
      priceByDay[dayStr] = (priceByDay[dayStr] + record.price) / 2;
    } else {
      priceByDay[dayStr] = record.price;
    }
  });

  const dailyPrices = Object.values(priceByDay);
  const n = dailyPrices.length;

  // Initialize Level (L0) and Trend (T0)
  let level = dailyPrices[0];
  let trend = dailyPrices[1] - dailyPrices[0];

  // Run recursive smoothing equations
  for (let i = 1; i < n; i++) {
    const previousLevel = level;
    level = alpha * dailyPrices[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - previousLevel) + (1 - beta) * trend;
  }

  // Forecast future values for t steps ahead (7, 30, and 90 steps/days)
  let pred7 = level + 7 * trend;
  let pred30 = level + 30 * trend;
  let pred90 = level + 90 * trend;

  // Ensure logical bounds (prices don't drop to zero or exceed MSRP)
  const floorPrice = product.originalPrice * 0.6;
  pred7 = Math.max(floorPrice, Math.min(product.originalPrice, pred7));
  pred30 = Math.max(floorPrice, Math.min(product.originalPrice, pred30));
  pred90 = Math.max(floorPrice, Math.min(product.originalPrice, pred90));

  // Determine whether to Buy or Wait
  // If the forecasted price drops by more than 3% in next 30 days, tell user to Wait.
  // Otherwise, lock in current deal ("Buy").
  const percentageDrop30d = (currentPrice - pred30) / currentPrice;
  const action = percentageDrop30d > 0.035 ? "WAIT" : "BUY";

  // Calculate moving standard deviation to establish prediction confidence bounds
  const mean = dailyPrices.reduce((sum, p) => sum + p, 0) / n;
  const squaredDiffs = dailyPrices.map((p) => Math.pow(p - mean, 2));
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / n;
  const stdDev = Math.sqrt(variance);
  const volatilityCoefficient = stdDev / mean;
  const confidence = Math.max(0.6, Math.min(0.95, 1 - volatilityCoefficient));

  let analysis = `### Math Engine Regression Analysis
Using **Double Exponential Smoothing (Holt's Method)** time-series forecasting across ${n} active market days:
- **Trend slope ($T_t$ value)**: \`${trend.toFixed(3)}\` per day, indicating ${trend < 0 ? "ongoing depreciation" : "price stability"}.
- **Smoothing parameters**: Selected \\(\\alpha=0.2, \\beta=0.1\\) to damp short-term vendor volatility.
- **Projected drop**: In the next 30 days, we forecast a price deviation of **${(percentageDrop30d * 100).toFixed(1)}%**.

**Verdict**: **${action === "BUY" ? "BUY NOW" : "WAIT FOR MARKDOWNS"}**. This model possesses an index accuracy confidence of **${(confidence * 100).toFixed(0)}%**.`;

  return {
    predicted7d: Math.round(pred7 * 100) / 100,
    predicted30d: Math.round(pred30 * 100) / 100,
    predicted90d: Math.round(pred90 * 100) / 100,
    action,
    confidence: Math.round(confidence * 100) / 100,
    analysis,
  };
}

/**
 * Triggers the AI-powered machine learning forecasting using Google Gemini 3.5.
 * Analyzes brand cycles, release patterns, and real time-series price trails.
 */
export async function triggerAIPrediction(productId: string): Promise<PredictionRecord> {
  const product = DB.getProductById(productId);
  if (!product) {
    throw new Error(`Product ID ${productId} not found.`);
  }

  const history = DB.getPriceHistory(productId);
  const localPrediction = calculateLocalPredictions(product, history);

  // If Gemini API is available, enrich prediction with structural analysis
  if (ai) {
    try {
      console.log(`[AI SERVICE] Invoking Gemini API ('gemini-3.5-flash') to forecast ${product.name}...`);
      
      // Structure pricing history summary for the LLM context
      // Take up to 25 sample points to keep prompts light and effective
      const chronological = [...history]
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(-25)
        .map((h) => ({
          date: h.timestamp.split("T")[0],
          price: h.price,
          seller: h.retailerId.replace("ret-", "").toUpperCase(),
        }));

      const prompt = `
You are a Lead Pricing Data Scientist specializing in consumer electronics market dynamics.
You need to analyze the historical price data for a product, project future releases, and produce a high-fidelity price prediction.

PRODUCT METADATA:
- Name: ${product.name}
- Brand: ${product.brand}
- Category: ${product.category}
- Released: ${product.releaseDate}
- Initial MSRP: $${product.originalPrice}
- Current Value: $${product.currentPrice}

MATHEMATICAL HOLT-REGRESSION PREDICTIONS (Baseline Helper):
- Predicted 7 days: $${localPrediction.predicted7d}
- Predicted 30 days: $${localPrediction.predicted30d}
- Predicted 90 days: $${localPrediction.predicted90d}
- Suggested action: ${localPrediction.action}
- Math Confidence: ${localPrediction.confidence}

HISTORICAL PRICES TRAIL (Last 25 data points):
${JSON.stringify(chronological, null, 2)}

TASK:
Verify the mathematical predictions. Consider product release cycle timings (e.g. Apple releases new iPhones every September; Samsung announces new S Series around January/February; laptop updates align with Intel/AMD/Nvidia launches).
Refine the forecast for:
1. Future price in exactly 7 days.
2. Future price in exactly 30 days.
3. Future price in exactly 90 days.
4. Core action recommendation: "BUY" if the price is extremely stable or at historical lows, or "WAIT" if a major discount or newer generation is due within 90 days.
5. Absolute Confidence value between 0.50 and 0.99.
6. A beautiful Markdown 'analysis' summarizing:
   - Release cycle impact and manufacturer roadmap.
   - Competitive retailer landscape.
   - Core pricing forecast explanation.

Respond STRICTLY in JSON format matching the schema below.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              predicted7d: { type: Type.NUMBER, description: "Forecasted price in 7 days" },
              predicted30d: { type: Type.NUMBER, description: "Forecasted price in 30 days" },
              predicted90d: { type: Type.NUMBER, description: "Forecasted price in 90 days" },
              action: { type: Type.STRING, description: "Recommendation status, must be 'BUY' or 'WAIT'" },
              confidence: { type: Type.NUMBER, description: "Prediction trust coefficient, 0.5 to 0.99" },
              analysis: { type: Type.STRING, description: "High-quality market rationale and analysis in written markdown format" },
            },
            required: ["predicted7d", "predicted30d", "predicted90d", "action", "confidence", "analysis"],
          },
        },
      });

      const responseText = response.text;
      if (responseText) {
        const payload = JSON.parse(responseText.trim());
        const outcome: PredictionRecord = {
          id: `pred-${productId}`,
          productId,
          predicted7d: Math.round(payload.predicted7d * 100) / 100,
          predicted30d: Math.round(payload.predicted30d * 100) / 100,
          predicted90d: Math.round(payload.predicted90d * 100) / 100,
          action: payload.action === "BUY" || payload.action === "WAIT" ? payload.action : localPrediction.action,
          confidence: Math.round(payload.confidence * 100) / 100,
          analysis: payload.analysis,
          updatedAt: new Date().toISOString(),
        };

        // Cache on disk
        DB.savePrediction(outcome);
        return outcome;
      }
    } catch (err) {
      console.error("[AI SERVICE ERROR] Gemini API call had issues. Defaulting to local regression...", err);
    }
  }

  // If no Gemini key or request fails, save and return local statistical smoothing predictions
  const fallbackRecord: PredictionRecord = {
    id: `pred-${productId}`,
    productId,
    ...localPrediction,
    updatedAt: new Date().toISOString(),
  };

  DB.savePrediction(fallbackRecord);
  return fallbackRecord;
}
