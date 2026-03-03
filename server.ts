import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Lazy load DB to prevent crash on module load if filesystem is restricted
let dbInstance: any = null;
function getDB() {
  if (!dbInstance) {
    try {
      const dbPath = process.env.VERCEL ? "/tmp/lottery.db" : "lottery.db";
      dbInstance = new Database(dbPath);
      
      // Initialize DB
      dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS user_games (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lottery_type TEXT NOT NULL,
          numbers TEXT NOT NULL,
          draw_number TEXT,
          teimosinha_draws INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Migration for existing DB
      try {
        dbInstance.exec("ALTER TABLE user_games ADD COLUMN teimosinha_draws INTEGER DEFAULT 1");
      } catch (e) {
        // Column might already exist
      }
    } catch (err) {
      console.error("Critical DB Initialization Error:", err);
      // Return a mock object to prevent total crash if DB fails
      return {
        prepare: () => ({ 
          all: () => [], 
          run: () => ({ lastInsertRowid: 0 }) 
        })
      };
    }
  }
  return dbInstance;
}

app.use(express.json());

// API Routes
app.get("/api/games", (req, res) => {
  try {
    const db = getDB();
    const games = db.prepare("SELECT * FROM user_games ORDER BY created_at DESC").all();
    res.json(games.map((g: any) => ({
      ...g,
      numbers: JSON.parse(g.numbers)
    })));
  } catch (err) {
    console.error("DB Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch games" });
  }
});

app.post("/api/games", (req, res) => {
  const { lottery_type, numbers, draw_number, teimosinha_draws } = req.body;
  if (!lottery_type || !numbers) {
    return res.status(400).json({ error: "Missing data" });
  }
  try {
    const db = getDB();
    const stmt = db.prepare("INSERT INTO user_games (lottery_type, numbers, draw_number, teimosinha_draws) VALUES (?, ?, ?, ?)");
    const result = stmt.run(lottery_type, JSON.stringify(numbers), draw_number, teimosinha_draws || 1);
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    console.error("DB Save Error:", err);
    res.status(500).json({ error: "Failed to save game" });
  }
});

app.delete("/api/games/:id", (req, res) => {
  try {
    const db = getDB();
    db.prepare("DELETE FROM user_games WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("DB Delete Error:", err);
    res.status(500).json({ error: "Failed to delete game" });
  }
});

// Vite middleware for development (only if not on Vercel)
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const startVite = async () => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  };
  startVite();
} else {
  // In production/Vercel, static files are handled by Vercel configuration
  // but we keep this for local production testing
  app.use(express.static(path.join(__dirname, "dist")));
}

// Only listen if this file is run directly (not as a module on Vercel)
if (!process.env.VERCEL) {
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

export default app;
