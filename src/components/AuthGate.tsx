import React, { useState, FormEvent } from "react";
import { Cpu, Mail, Lock, User, ArrowRight, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AuthGateProps {
  onAuthSuccess: (session: { id: string; email: string; name: string; watchlist: string[] }) => void;
  onContinueAsGuest: () => void;
}

export default function AuthGate({ onAuthSuccess, onContinueAsGuest }: AuthGateProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    const url = isSignUp ? "/api/auth/register" : "/api/auth/login";
    const body = isSignUp ? { email, password, name } : { email, password };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "An error occurred during authentication.");
      }

      onAuthSuccess(data.session);
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadDemoAccount = () => {
    setLoading(true);
    setTimeout(async () => {
      try {
        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "thejeswarareddy01@gmail.com",
            name: "Thejeswara Reddy",
          }),
        });
        const data = await response.json();
        if (response.ok) {
          onAuthSuccess(data.session);
        } else {
          onContinueAsGuest();
        }
      } catch (err) {
        onContinueAsGuest();
      } finally {
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden" id="auth-gate-root">
      
      {/* Background Decorative Blur Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-emerald-100 rounded-full blur-3xl opacity-50 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center">
          <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-200 mb-4 animate-pulse">
            <Cpu size={32} />
          </div>
          <h2 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight text-center">
            Camel<span className="text-blue-600">Predict</span>
          </h2>
          <p className="mt-2 text-sm text-slate-500 font-mono text-center">
            AI Electronic Price Forecasting Edge
          </p>
        </div>

        {/* Auth Mode Toggle Tabs (Login / Register) */}
        <div className="mt-8 bg-white border border-slate-200/80 p-1.5 rounded-2xl flex max-w-sm mx-auto shadow-xs">
          <button
            onClick={() => {
              setIsSignUp(false);
              setErrorMessage("");
            }}
            className={`flex-1 text-center font-display text-xs py-2 rounded-xl transition-all cursor-pointer ${
              !isSignUp
                ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-100"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => {
              setIsSignUp(true);
              setErrorMessage("");
            }}
            className={`flex-1 text-center font-display text-xs py-2 rounded-xl transition-all cursor-pointer ${
              isSignUp
                ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-100"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Core Auth Card Content */}
        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 shadow-xl shadow-slate-100 rounded-3xl border border-slate-100">
            
            <AnimatePresence mode="wait">
              <motion.div
                key={isSignUp ? "signup" : "login"}
                initial={{ opacity: 0, x: isSignUp ? 12 : -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isSignUp ? -12 : 12 }}
                transition={{ duration: 0.15 }}
              >
                <h3 className="text-lg font-display font-bold text-slate-900 mb-1">
                  {isSignUp ? "Create dynamic profile" : "Welcome back"}
                </h3>
                <p className="text-xs text-slate-400 mb-6">
                  {isSignUp 
                    ? "Register to track and simulate retail price alerts instantly." 
                    : "Enter your credentials to manage active electronics watchlists."}
                </p>

                {errorMessage && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl text-xs font-medium mb-5 animate-shake">
                    {errorMessage}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {isSignUp && (
                    <div>
                      <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1.5 font-bold">
                        Full Name
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <User size={16} />
                        </span>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Alex Rivers"
                          className="w-full bg-slate-50/55 border border-slate-200/80 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-sans"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1.5 font-bold">
                      Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Mail size={16} />
                      </span>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. alex@domain.com"
                        className="w-full bg-slate-50/55 border border-slate-200/80 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-sans"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1.5 font-bold">
                      Password
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Lock size={16} />
                      </span>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={isSignUp ? "Min 6 characters" : "••••••••"}
                        minLength={6}
                        className="w-full bg-slate-50/55 border border-slate-200/80 rounded-xl py-2.5 pl-10 pr-10 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-sans"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-display text-xs py-3 rounded-xl transition-all font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {loading ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span>{isSignUp ? "Register Account" : "Access Forecasts"}</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            </AnimatePresence>

            {/* Quick Helper Account Info Block */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-center flex flex-col gap-2.5">
              <button
                type="button"
                onClick={loadDemoAccount}
                disabled={loading}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer select-none"
              >
                Log in with Demo Developer Account →
              </button>
              
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-mono">
                <ShieldCheck size={12} className="text-slate-400" />
                <span>Default Pass: <span className="font-sans font-bold">password123</span></span>
              </div>
            </div>

          </div>
        </div>

        {/* Lower Bypass Actions */}
        <div className="mt-6 text-center">
          <button
            onClick={onContinueAsGuest}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors py-1 px-4 rounded-xl hover:bg-slate-100 font-medium cursor-pointer"
          >
            Skip verification & Browse as Guest
          </button>
        </div>

      </div>
    </div>
  );
}
