import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("lottery.db");

// Initialize DB
db.exec(`
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
  db.exec("ALTER TABLE user_games ADD COLUMN teimosinha_draws INTEGER DEFAULT 1");
} catch (e) {
  // Column might already exist
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/games", (req, res) => {
    try {
      const games = db.prepare("SELECT * FROM user_games ORDER BY created_at DESC").all();
      res.json(games.map((g: any) => ({
        ...g,
        numbers: JSON.parse(g.numbers)
      })));
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch games" });
    }
  });

  app.post("/api/games", (req, res) => {
    const { lottery_type, numbers, draw_number, teimosinha_draws } = req.body;
    if (!lottery_type || !numbers) {
      return res.status(400).json({ error: "Missing data" });
    }
    try {
      const stmt = db.prepare("INSERT INTO user_games (lottery_type, numbers, draw_number, teimosinha_draws) VALUES (?, ?, ?, ?)");
      const result = stmt.run(lottery_type, JSON.stringify(numbers), draw_number, teimosinha_draws || 1);
      res.json({ id: result.lastInsertRowid });
    } catch (err) {
      res.status(500).json({ error: "Failed to save game" });
    }
  });

  app.delete("/api/games/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM user_games WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete game" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
