import React, { useState, useEffect, FormEvent } from "react";
import {
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  SlidersHorizontal,
  Bookmark,
  Smartphone,
  Laptop,
  Tablet,
  Activity,
  User,
  BellRing,
  Cpu,
  RefreshCw,
  Tag,
  ShieldCheck,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product, DashboardStats } from "./types.js";
import ProductDetail from "./components/ProductDetail.js";
import AuthGate from "./components/AuthGate.js";
import AlertSimulator from "./components/AlertSimulator.js";

const DEFAULT_USER_EMAIL = "thejeswarareddy01@gmail.com";

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  
  // Search and Filter variables
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");

  // Authentication & session variables (personal account login / signup)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem("is_logged_in") === "true";
  });
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem("user_email") || DEFAULT_USER_EMAIL);
  const [userId, setUserId] = useState(() => localStorage.getItem("user_id") || "user-default");
  const [userName, setUserName] = useState(() => localStorage.getItem("user_name") || "Thejeswara Reddy");
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [showProfileConfig, setShowProfileConfig] = useState(false);
  const [authEmailInput, setAuthEmailInput] = useState("");
  const [authNameInput, setAuthNameInput] = useState("");

  // Selections
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  
  const [categories, setCategories] = useState<string[]>(["all", "smartphone", "laptop", "tablet"]);
  const [brands, setBrands] = useState<string[]>(["all", "Apple", "Samsung", "ASUS", "Dell"]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Authenticate / fetch session
  const fetchUserSession = async (email: string, name?: string) => {
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      if (res.ok) {
        const data = await res.json();
        setUserId(data.session.id);
        setUserEmail(data.session.email);
        setUserName(data.session.name);
        setWatchlist(data.session.watchlist);
        
        localStorage.setItem("user_id", data.session.id);
        localStorage.setItem("user_email", data.session.email);
        localStorage.setItem("user_name", data.session.name);
      }
    } catch (err) {
      console.error("Auth routing failure:", err);
    }
  };

  // Fetch full data stream
  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      
      // Load products index
      const pRes = await fetch(`/api/products?search=${searchText}&category=${selectedCategory === "all" ? "" : selectedCategory}&brand=${selectedBrand === "all" ? "" : selectedBrand}`);
      if (pRes.ok) {
        const pData = await pRes.json();
        setProducts(pData.products);
      }

      // Load platform statistics
      const sRes = await fetch("/api/dashboard/stats");
      if (sRes.ok) {
        const sData = await sRes.json();
        setStats(sData);
      }
    } catch (err) {
      console.error("Failed to load dashboard statistics:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Seed on mount
  useEffect(() => {
    if (isLoggedIn) {
      const savedEmail = localStorage.getItem("user_email") || DEFAULT_USER_EMAIL;
      const savedName = localStorage.getItem("user_name") || "Thejeswara Reddy";
      fetchUserSession(savedEmail, savedName);
    } else {
      setLoading(false);
    }
  }, [isLoggedIn]);

  // Sync dashboard values on filters change
  useEffect(() => {
    if (isLoggedIn) {
      loadDashboardData();
    }
  }, [searchText, selectedCategory, selectedBrand, isLoggedIn]);

  // Handle bookmark watchlists actions
  const handleToggleWatchlist = async (prodId: string) => {
    try {
      const res = await fetch("/api/watchlists/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, productId: prodId }),
      });
      if (res.ok) {
        const data = await res.json();
        setWatchlist(data.watchlist);
        
        // Refresh items counter to display updated bookmarked status
        const pRes = await fetch(`/api/products?search=${searchText}&category=${selectedCategory === "all" ? "" : selectedCategory}&brand=${selectedBrand === "all" ? "" : selectedBrand}`);
        if (pRes.ok) {
          const pData = await pRes.json();
          setProducts(pData.products);
        }
      }
    } catch (err) {
      console.error("Watchlist action error:", err);
    }
  };

  // Handles updating simulated profile session
  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!authEmailInput) return;
    await fetchUserSession(authEmailInput, authNameInput);
    setShowProfileConfig(false);
    loadDashboardData();
  };

  // Render product visual category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "smartphone":
        return <Smartphone size={18} />;
      case "laptop":
        return <Laptop size={18} />;
      case "tablet":
        return <Tablet size={18} />;
      default:
        return <Activity size={18} />;
    }
  };

  const handleLogOut = () => {
    localStorage.removeItem("is_logged_in");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_name");
    setUserId("user-default");
    setUserEmail(DEFAULT_USER_EMAIL);
    setUserName("Thejeswara Reddy");
    setWatchlist([]);
    setIsLoggedIn(false);
    setShowProfileConfig(false);
  };

  if (!isLoggedIn) {
    return (
      <AuthGate
        onAuthSuccess={(session) => {
          localStorage.setItem("is_logged_in", "true");
          localStorage.setItem("user_id", session.id);
          localStorage.setItem("user_email", session.email);
          localStorage.setItem("user_name", session.name);
          setUserId(session.id);
          setUserEmail(session.email);
          setUserName(session.name);
          setWatchlist(session.watchlist);
          setIsLoggedIn(true);
        }}
        onContinueAsGuest={() => {
          const guestSession = {
            id: "user-default",
            email: "thejeswarareddy01@gmail.com",
            name: "Thejeswara Reddy (Guest)",
            watchlist: ["prod-iphone-16-pro", "prod-macbook-pro-m3"],
          };
          localStorage.setItem("is_logged_in", "true");
          localStorage.setItem("user_id", guestSession.id);
          localStorage.setItem("user_email", guestSession.email);
          localStorage.setItem("user_name", guestSession.name);
          setUserId(guestSession.id);
          setUserEmail(guestSession.email);
          setUserName(guestSession.name);
          setWatchlist(guestSession.watchlist);
          setIsLoggedIn(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" id="app-root">
      
      {/* Top Professional Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-45 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          
          {/* Logo Brand Title */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200/50">
              <Cpu size={24} className="font-bold shrink-0" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-semibold tracking-tight text-slate-900 text-lg">
                  Camel<span className="text-blue-600">Predict</span>
                </span>
                <span className="text-[10px] uppercase font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                  AI Edge
                </span>
              </div>
              <p className="text-[10px] text-slate-505 font-mono">Statistical Time-Series Predictor</p>
            </div>
          </div>

          {/* Connected User Profile Controls */}
          <div className="flex items-center gap-3 relative">
            <button
              onClick={() => {
                setShowProfileConfig(!showProfileConfig);
              }}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-sans shadow-xs"
            >
              <div className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-semibold">
                <User size={14} />
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs text-slate-800 font-semibold">{userName}</div>
                <div className="text-[9px] text-slate-505 font-mono max-w-[120px] truncate">{userEmail}</div>
              </div>
            </button>
          </div>

        </div>
      </header>

      {/* Profile summary menu panel */}
      <AnimatePresence>
        {showProfileConfig && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white border-b border-slate-200 py-6 px-4 shadow-sm"
          >
            <div className="max-w-md mx-auto text-center space-y-3">
              <div className="mx-auto h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <User size={24} />
              </div>
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">{userName}</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{userEmail}</p>
              </div>
              <p className="text-xs text-slate-505 max-w-sm mx-auto leading-relaxed">
                You are securely logged into your CamelPredict AI Account. All watchlists, statistical calculations, and personalized alerts are configured on your private profile.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleLogOut}
                  className="bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-display font-semibold text-xs py-2 px-5 rounded-xl transition-all shadow-md shadow-rose-100 cursor-pointer"
                >
                  Sign Out of Account
                </button>
                <button
                  type="button"
                  onClick={() => setShowProfileConfig(false)}
                  className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs px-5 rounded-xl transition-all cursor-pointer"
                >
                  Close Settings
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        
        {/* Dynamic Bento Box Metrics Header */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          
          <div className="bg-white border border-slate-205 p-5 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
            <span className="text-[10px] font-mono uppercase text-slate-400 tracking-widest flex items-center justify-between">
              <span>Tracked Models</span>
              <Activity size={14} className="text-slate-500" />
            </span>
            <div className="mt-4">
              <span className="text-3xl font-mono text-slate-900 font-bold">
                {stats ? stats.totalTrackedProducts : "..."}
              </span>
              <p className="text-[10px] text-slate-505 mt-1">Smartphones & Laptops</p>
            </div>
          </div>

          <div className="bg-white border border-slate-205 p-5 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
            <span className="text-[10px] font-mono uppercase text-slate-400 tracking-widest flex items-center justify-between">
              <span>Avg Slash From MSRP</span>
              <Tag size={14} className="text-slate-500" />
            </span>
            <div className="mt-4">
              <span className="text-3xl font-mono text-slate-900 font-bold">
                ${stats ? stats.averageDiscountMSRP.toLocaleString() : "..."}
              </span>
              <p className="text-[10px] text-emerald-600 font-medium mt-1">Active price reductions</p>
            </div>
          </div>

          <div className="bg-white border border-slate-205 p-5 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
            <span className="text-[10px] font-mono uppercase text-slate-400 tracking-widest flex items-center justify-between">
              <span>Buy Signal Ratio</span>
              <Sparkles size={14} className="text-slate-500" />
            </span>
            <div className="mt-4">
              <span className="text-3xl font-mono text-blue-600 font-bold">
                {stats ? stats.buySignalsRatio : "..."}%
              </span>
              <p className="text-[10px] text-slate-505 mt-1">Assessed as "Optimal Entry"</p>
            </div>
          </div>

          <div className="bg-white border border-slate-205 p-5 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
            <span className="text-[10px] font-mono uppercase text-slate-400 tracking-widest flex items-center justify-between">
              <span>Monitored Retailers</span>
              <ShieldCheck size={14} className="text-slate-500" />
            </span>
            <div className="mt-4">
              <span className="text-3xl font-mono text-slate-900 font-bold">
                {stats ? stats.uniqueRetailers : "..."}
              </span>
              <p className="text-[10px] text-slate-505 mt-1">API scrapes active</p>
            </div>
          </div>

          <div className="bg-white border border-slate-205 p-5 rounded-2xl col-span-2 lg:col-span-1 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
            <span className="text-[10px] font-mono uppercase text-slate-400 tracking-widest flex items-center justify-between">
              <span>Alert Alarms Armed</span>
              <BellRing size={14} className="text-slate-500" />
            </span>
            <div className="mt-4">
              <span className="text-3xl font-mono text-slate-900 font-bold">
                {stats ? stats.totalAlertsSetup : "..."}
              </span>
              <p className="text-[10px] text-slate-505 mt-1">Active price-drop sensors</p>
            </div>
          </div>

        </section>

        {/* Selected Product Detail Panel (displays directly as top focus on card click) */}
        <AnimatePresence mode="wait">
          {selectedProductId && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="scroll-mt-24"
              id="active-details-panel"
            >
              <ProductDetail
                productId={selectedProductId}
                userId={userId}
                currentUserEmail={userEmail}
                onClose={() => setSelectedProductId(null)}
                onToggleWatchlist={handleToggleWatchlist}
                isWatched={watchlist.includes(selectedProductId)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic price alert notifications ledger & simulated scrapers testing tool */}
        <AlertSimulator
          userId={userId}
          userEmail={userEmail}
          products={products}
          onTriggerRefresh={loadDashboardData}
        />

        {/* Filters and Catalog Grid Section */}
        <section className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-6">
          
          {/* Header & text search controls */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-display font-semibold text-slate-900">Supported Electronics Catalog</h2>
              <p className="text-xs text-slate-500 mt-0.5">Filter by brand, category or device specs. Click cards to view 90d telemetry trails and detailed predictions.</p>
            </div>

            {/* Live Search Input field */}
            <div className="relative max-w-sm w-full">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search iPhones, Macbooks, specs..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-10 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Filter Bar Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100 pt-5">
            
            {/* Category selection tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs px-3.5 py-1.5 rounded-lg font-display capitalize cursor-pointer transition-all ${
                    selectedCategory === cat
                      ? "bg-blue-50 text-blue-700 font-bold border-blue-100"
                      : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-50"
                  } border`}
                >
                  {cat === "all" ? "All Platforms" : `${cat}s`}
                </button>
              ))}
            </div>

            {/* Brand selects */}
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] uppercase font-mono text-slate-500 flex items-center gap-1">
                <SlidersHorizontal size={12} />
                <span>Brand Filter:</span>
              </span>
              <div className="flex items-center gap-1">
                {brands.map((b) => (
                  <button
                    key={b}
                    onClick={() => setSelectedBrand(b)}
                    className={`text-[10px] uppercase font-mono px-2.5 py-1 rounded transition-all ${
                      selectedBrand === b
                        ? "bg-blue-50 text-blue-600 border border-blue-100 font-semibold"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    {b === "all" ? "All" : b}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Catalog grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-600"></div>
              <p className="mt-4 text-slate-500 font-mono text-xs">Querying database indexes...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center p-16 border border-dashed border-slate-200 rounded-xl text-slate-500 font-sans">
              No electronic devices match your search criteria. Please adjust filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p) => {
                const isBookmarked = watchlist.includes(p.id);
                return (
                  <motion.div
                    key={p.id}
                    layout
                    whileHover={{ y: -4 }}
                    onClick={() => {
                      setSelectedProductId(p.id);
                      // Scroll to target view panel smoothly
                      setTimeout(() => {
                        document.getElementById("active-details-panel")?.scrollIntoView({ behavior: "smooth" });
                      }, 100);
                    }}
                    className={`bg-white border ${
                      selectedProductId === p.id ? "border-blue-650 ring-2 ring-blue-100" : "border-slate-200 hover:border-slate-300"
                    } p-5 rounded-2xl cursor-pointer transition-all space-y-4 relative overflow-hidden group shadow-sm hover:shadow-md`}
                  >
                    {/* Top Right Action buttons */}
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleWatchlist(p.id)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          isBookmarked
                            ? "bg-blue-50 border-blue-100 text-blue-600"
                            : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-655"
                        }`}
                        title={isBookmarked ? "Remove from watchlist" : "Add to watchlist"}
                      >
                        <Bookmark size={14} className={isBookmarked ? "fill-blue-600/20" : ""} />
                      </button>
                    </div>

                    {/* Logo/Brand Row */}
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${
                        p.recommendation === "BUY" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                      }`}>
                        {getCategoryIcon(p.category)}
                      </div>
                      <div>
                        <div className="text-[9px] uppercase font-mono tracking-wider text-slate-400">{p.brand}</div>
                        <h3 className="font-display font-medium text-slate-800 group-hover:text-blue-600 transition-colors">{p.name}</h3>
                      </div>
                    </div>

                    {/* Key specs summary */}
                    <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 space-y-1.5">
                      {Object.entries(p.specs).slice(0, 3).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-slate-400">{k}</span>
                          <span className="text-slate-700 font-sans font-medium truncate max-w-[140px] text-right">{v}</span>
                        </div>
                      ))}
                    </div>

                    {/* Pricing details & Recommendation Badge */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div>
                        <div className="text-[9px] uppercase font-mono tracking-wider text-slate-450">Current Value</div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-mono font-semibold text-slate-900">
                            ${p.currentPrice.toLocaleString()}
                          </span>
                          {p.originalPrice > p.currentPrice && (
                            <span className="text-xs text-slate-400 line-through">
                              ${p.originalPrice.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[9px] uppercase font-mono tracking-wider text-slate-450">Recommendation</div>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold mt-1 px-3 py-1 rounded-full ${
                          p.recommendation === "BUY" 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                            : "bg-amber-50 text-amber-700 border border-amber-100"
                        } border`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${p.recommendation === "BUY" ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                          {p.recommendation === "BUY" ? "BUY NOW" : "WAIT"}
                        </span>
                      </div>
                    </div>

                    {/* Active price-sensor indicator status line at bottom */}
                    {isBookmarked && (
                      <div className="text-[10px] text-blue-600 font-mono flex items-center gap-1 pt-1 justify-start">
                        <Check size={12} strokeWidth={3} />
                        <span>Bookmarked in Active watchlist</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

        </section>

      </main>

      {/* Humble Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 font-mono mt-20">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 CamelPredict Corporation. Powered by local Double Exponential Smoothing & Google Gemini 3.5 models.</p>
          <div className="flex justify-center gap-4 mt-2">
            <span className="hover:text-slate-850 cursor-pointer">Scraping APIs</span>
            <span>•</span>
            <span className="hover:text-slate-850 cursor-pointer">Security Rules</span>
            <span>•</span>
            <span className="hover:text-slate-850 cursor-pointer">Telemetry Settings</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
