import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";
import {
  X,
  BellRing,
  Eye,
  Trash2,
  Cpu,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Tag
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product, PriceHistoryRecord, PredictionRecord, PriceAlert } from "../types.js";

interface ProductDetailProps {
  productId: string;
  userId: string;
  currentUserEmail: string;
  onClose: () => void;
  onToggleWatchlist: (prodId: string) => void;
  isWatched: boolean;
}

export default function ProductDetail({
  productId,
  userId,
  currentUserEmail,
  onClose,
  onToggleWatchlist,
  isWatched
}: ProductDetailProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [history, setHistory] = useState<PriceHistoryRecord[]>([]);
  const [prediction, setPrediction] = useState<PredictionRecord | null>(null);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [alertTargetPrice, setAlertTargetPrice] = useState("");
  const [alertEmail, setAlertEmail] = useState(currentUserEmail);
  const [alertCreatedSuccess, setAlertCreatedSuccess] = useState(false);

  // Load complete product state
  const loadProductData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/products/${productId}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data.product);
        setHistory(data.history);
        setPrediction(data.prediction);
        setAlerts(data.alerts);
        
        if (data.product) {
          // Pre-fill target price with 5% discount below current price
          setAlertTargetPrice(Math.round(data.product.currentPrice * 0.95).toString());
        }
      }
    } catch (err) {
      console.error("Error loading product data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProductData();
  }, [productId]);

  // Handle manual trigger of ML forecasting
  const handleRecalculatePredictions = async () => {
    if (!product) return;
    try {
      setPredicting(true);
      const res = await fetch(`/api/products/${product.id}/predict`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.prediction) {
          setPrediction(data.prediction);
          // Reload product alerts as well
          const pRes = await fetch(`/api/products/${productId}`);
          if (pRes.ok) {
            const pData = await pRes.json();
            setAlerts(pData.alerts);
          }
        }
      }
    } catch (err) {
      console.error("Predictive request failed:", err);
    } finally {
      setPredicting(false);
    }
  };

  // Create alert trigger
  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !alertTargetPrice || !alertEmail) return;

    try {
      const res = await fetch("/api/alerts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          userId,
          targetPrice: Number(alertTargetPrice),
          email: alertEmail
        })
      });

      if (res.ok) {
        setAlertCreatedSuccess(true);
        const data = await res.json();
        setAlerts((prev) => [...prev, data.alert]);
        setTimeout(() => setAlertCreatedSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed creating alert rule", err);
    }
  };

  // Remove alert rule
  const handleDeleteAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      }
    } catch (err) {
      console.error("Failed deleting alert:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
        <p className="mt-4 text-slate-400 font-mono text-sm">Compiling predictive tensors...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center p-12 text-slate-400">
        Product data was scrambled or is unavailable. Please click another device.
      </div>
    );
  }

  // Formatting historical series for Composed Chart in Recharts
  // To render historical values (Area) and the predictions (Dashed Line) seamlessly,
  // we merge historical dates with projected dates.
  const chartData: any[] = [];

  // Group historical data chronologically
  const sortedHist = [...history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Group readings by day for plotting
  const groupedDates: string[] = [];
  const dateMap: Record<string, { dateLabel: string; [retailerName: string]: any }> = {};

  sortedHist.forEach((record) => {
    const formattedDate = new Date(record.timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    if (!dateMap[formattedDate]) {
      groupedDates.push(formattedDate);
      dateMap[formattedDate] = { dateLabel: formattedDate };
    }
    
    // Store retailer prices cleanly
    const retailerLabel = record.retailerId === "ret-amazon" 
      ? "Amazon" 
      : record.retailerId === "ret-bestbuy" 
      ? "Best Buy" 
      : record.retailerId === "ret-walmart" 
      ? "Walmart" 
      : record.retailerId === "ret-apple"
      ? "Apple Store"
      : "B&H Photo";

    dateMap[formattedDate][retailerLabel] = record.price;
    dateMap[formattedDate]["Market Avg"] = record.price; // fallback or average
  });

  // Calculate actual daily average averages
  groupedDates.forEach((dateLabel) => {
    const entry = dateMap[dateLabel];
    const prices: number[] = [];
    Object.keys(entry).forEach((key) => {
      if (key !== "dateLabel" && key !== "Market Avg" && typeof entry[key] === "number") {
        prices.push(entry[key]);
      }
    });
    if (prices.length > 0) {
      entry["Market Avg"] = Math.round((prices.reduce((sum, p) => sum + p, 0) / prices.length) * 100) / 100;
    }
    chartData.push({
      date: entry.dateLabel,
      "Historical Avg": entry["Market Avg"],
      "Projected Price": null, // projection doesn't apply to historical points
    });
  });

  // Append prediction forecast indices starting from the latest market price point
  if (prediction && chartData.length > 0) {
    const lastHistPrice = chartData[chartData.length - 1]["Historical Avg"] || product.currentPrice;
    
    // Set connection point to keep visual lines coherent
    chartData[chartData.length - 1]["Projected Price"] = lastHistPrice;

    const baseDate = new Date();
    
    // Insert +7d projection
    const d7 = new Date();
    d7.setDate(baseDate.getDate() + 7);
    chartData.push({
      date: d7.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " (7d Proj)",
      "Historical Avg": null,
      "Projected Price": prediction.predicted7d,
    });

    // Insert +30d projection
    const d30 = new Date();
    d30.setDate(baseDate.getDate() + 30);
    chartData.push({
      date: d30.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " (30d Proj)",
      "Historical Avg": null,
      "Projected Price": prediction.predicted30d,
    });

    // Insert +90d projection
    const d90 = new Date();
    d90.setDate(baseDate.getDate() + 90);
    chartData.push({
      date: d90.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " (90d Proj)",
      "Historical Avg": null,
      "Projected Price": prediction.predicted90d,
    });
  }

  // Calculate price drop metrics for visual impact
  const msrpDelta = product.originalPrice - product.currentPrice;
  const msrpDiscountPct = Math.round((msrpDelta / product.originalPrice) * 100);

  return (
    <div className="bg-white border border-slate-205 rounded-2xl overflow-hidden max-w-6xl w-full mx-auto shadow-2xl relative text-slate-850">
      {/* Top Banner Accent */}
      <div className={`h-1.5 w-full ${product.recommendation === "BUY" ? "bg-emerald-500" : "bg-amber-500"}`} />

      {/* Detail Modal Header */}
      <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50/80">
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-xl ${product.recommendation === "BUY" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
            {product.recommendation === "BUY" ? <TrendingDown size={32} /> : <TrendingUp size={32} />}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono tracking-wider bg-slate-200/70 text-slate-700 px-2.5 py-1 rounded-full uppercase font-medium">
                {product.brand}
              </span>
              <span className="text-xs font-mono tracking-wider bg-slate-200/70 text-slate-700 px-2.5 py-1 rounded-full uppercase font-medium">
                {product.category}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 mt-1">
              {product.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleWatchlist(product.id)}
            className={`p-2.5 rounded-xl border transition-all ${
              isWatched
                ? "bg-blue-50 border-blue-400 text-blue-600"
                : "border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800"
            }`}
            title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
          >
            <Eye size={20} className={isWatched ? "fill-blue-600/20" : ""} />
          </button>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800 transition-all bg-white"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-6">
        
        {/* Left column: Key Stats and Interactive Charts */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="bg-slate-50/50 border border-slate-200 p-4 rounded-xl flex flex-col justify-between shadow-xs">
              <span className="text-xs font-mono text-slate-500 uppercase tracking-widest flex items-center justify-between">
                <span>Retail Price</span>
                <Tag size={14} className="text-slate-400" />
              </span>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-3xl font-mono text-slate-900 font-bold">
                  ${product.currentPrice.toLocaleString()}
                </span>
                {msrpDelta > 0 && (
                  <span className="text-xs text-slate-400 line-through">
                    ${product.originalPrice.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs text-emerald-600 font-medium flex items-center gap-1">
                {msrpDelta > 0 ? (
                  <>
                    <TrendingDown size={12} />
                    <span>Slashed ${msrpDelta} ({msrpDiscountPct}% OFF MSRP)</span>
                  </>
                ) : (
                  <span className="text-slate-400">Currently at original release MSRP</span>
                )}
              </div>
            </div>

            <div className="bg-slate-50/50 border border-slate-200 p-4 rounded-xl flex flex-col justify-between shadow-xs">
              <span className="text-xs font-mono text-slate-500 uppercase tracking-widest flex items-center justify-between">
                <span>AI Prediction</span>
                <Cpu size={14} className="text-slate-400" />
              </span>
              <div className={`text-xl font-display font-bold mt-2 ${
                product.recommendation === "BUY" ? "text-emerald-650" : "text-amber-600"
              }`}>
                {product.recommendation === "BUY" ? "BUY NOW" : "WAIT FOR DROP"}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Confidence rating: <span className="font-mono text-slate-800 font-semibold">{Math.round((product.predictionConfidence || 0.8) * 100)}%</span>
              </div>
            </div>

            <div className="bg-slate-50/50 border border-slate-200 p-4 rounded-xl flex flex-col justify-between shadow-xs">
              <span className="text-xs font-mono text-slate-500 uppercase tracking-widest flex items-center justify-between">
                <span>Historical Low</span>
                <Calendar size={14} className="text-slate-400" />
              </span>
              <span className="text-2xl font-mono text-slate-900 font-bold mt-2">
                ${Math.min(...history.map((h) => h.price), product.currentPrice).toLocaleString()}
              </span>
              <div className="mt-1 text-xs text-slate-500">
                Extracted across <span className="text-slate-800 font-semibold">{history.length}</span> market days
              </div>
            </div>

          </div>

          {/* Interactive Chart Container */}
          <div className="bg-slate-50/50 border border-slate-200 p-5 rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
              <div>
                <h3 className="font-display font-semibold text-slate-900 text-base">90-Day Telemetry & Prediction</h3>
                <p className="text-xs text-slate-505">Solid field displays statistical averages. Dotted projections forecast 7d, 30d, 90d paths.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 font-mono font-semibold">
                  <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                  Active AI Model
                </span>
              </div>
            </div>

            {/* Price Chart */}
            <div className="h-72 w-full mt-2 font-mono text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHistory" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" tickLine={false} />
                  <YAxis stroke="#64748b" tickLine={false} domain={["dataMin - 100", "dataMax + 100"]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #cbd5e1" }}
                    itemStyle={{ color: "#0f172a" }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area
                    type="monotone"
                    dataKey="Historical Avg"
                    name="Historical Market Average ($)"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorHistory)"
                  />
                  <Line
                    type="monotone"
                    dataKey="Projected Price"
                    name="Projected Price Forecast ($)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 4, stroke: "#312e81", fill: "#f59e0b" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Core Specifications Panel */}
          <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200">
            <h3 className="font-display font-semibold text-slate-900 mb-4 text-base">Hardware Specifications</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(product.specs).map(([key, val]) => (
                <div key={key} className="border-b border-slate-100 pb-2.5">
                  <div className="text-xs text-slate-500 font-mono tracking-wider">{key}</div>
                  <div className="text-sm font-sans font-medium text-slate-800 mt-0.5">{val}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-650 mt-4 leading-relaxed font-sans border-t border-slate-100 pt-3">
              {product.description}
            </p>
          </div>

        </div>

        {/* Right column: Target Price Notification & ML forecast narrative */}
        <div className="space-y-6">
          
          {/* AI Recommendation Panel */}
          <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200 relative overflow-hidden flex flex-col justify-between min-h-[380px]">
            
            {/* Background glowing gradient */}
            <div className={`absolute top-0 right-0 h-40 w-40 rounded-full blur-3xl opacity-5 pointer-events-none ${
              product.recommendation === "BUY" ? "bg-emerald-500" : "bg-amber-500"
            }`} />

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-slate-550 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles size={14} className="text-emerald-600 animate-pulse" />
                  AI Market Forecast
                </span>
                
                <button
                  onClick={handleRecalculatePredictions}
                  disabled={predicting}
                  className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-200/80 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 border border-slate-200"
                >
                  <RefreshCw size={12} className={predicting ? "animate-spin" : ""} />
                  Recalculate
                </button>
              </div>

              {/* ML Analysis Text */}
              <div className="text-slate-650 text-sm leading-relaxed overflow-y-auto max-h-[240px] pr-2 space-y-3 font-sans border-b border-slate-150 pb-4 mb-4">
                {predicting ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500 mb-3"></div>
                    <p className="font-mono text-xs">Awaiting pricing assessment from Gemini...</p>
                  </div>
                ) : prediction ? (
                  prediction.analysis.split("\n").map((line, idx) => {
                    if (line.startsWith("###")) {
                      return <h4 key={idx} className="text-base font-display font-semibold text-slate-900 mt-4">{line.replace("###", "")}</h4>;
                    }
                    if (line.startsWith("-")) {
                      return <li key={idx} className="list-disc ml-4 text-slate-650 py-0.5">{line.replace("-", "").trim()}</li>;
                    }
                    if (line.startsWith("**") && line.endsWith("**")) {
                      return <p key={idx} className="text-emerald-650 font-semibold">{line.replaceAll("**", "")}</p>;
                    }
                    return <p key={idx} className="text-slate-550 leading-relaxed text-sm">{line}</p>;
                  })
                ) : (
                  <p className="text-slate-500">Run prediction assessment to compute analysis.</p>
                )}
              </div>
            </div>

            {/* Target Timeline Outlook */}
            <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-150">
              <span className="text-xs font-mono uppercase tracking-widest text-slate-500 block mb-1">Target Timeline Outlook</span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50/50 p-2 rounded-lg border border-slate-150">
                  <div className="text-[10px] text-slate-500 font-mono">7 Days</div>
                  <div className="text-sm font-mono text-slate-900 font-semibold mt-1">
                    ${prediction ? prediction.predicted7d.toLocaleString() : "..."}
                  </div>
                </div>
                <div className="bg-slate-50/50 p-2 rounded-lg border border-slate-150">
                  <div className="text-[10px] text-slate-500 font-mono">30 Days</div>
                  <div className="text-sm font-mono text-slate-900 font-semibold mt-1">
                    ${prediction ? prediction.predicted30d.toLocaleString() : "..."}
                  </div>
                </div>
                <div className="bg-slate-50/50 p-2 rounded-lg border border-slate-150">
                  <div className="text-[10px] text-slate-500 font-mono">90 Days</div>
                  <div className="text-sm font-mono text-slate-900 font-semibold mt-1">
                    ${prediction ? prediction.predicted90d.toLocaleString() : "..."}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Email drop-price Alert module */}
          <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-600 text-white">
                <BellRing size={18} />
              </div>
              <h3 className="font-display font-semibold text-slate-900 text-base">Create Price-Drop Alert</h3>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              Target a desired purchase rate. We'll send an immediate email trigger if this device's retail index drops below your target.
            </p>

            <form onSubmit={handleCreateAlert} className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-1">
                  Target Price Threshold
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    value={alertTargetPrice}
                    onChange={(e) => setAlertTargetPrice(e.target.value)}
                    required
                    min={1}
                    className="w-full bg-white border border-slate-205 rounded-xl py-2 px-8 font-mono text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g. 1050"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-1">
                  Alert Email Address
                </label>
                <input
                  type="email"
                  value={alertEmail}
                  onChange={(e) => setAlertEmail(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-205 rounded-xl py-2 px-3.5 font-sans text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  placeholder="name@domain.com"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold font-display text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-100"
              >
                <BellRing size={14} />
                Set Active Alert
              </button>
            </form>

            <AnimatePresence>
              {alertCreatedSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl px-3.5 py-2.5 text-xs flex items-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  <span>Price drop notify alarm armed!</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Display Active Alerts list */}
            {alerts.length > 0 && (
              <div className="border-t border-slate-200/80 pt-4 mt-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-2">
                  My Active Price Triggers ({alerts.length})
                </span>
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {alerts.map((al) => (
                    <div
                      key={al.id}
                      className="bg-white border border-slate-150 p-2.5 rounded-xl flex items-center justify-between text-xs shadow-xs"
                    >
                      <div>
                        <div className="font-mono text-slate-800 text-xs font-semibold">
                          Target: <span className="text-emerald-600 font-bold">${al.targetPrice.toLocaleString()}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{al.email}</div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-mono ${
                          al.isTriggered 
                            ? "bg-slate-100 text-slate-500" 
                            : "bg-emerald-50 text-emerald-600 font-semibold"
                        }`}>
                          {al.isTriggered ? "Triggered" : "Active"}
                        </span>
                        
                        <button
                          onClick={() => handleDeleteAlert(al.id)}
                          className="p-1 px-1.5 rounded bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-red-600 transition-all border border-slate-200 cursor-pointer"
                          title="Purge alert"
                        >
                          <Trash2 size={12} className="stroke-current" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
