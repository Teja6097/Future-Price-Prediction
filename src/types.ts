export interface Product {
  id: string;
  name: string;
  brand: string;
  category: "smartphone" | "laptop" | "tablet" | "accessory";
  description: string;
  specs: Record<string, string>;
  image: string;
  releaseDate: string;
  originalPrice: number;
  currentPrice: number;
  recommendation?: "BUY" | "WAIT";
  predictionConfidence?: number;
  alertCount?: number;
}

export interface Retailer {
  id: string;
  name: string;
  logo: string;
  url: string;
}

export interface PriceHistoryRecord {
  id: string;
  productId: string;
  retailerId: string;
  price: number;
  timestamp: string;
}

export interface PredictionRecord {
  id: string;
  productId: string;
  predicted7d: number;
  predicted30d: number;
  predicted90d: number;
  action: "BUY" | "WAIT";
  confidence: number;
  analysis: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  watchlist: string[];
  password?: string;
}

export interface PriceAlert {
  id: string;
  productId: string;
  userId: string;
  email: string;
  targetPrice: number;
  active: boolean;
  isTriggered: boolean;
  createdAt: string;
}

export interface DashboardStats {
  totalTrackedProducts: number;
  averageDiscountMSRP: number;
  buySignalsRatio: number;
  uniqueRetailers: number;
  totalAlertsSetup: number;
}
