import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { DB } from "./server/db.js";
import { triggerAIPrediction } from "./server/predict.js";

// Ensure database is populated with pricing telemetry on boot
DB.init();

async function bootstrap() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing requests
  app.use(express.json());

  // --- REST API ENDPOINTS ---

  // Health probe endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // Fetch product catalog with standard filters & search query
  app.get("/api/products", (req, res) => {
    try {
      const search = (req.query.search as string || "").toLowerCase();
      const brand = (req.query.brand as string || "").toLowerCase();
      const category = (req.query.category as string || "").toLowerCase();

      let items = DB.getProducts();

      if (search) {
        items = items.filter(
          (p) =>
            p.name.toLowerCase().includes(search) ||
            p.brand.toLowerCase().includes(search) ||
            p.description.toLowerCase().includes(search)
        );
      }

      if (brand) {
        items = items.filter((p) => p.brand.toLowerCase() === brand);
      }

      if (category) {
        items = items.filter((p) => p.category.toLowerCase() === category);
      }

      // Map current recommendation, price trend and total setup alert counters
      const enriched = items.map((product) => {
        const prediction = DB.getPredictions(product.id);
        const alerts = DB.getAlerts().filter((a) => a.productId === product.id).length;
        return {
          ...product,
          recommendation: prediction ? prediction.action : "BUY",
          predictionConfidence: prediction ? prediction.confidence : 0.8,
          alertCount: alerts,
        };
      });

      res.json({ products: enriched });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to load products index", details: err.message });
    }
  });

  // Get single product details, complete 90 days price history trail and forecast
  app.get("/api/products/:id", (req, res) => {
    try {
      const id = req.params.id;
      const product = DB.getProductById(id);
      if (!product) {
         res.status(404).json({ error: `Product ${id} not found` });
         return;
      }

      const history = DB.getPriceHistory(id);
      const prediction = DB.getPredictions(id);
      const alerts = DB.getAlerts().filter((a) => a.productId === id);

      // Structure historical points chronologically formatted beautifully for Recharts
      const sortedHistory = [...history].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      res.json({
        product,
        history: sortedHistory,
        prediction,
        alerts,
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to assemble detailed view telemetry", details: err.message });
    }
  });

  // Trigger real-time predictive modeling (Holt's DES or server-side Gemini 3.5 forecast)
  app.post("/api/products/:id/predict", async (req, res) => {
    try {
      const id = req.params.id;
      const updatedPrediction = await triggerAIPrediction(id);
      res.json({ success: true, prediction: updatedPrediction });
    } catch (err: any) {
      res.status(500).json({ error: "Machine learning forecasting failed", details: err.message });
    }
  });

  // Gather platform summary stats
  app.get("/api/dashboard/stats", (req, res) => {
    try {
      const products = DB.getProducts();
      const allHistory = DB.getProducts().map((p) => DB.getPriceHistory(p.id));

      let totalTrackedVendors = 0;
      let totalValueSlashed = 0;
      let buyRecommendationsCount = 0;

      products.forEach((p) => {
        totalValueSlashed += Math.max(0, p.originalPrice - p.currentPrice);
        const pred = DB.getPredictions(p.id);
        if (pred && pred.action === "BUY") {
          buyRecommendationsCount++;
        }
      });

      const uniqueRetailers = DB.getRetailers().length;
      const totalAlertsCount = DB.getAlerts().length;

      res.json({
        totalTrackedProducts: products.length,
        averageDiscountMSRP: products.length
          ? Math.round((totalValueSlashed / products.length) * 100) / 100
          : 0,
        buySignalsRatio: products.length
          ? Math.round((buyRecommendationsCount / products.length) * 100)
          : 0,
        uniqueRetailers,
        totalAlertsSetup: totalAlertsCount,
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed compilation of dashboard statistics", details: err.message });
    }
  });

  // Retrieve or register user session (Mock authentication flow)
  app.post("/api/auth/session", (req, res) => {
    try {
      const { email, name } = req.body;
      const defaultUserEmail = "thejeswarareddy01@gmail.com";
      const targetUserEmail = email || defaultUserEmail;

      let user = DB.getUserByEmail(targetUserEmail);

      if (!user) {
        user = {
          id: `user-${Date.now()}`,
          email: targetUserEmail,
          name: name || "Thejeswara Reddy",
          watchlist: [],
          password: "password123", // Default password for auto-created sessions
        };
        DB.saveUser(user);
      }

      res.json({ session: user });
    } catch (err: any) {
      res.status(500).json({ error: "Authentication system failure", details: err.message });
    }
  });

  // Real registration endpoint
  app.post("/api/auth/register", (req, res) => {
    try {
      const { email, password, name } = req.body;
      if (!email || !password || !name) {
        res.status(400).json({ error: "Name, email, and password are required fields." });
        return;
      }

      const existingUser = DB.getUserByEmail(email);
      if (existingUser) {
        res.status(400).json({ error: "An account with this email address already exists." });
        return;
      }

      const newUser = {
        id: `user-${Date.now()}`,
        email,
        name,
        password,
        watchlist: [],
      };

      DB.saveUser(newUser);
      res.json({ success: true, session: newUser });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to register user", details: err.message });
    }
  });

  // Real login endpoint
  app.post("/api/auth/login", (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required fields." });
        return;
      }

      const user = DB.getUserByEmail(email);
      if (!user) {
        res.status(401).json({ error: "Account not found. Please review your email or Sign Up." });
        return;
      }

      if (user.password && user.password !== password) {
        res.status(401).json({ error: "Incorrect password. Please try again." });
        return;
      }

      // If user doesn't have a password set yet (e.g., initial seed from legacy session), set it now
      if (!user.password) {
        user.password = password;
        DB.saveUser(user);
      }

      res.json({ success: true, session: user });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to authenticate", details: err.message });
    }
  });

  // Toggle dynamic tracker watchlist
  app.post("/api/watchlists/toggle", (req, res) => {
    try {
      const { userId, productId } = req.body;
      const user = DB.getUser(userId || "user-default");
      if (!user) {
         res.status(404).json({ error: "Registered account not found" });
         return;
      }

      const idx = user.watchlist.indexOf(productId);
      let active = false;
      if (idx !== -1) {
        user.watchlist.splice(idx, 1);
      } else {
        user.watchlist.push(productId);
        active = true;
      }

      DB.saveUser(user);
      res.json({ success: true, watchlist: user.watchlist, active });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to update target watchlist", details: err.message });
    }
  });

  // Set email-based target price drop notifications
  app.post("/api/alerts/create", (req, res) => {
    try {
      const { productId, userId, targetPrice, email } = req.body;
      const alert: any = {
        id: `alert-${Date.now()}`,
        productId,
        userId: userId || "user-default",
        email: email || "thejeswarareddy01@gmail.com",
        targetPrice: Number(targetPrice),
        active: true,
        isTriggered: false,
        createdAt: new Date().toISOString(),
      };

      DB.saveAlert(alert);
      res.json({ success: true, alert });
    } catch (err: any) {
      res.status(500).json({ error: "Price drop request failed", details: err.message });
    }
  });

  // Purge dynamic notify targets
  app.delete("/api/alerts/:id", (req, res) => {
    try {
      const id = req.params.id;
      DB.removeAlert(id);
      res.json({ success: true, message: `Alert ${id} retracted successfully` });
    } catch (err: any) {
      res.status(500).json({ error: "Failed deletion of alarm trigger", details: err.message });
    }
  });

  // Get all price alert alarms configured by a user
  app.get("/api/alerts/user/:userId", (req, res) => {
    try {
      const userId = req.params.userId;
      const alerts = DB.getAlertsForUser(userId);
      res.json({ alerts });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to load alarm ledger", details: err.message });
    }
  });

  // Inject a simulated retail price drop to trigger alert alarms
  app.post("/api/products/:id/simulate-price", (req, res) => {
    try {
      const id = req.params.id;
      const { price, retailerId } = req.body;

      const product = DB.getProductById(id);
      if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
      }

      const inputPrice = Number(price);
      if (isNaN(inputPrice) || inputPrice <= 0) {
        res.status(400).json({ error: "A valid positive price is required." });
        return;
      }

      // Update current registered product price
      product.currentPrice = inputPrice;
      DB.saveProduct(product);

      // Save to price history timeline to trigger checks
      DB.addPriceHistory({
        productId: id,
        retailerId: retailerId || "ret-amazon",
        price: inputPrice,
        timestamp: new Date().toISOString()
      });

      res.json({ success: true, currentPrice: product.currentPrice });
    } catch (err: any) {
      res.status(500).json({ error: "Simulating pricing drop action failed", details: err.message });
    }
  });

  // --- VITE MIDDLEWARE SETUP ---

  if (process.env.NODE_ENV !== "production") {
    // Integrate Vite development server middleware for live routing & hot refresh
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Clean production static serve
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Electronics Pricing platform actively listening at http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Critical crash during server bootstrap process:", err);
  process.exit(1);
});
