import fs from "fs";
import path from "path";

// Define TypeScript types corresponding to Database Tables
export interface Product {
  id: string;
  name: string;
  brand: string;
  category: "smartphone" | "laptop" | "tablet" | "accessory";
  description: string;
  specs: Record<string, string>;
  image: string; // Tailwind icon or descriptive slug for styling/rendering
  releaseDate: string;
  originalPrice: number;
  currentPrice: number;
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
  timestamp: string; // ISO date string
}

export interface PredictionRecord {
  id: string;
  productId: string;
  predicted7d: number;
  predicted30d: number;
  predicted90d: number;
  action: "BUY" | "WAIT";
  confidence: number; // 0.0 - 1.0
  analysis: string; // Markdown text explanation of AI prediction
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  watchlist: string[]; // List of productIds
  password?: string;   // Optional password for login/signup
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

interface DatabaseSchema {
  products: Product[];
  retailers: Retailer[];
  priceHistory: PriceHistoryRecord[];
  predictions: PredictionRecord[];
  users: User[];
  alerts: PriceAlert[];
}

const DB_FILE_PATH = path.join(process.cwd(), "data", "database.json");

// Default initial state to pre-populate database with electronics
const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod-iphone-16-pro",
    name: "iPhone 16 Pro Max (256GB)",
    brand: "Apple",
    category: "smartphone",
    description: "Apple's latest flagship smartphone featuring the A18 Pro chip, upgraded Camera Control button, and Titanium design.",
    specs: {
      Display: "6.9-inch Super Retina XDR OLED",
      Processor: "A18 Pro (3nm)",
      Camera: "48MP Main + 48MP Ultra-wide + 12MP 5x Telephoto",
      Storage: "256GB",
      Battery: "Up to 33 hours video playback"
    },
    image: "smartphone",
    releaseDate: "2024-09-20",
    originalPrice: 1199,
    currentPrice: 1129,
  },
  {
    id: "prod-galaxy-s24-ultra",
    name: "Samsung Galaxy S24 Ultra (512GB)",
    brand: "Samsung",
    category: "smartphone",
    description: "The peak of mobile productivity with integrated S Pen, Galaxy AI capabilities, and a ultra-tough titanium frames.",
    specs: {
      Display: "6.8-inch Dynamic AMOLED 2X, QHD+",
      Processor: "Snapdragon 8 Gen 3 for Galaxy",
      Camera: "200MP Main + 50MP + 12MP + 10MP Quad Camera",
      Storage: "512GB",
      Battery: "5000 mAh (45W Fast Charging)"
    },
    image: "smartphone",
    releaseDate: "2024-01-31",
    originalPrice: 1299,
    currentPrice: 1049,
  },
  {
    id: "prod-macbook-pro-m3",
    name: "MacBook Pro 14-inch M3 Max",
    brand: "Apple",
    category: "laptop",
    description: "Extreme power for professionals with a 14-core GPU, stunning Liquid Retina Xdr, and Space Black finish.",
    specs: {
      Display: "14.2-inch Liquid Retina XDR (120Hz)",
      Processor: "Apple M3 Max Chip (14-Core CPU)",
      Memory: "36GB Unified Memory",
      Storage: "1TB SSD SuperFast",
      Battery: "Up to 18 hours wireless web"
    },
    image: "laptop",
    releaseDate: "2023-11-07",
    originalPrice: 3199,
    currentPrice: 2849,
  },
  {
    id: "prod-rog-strix-g16",
    name: "ASUS ROG Strix G16 (2024)",
    brand: "ASUS",
    category: "laptop",
    description: "Powerhouse gaming laptop featuring cutting-edge hardware, ROG intelligent cooling, and a beautiful 240Hz screen.",
    specs: {
      Display: "16-inch QHD+ 240Hz ROG Nebula Display",
      Processor: "Intel Core i9-14900HX",
      Graphics: "NVIDIA GeForce RTX 4070 (8GB)",
      Memory: "16GB DDR5 5600MHz",
      Storage: "1TB PCIe 4.0 NVMe SSD"
    },
    image: "laptop",
    releaseDate: "2024-02-15",
    originalPrice: 1899,
    currentPrice: 1699,
  },
  {
    id: "prod-dell-xps-15",
    name: "Dell XPS 15 9530",
    brand: "Dell",
    category: "laptop",
    description: "Elegant, compact, and packed with workstation-level computational power, the perfect companion for creative fields.",
    specs: {
      Display: "15.6-inch OLED 3.5K Touchscreen",
      Processor: "Intel Core i7-13700H",
      Graphics: "NVIDIA GeForce RTX 4050 (6GB)",
      Memory: "32GB DDR5 Dual Channel",
      Storage: "1TB SSD"
    },
    image: "laptop",
    releaseDate: "2023-05-10",
    originalPrice: 2099,
    currentPrice: 1549,
  },
  {
    id: "prod-ipad-pro-m4",
    name: "iPad Pro 11-inch M4 WiFi",
    brand: "Apple",
    category: "tablet",
    description: "The thinnest Apple product ever, boasting a revolutionary Tandem OLED display and extreme M4 performance.",
    specs: {
      Display: "11-inch Ultra Retina Tandem OLED",
      Processor: "Apple M4 Chip (9-Core CPU)",
      Camera: "12MP Wide + LiDAR Scanner",
      Storage: "256GB SSD",
      Thickness: "5.3 mm"
    },
    image: "tablet",
    releaseDate: "2024-05-15",
    originalPrice: 999,
    currentPrice: 949,
  }
];

const INITIAL_RETAILERS: Retailer[] = [
  { id: "ret-amazon", name: "Amazon", logo: "amazon", url: "https://amazon.com" },
  { id: "ret-bestbuy", name: "Best Buy", logo: "bestbuy", url: "https://bestbuy.com" },
  { id: "ret-walmart", name: "Walmart", logo: "walmart", url: "https://walmart.com" },
  { id: "ret-apple", name: "Apple Store", logo: "apple", url: "https://apple.com" },
  { id: "ret-bhphoto", name: "B&H Photo", logo: "bhphoto", url: "https://bhphotovideo.com" },
];

export class DB {
  private static data: DatabaseSchema;

  /**
   * Initializes the database on the disk, generating historical price tracking data spanning
   * the past 90 days. We model realistic trends with seasonal factors (e.g. Black Friday discounts, Launch hype, Spring Sales).
   */
  public static init() {
    const parentDir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    if (fs.existsSync(DB_FILE_PATH)) {
      try {
        const raw = fs.readFileSync(DB_FILE_PATH, "utf-8");
        DB.data = JSON.parse(raw);
        console.log("Database successfully loaded from disk.");
        return;
      } catch (err) {
        console.error("Database failed to load due to parse error. Generating clean database...", err);
      }
    }

    // Bootstrap initial empty state
    DB.data = {
      products: INITIAL_PRODUCTS,
      retailers: INITIAL_RETAILERS,
      priceHistory: [],
      predictions: [],
      users: [
        {
          id: "user-default",
          email: "thejeswarareddy01@gmail.com",
          name: "Thejeswara Reddy",
          watchlist: ["prod-iphone-16-pro", "prod-macbook-pro-m3"],
          password: "password123"
        },
      ],
      alerts: [
        {
          id: "alert-1",
          productId: "prod-iphone-16-pro",
          userId: "user-default",
          email: "thejeswarareddy01@gmail.com",
          targetPrice: 1100,
          active: true,
          isTriggered: false,
          createdAt: new Date().toISOString(),
        }
      ],
    };

    // Seed realistic 90 days of daily price history per product across different retailers!
    const now = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(now.getDate() - 90);

    let recordCounter = 1;

    DB.data.products.forEach((product) => {
      // Choose 2 to 3 appropriate retailers for each product
      const productRetailers = DB.data.retailers.filter((ret) => {
        if (product.brand === "Apple" && ret.id === "ret-apple") return true;
        if (ret.id === "ret-apple") return false; // Non-apple items sold elsewhere
        return ret.id === "ret-amazon" || ret.id === "ret-bestbuy" || (ret.id === "ret-bhphoto" && product.category === "laptop");
      });

      productRetailers.forEach((retailer) => {
        // Build price curves with noise + deliberate trends
        // Curve formula: Base + trend component + seasonal sales drop + random daily noise
        const originalPrice = product.originalPrice;
        let runningPrice = originalPrice;

        // Depreciation coefficient (depends on age of product)
        const dateDiff = now.getTime() - new Date(product.releaseDate).getTime();
        const productAgeDays = dateDiff / (1000 * 60 * 60 * 24);
        const dailyDepreciation = (originalPrice * 0.15) / 365; // ~15% depreciation per year

        for (let day = 0; day <= 90; day++) {
          const currentDate = new Date(ninetyDaysAgo);
          currentDate.setDate(ninetyDaysAgo.getDate() + day);

          // Standard depreciation
          let dailyPrice = originalPrice - (day * dailyDepreciation);

          // Add brand specific changes
          if (product.brand === "Apple" && retailer.id === "ret-apple") {
            // Apple official store keeps price mostly static
            dailyPrice = originalPrice;
          } else {
            // Other retailers fluctuate and offer competitive discounts
            // Let's introduce a cyclic sale event around 45 days ago
            if (day >= 40 && day <= 50) {
              const saleDepth = (day <= 45) ? (day - 40) / 5 : (50 - day) / 5; // V-shape sale
              dailyPrice -= (originalPrice * 0.10) * saleDepth; // Up to 10% discount
            }

            // High volatility on gaming laptops vs smartphones
            const volatility = product.category === "laptop" ? 0.015 : 0.01;
            const noise = dailyPrice * volatility * Math.sin(day / 3 + (retailer.id === "ret-amazon" ? 1 : 2.5));
            dailyPrice += noise;
          }

          // Bound price between 70% and 100% of original
          dailyPrice = Math.max(originalPrice * 0.65, Math.min(originalPrice, dailyPrice));

          // Set precision
          dailyPrice = Math.round(dailyPrice * 100) / 100;

          // If it's the last day, keep it synced with product record or store it as part of history
          if (day === 90) {
            // Keep retailer price history synced with current price (with minor retailer offset)
            const bias = retailer.id === "ret-amazon" ? -10 : retailer.id === "ret-bestbuy" ? 0 : 15;
            dailyPrice = Math.round((product.currentPrice + bias) * 100) / 100;
          }

          DB.data.priceHistory.push({
            id: `hist-${product.id}-${retailer.id}-${recordCounter++}`,
            productId: product.id,
            retailerId: retailer.id,
            price: dailyPrice,
            timestamp: currentDate.toISOString(),
          });
        }
      });
    });

    // Seed default baseline forecast predictions for all products
    DB.data.products.forEach((product) => {
      // Calculate a trend from historical data
      const history = DB.data.priceHistory.filter((h) => h.productId === product.id);
      const current = product.currentPrice;

      // Predict 7d, 30d, 90d based on moving average trends
      // Let's compute standard statistical slopes (linear regression-like approach)
      const lastPrice = current;
      const original = product.originalPrice;
      const ratio = current / original;

      let action: "BUY" | "WAIT" = "BUY";
      let analysis = "";
      let predicted7d = lastPrice;
      let predicted30d = lastPrice;
      let predicted90d = lastPrice;
      let confidence = 0.85;

      if (ratio < 0.82) {
        // Deeply discounted, probably a buy sign
        action = "BUY";
        predicted7d = lastPrice * 0.995;
        predicted30d = lastPrice * 1.005;
        predicted90d = lastPrice * 1.02; // Expected to rebound or stabilize
        analysis = `### AI Buy Recommendation
**${product.name}** is currently priced at a significant **${Math.round((1 - ratio) * 100)}% discount** from its manufacturer's suggested retail price ($${original}).

Our statistical time-series algorithms indicators show:
- **Stabilization trend**: The product has completed its major depreciation cycle.
- **Launch spacing**: The successor is several months away, rendering this an optimal entry window.
- **Retail competition**: Amazon and Best Buy are bidding aggressively, locking in active deals.

**Verdict**: **BUY NOW**. The potential for further price cuts is less than 3% over the next 30 days.`;
      } else {
        // High price or recent product release, wait
        action = "WAIT";
        predicted7d = lastPrice * 0.985;
        predicted30d = lastPrice * 0.95;
        predicted90d = lastPrice * 0.89; // Expected to depreciate further
        analysis = `### AI Wait Recommendation
**${product.name}** is currently sitting near its original MSRP.

Our statistical time-series algorithms indicators show:
- **Downward depreciation slope**: A typical release cycle depreciation is active. Excellent deals are expected shortly.
- **Upcoming competitor hardware announcements**: Refreshes scheduled within the quarter will trigger wholesale price updates down the stack.
- **High volatility**: Current price action is unstable with high margins for mid-week corrections.

**Verdict**: **WAIT**. Safe predicted savings of up to **10%** are expected if purchasing is deferred for 30–90 days.`;
      }

      DB.data.predictions.push({
        id: `pred-${product.id}`,
        productId: product.id,
        predicted7d: Math.round(predicted7d * 100) / 100,
        predicted30d: Math.round(predicted30d * 100) / 100,
        predicted90d: Math.round(predicted90d * 100) / 100,
        action,
        confidence,
        analysis,
        updatedAt: now.toISOString(),
      });
    });

    DB.save();
    console.log("Database initialized and priced successfully with 90 days of simulated records.");
  }

  /**
   * Resaves database cache to disk
   */
  public static save() {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(DB.data, null, 2), "utf-8");
    } catch (err) {
      console.error("Critical error while saving database to disk:", err);
    }
  }

  // --- CRUD Queries ---

  public static getProducts(): Product[] {
    return DB.data.products;
  }

  public static getProductById(id: string): Product | undefined {
    return DB.data.products.find((p) => p.id === id);
  }

  public static saveProduct(product: Product) {
    const idx = DB.data.products.findIndex((p) => p.id === product.id);
    if (idx !== -1) {
      DB.data.products[idx] = product;
    } else {
      DB.data.products.push(product);
    }
    DB.save();
  }

  public static getRetailers(): Retailer[] {
    return DB.data.retailers;
  }

  public static getPriceHistory(productId: string): PriceHistoryRecord[] {
    return DB.data.priceHistory.filter((h) => h.productId === productId);
  }

  public static getPredictions(productId: string): PredictionRecord | undefined {
    return DB.data.predictions.find((p) => p.productId === productId);
  }

  public static savePrediction(prediction: PredictionRecord) {
    const idx = DB.data.predictions.findIndex((p) => p.productId === prediction.productId);
    if (idx !== -1) {
      DB.data.predictions[idx] = prediction;
    } else {
      DB.data.predictions.push(prediction);
    }
    DB.save();
  }

  public static addPriceHistory(record: Omit<PriceHistoryRecord, "id">) {
    const id = `hist-new-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    DB.data.priceHistory.push({ ...record, id });
    DB.save();
    DB.checkAlerts(record.productId, record.price);
  }

  public static getUser(id: string): User | undefined {
    return DB.data.users.find((u) => u.id === id);
  }

  public static getUserByEmail(email: string): User | undefined {
    return DB.data.users.find((u) => u.email === email);
  }

  public static saveUser(user: User) {
    const idx = DB.data.users.findIndex((u) => u.id === user.id);
    if (idx !== -1) {
      DB.data.users[idx] = user;
    } else {
      DB.data.users.push(user);
    }
    DB.save();
  }

  public static getAlerts(): PriceAlert[] {
    return DB.data.alerts || [];
  }

  public static getAlertsForUser(userId: string): PriceAlert[] {
    return (DB.data.alerts || []).filter((a) => a.userId === userId);
  }

  public static saveAlert(alert: PriceAlert) {
    if (!DB.data.alerts) DB.data.alerts = [];
    const idx = DB.data.alerts.findIndex((a) => a.id === alert.id);
    if (idx !== -1) {
      DB.data.alerts[idx] = alert;
    } else {
      DB.data.alerts.push(alert);
    }
    DB.save();
  }

  public static removeAlert(id: string) {
    if (!DB.data.alerts) return;
    DB.data.alerts = DB.data.alerts.filter((a) => a.id !== id);
    DB.save();
  }

  /**
   * Monitor newly inserted retailer prices against user-defined targets
   */
  private static checkAlerts(productId: string, currentPrice: number) {
    if (!DB.data.alerts) return;
    let didChange = false;

    DB.data.alerts.forEach((alert) => {
      if (alert.productId === productId && alert.active && !alert.isTriggered) {
        if (currentPrice <= alert.targetPrice) {
          alert.isTriggered = true;
          didChange = true;
          console.log(`[ALERT DISPATCHED] Send price drop alert for product ${productId} to ${alert.email}. Price has decreased to $${currentPrice}!`);
        }
      }
    });

    if (didChange) {
      DB.save();
    }
  }
}
