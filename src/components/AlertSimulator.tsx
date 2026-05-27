import React, { useState, useEffect } from "react";
import { BellRing, Tag, Play, Trash2, CheckCircle2, TrendingDown, RefreshCw, Cpu, Activity, AlertTriangle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product, PriceAlert } from "../types.js";

interface AlertSimulatorProps {
  userId: string;
  userEmail: string;
  products: Product[];
  onTriggerRefresh: () => void;
}

export default function AlertSimulator({ userId, userEmail, products, onTriggerRefresh }: AlertSimulatorProps) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSimProductId, setSelectedSimProductId] = useState("");
  const [simPrice, setSimPrice] = useState("");
  const [simRetailer, setSimRetailer] = useState("ret-amazon");
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);

  // New quick-alert creation form states
  const [newAlertProductId, setNewAlertProductId] = useState("");
  const [newAlertTarget, setNewAlertTarget] = useState("");
  const [creatingAlert, setCreatingAlert] = useState(false);

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`/api/alerts/user/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error("Failed to fetch user alerts:", err);
    }
  };

  useEffect(() => {
    fetchAlerts();
    if (products.length > 0 && !selectedSimProductId) {
      setSelectedSimProductId(products[0].id);
      setNewAlertProductId(products[0].id);
    }
  }, [userId, products]);

  // Handle setting simulated productId price prefill
  useEffect(() => {
    if (selectedSimProductId) {
      const p = products.find((prod) => prod.id === selectedSimProductId);
      if (p) {
        // Set simulated prefill to 5% below current price
        setSimPrice(Math.round(p.currentPrice * 0.95).toString());
      }
    }
  }, [selectedSimProductId]);

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlertProductId || !newAlertTarget) return;

    setCreatingAlert(true);
    try {
      const res = await fetch("/api/alerts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: newAlertProductId,
          userId,
          email: userEmail,
          targetPrice: Number(newAlertTarget),
        }),
      });

      if (res.ok) {
        await fetchAlerts();
        setNewAlertTarget("");
        onTriggerRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingAlert(false);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchAlerts();
        onTriggerRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateDrop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSimProductId || !simPrice) return;

    setSimulating(true);
    setSimulationResult(null);

    const product = products.find((p) => p.id === selectedSimProductId);
    const targetValue = Number(simPrice);

    try {
      const res = await fetch(`/api/products/${selectedSimProductId}/simulate-price`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price: targetValue,
          retailerId: simRetailer,
        }),
      });

      if (res.ok) {
        setSimulationResult(`Successfully slashed retail listing down to $${targetValue.toLocaleString()}! Core checking algorithms triggered.`);
        await fetchAlerts();
        onTriggerRefresh();
      } else {
        const errData = await res.json();
        setSimulationResult(`Simulation failed: ${errData.error || "Internal Error"}`);
      }
    } catch (err: any) {
      setSimulationResult(`Critical error running simulation: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  // Map product names
  const getProductName = (id: string) => {
    const p = products.find((prod) => prod.id === id);
    return p ? p.name : id;
  };

  const getProductPrice = (id: string) => {
    const p = products.find((prod) => prod.id === id);
    return p ? p.currentPrice : 0;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm" id="alert-simulator-widget">
      
      {/* Top Banner Accent */}
      <div className="h-1 bg-blue-600 w-full" />

      {/* Header */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <BellRing size={18} />
            </span>
            <h2 className="text-xl font-display font-bold text-slate-900">Personalized Price Alarms Hub & Pricing Simulator</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl font-sans">
            Personalize your target budget. Configure alarms for high-end electronics, then use the right-side control pane to simulate hardware price slashes across real-time scrapers!
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 py-1.5 px-3 rounded-xl transition-all shadow-xs shrink-0 self-start sm:self-center cursor-pointer"
        >
          <RefreshCw size={12} />
          <span>Refresh List</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        
        {/* Left Column: Alarms list (7 cols) */}
        <div className="lg:col-span-7 p-6 border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-slate-800 text-sm tracking-tight">Active Price Trackers ({alerts.length})</h3>
              <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-605 px-2 py-0.5 rounded-full">
                Bounded to {userEmail}
              </span>
            </div>

            {alerts.length === 0 ? (
              <div className="text-center py-10 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/30 text-slate-450 font-sans text-xs flex flex-col items-center justify-center space-y-2">
                <BellRing size={24} className="text-slate-300" />
                <span>No active alarms configured on this profile yet.</span>
                <span className="text-[10px] text-slate-400">Add an alarm below or click any catalog item in the grid above.</span>
              </div>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {alerts.map((al) => {
                  const currentP = getProductPrice(al.productId);
                  const isArmedAndTriggered = al.isTriggered && currentP <= al.targetPrice;
                  return (
                    <div
                      key={al.id}
                      className={`border p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                        isArmedAndTriggered
                          ? "bg-emerald-50/40 border-emerald-200/80"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-mono font-semibold ${
                            isArmedAndTriggered
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-50 text-blue-700"
                          }`}>
                            {isArmedAndTriggered ? "🔴 Triggered Alert" : "Active Alarm"}
                          </span>
                          <span className="text-[10px] text-slate-450 font-mono">
                            Armed: {new Date(al.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="font-display font-semibold text-slate-800 text-sm">{getProductName(al.productId)}</h4>
                        <div className="flex items-center gap-4 text-xs">
                          <div className="font-mono text-slate-505">
                            Target Threshold: <span className="font-sans font-bold text-slate-900">${al.targetPrice.toLocaleString()}</span>
                          </div>
                          <div className="font-mono text-slate-505">
                            Current Value: <span className="font-sans font-semibold text-slate-700">${currentP.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {isArmedAndTriggered && (
                          <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-xl text-[11px] font-semibold border border-emerald-100">
                            <CheckCircle2 size={12} />
                            <span>Armed & Fired!</span>
                          </div>
                        )}
                        <button
                          onClick={() => handleDeleteAlert(al.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-100 rounded-xl transition-all cursor-pointer"
                          title="Retract dynamic alarm"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Alarm Creation form */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <h4 className="text-xs font-display font-semibold text-slate-800 mb-2">Configure New Hardware Alarm</h4>
            <form onSubmit={handleCreateAlert} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-6">
                <select
                  value={newAlertProductId}
                  onChange={(e) => {
                    setNewAlertProductId(e.target.value);
                  }}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-sans"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (${p.currentPrice})</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <input
                  type="number"
                  required
                  placeholder="Target Price $"
                  min={1}
                  value={newAlertTarget}
                  onChange={(e) => setNewAlertTarget(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-mono"
                />
              </div>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  disabled={creatingAlert}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-display font-semibold text-xs py-2 px-2.5 rounded-xl transition-all shadow-md shadow-blue-100 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <BellRing size={12} />
                  <span>Set Alert</span>
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Right Column: Pricing Drop Simulator (5 cols) */}
        <div className="lg:col-span-5 p-6 bg-slate-50/40 flex flex-col justify-between">
          <form onSubmit={handleSimulateDrop} className="space-y-4">
            <div>
              <span className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 font-mono font-semibold w-max mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                Interactive ML Testing Kit
              </span>
              <h3 className="font-display font-semibold text-slate-800 text-sm tracking-tight">Telemetry Price Filter Simulator</h3>
              <p className="text-[11px] text-slate-505 leading-relaxed mt-1">
                Subelectronic components are prone to market volatility. Simulate an instantaneous pricing drop across target scrapers to trigger user active alerts.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-1 font-semibold">
                  Pick Device
                </label>
                <select
                  value={selectedSimProductId}
                  onChange={(e) => setSelectedSimProductId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-sans shadow-xs"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (Now: ${p.currentPrice})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-1 font-semibold">
                    Simulated Price ($)
                  </label>
                  <input
                    type="number"
                    required
                    value={simPrice}
                    onChange={(e) => setSimPrice(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-mono shadow-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-1 font-semibold">
                    Retailer Channel
                  </label>
                  <select
                    value={simRetailer}
                    onChange={(e) => setSimRetailer(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-sans shadow-xs"
                  >
                    <option value="ret-amazon">Amazon Scrape</option>
                    <option value="ret-apple">Apple Direct Store</option>
                    <option value="ret-bestbuy">Best Buy</option>
                    <option value="ret-walmart">Walmart Deals</option>
                    <option value="ret-bhphoto">B&H Photo Web</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={simulating || products.length === 0}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-display text-xs py-2.5 rounded-xl transition-all font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {simulating ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Play size={12} className="fill-white" />
                  <span>Execute Price Drop Simulation</span>
                </>
              )}
            </button>

            {simulationResult && (
              <div className="bg-blue-50/50 border border-blue-100 text-blue-800 p-3.5 rounded-2xl text-[11px] font-medium leading-relaxed flex items-start gap-2 animate-pulse mt-3 text-blue-900">
                <CheckCircle2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <span>{simulationResult}</span>
              </div>
            )}
          </form>
        </div>

      </div>

    </div>
  );
}
