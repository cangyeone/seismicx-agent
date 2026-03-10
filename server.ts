import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { exec } from "child_process";

const db = new Database("seismo.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    time TEXT,
    latitude REAL,
    longitude REAL,
    depth REAL,
    magnitude REAL,
    magnitude_type TEXT,
    place TEXT,
    detection_method TEXT,
    status TEXT
  );

  CREATE TABLE IF NOT EXISTS knowledge_base (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT,
    content TEXT,
    tags TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS stations (
    network TEXT,
    station TEXT,
    latitude REAL,
    longitude REAL,
    elevation REAL,
    PRIMARY KEY (network, station)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/import/local", (req, res) => {
    const { path: filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: "Path is required" });

    exec(`python3 import_seismic.py "${filePath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return res.status(500).json({ error: "Failed to execute import script" });
      }
      try {
        const result = JSON.parse(stdout);
        if (result.error) {
          return res.status(400).json({ error: result.error });
        }
        res.json(result);
      } catch (e) {
        res.status(500).json({ error: "Failed to parse import script output" });
      }
    });
  });

  app.get("/api/events", (req, res) => {
    const events = db.prepare("SELECT * FROM events ORDER BY time DESC LIMIT 100").all();
    res.json(events);
  });

  app.post("/api/events", (req, res) => {
    const { id, time, latitude, longitude, depth, magnitude, magnitude_type, place, detection_method } = req.body;
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO events (id, time, latitude, longitude, depth, magnitude, magnitude_type, place, detection_method, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'detected')
    `);
    stmt.run(id, time, latitude, longitude, depth, magnitude, magnitude_type, place, detection_method);
    res.json({ success: true });
  });

  app.get("/api/knowledge", (req, res) => {
    const knowledge = db.prepare("SELECT * FROM knowledge_base").all();
    res.json(knowledge);
  });

  app.post("/api/knowledge", (req, res) => {
    const { topic, content, tags } = req.body;
    const stmt = db.prepare("INSERT INTO knowledge_base (topic, content, tags) VALUES (?, ?, ?)");
    stmt.run(topic, content, tags);
    res.json({ success: true });
  });

  app.post("/api/save-labels", (req, res) => {
    const { eventId, data, format, savePath } = req.body;
    if (!eventId || !data || !savePath) return res.status(400).json({ error: "Missing required fields" });

    try {
      if (!fs.existsSync(savePath)) {
        fs.mkdirSync(savePath, { recursive: true });
      }

      const filename = `seismic_labels_${eventId}_${new Date().getTime()}.${format}`;
      const fullPath = path.join(savePath, filename);
      
      let content = '';
      if (format === 'json') {
        content = JSON.stringify(data, null, 2);
      } else {
        content = JSON.stringify({ type: 'metadata', ...data.metadata }) + '\n';
        data.waveforms.forEach((w: any) => {
          content += JSON.stringify({ type: 'waveform', ...w }) + '\n';
        });
      }

      fs.writeFileSync(fullPath, content);
      res.json({ success: true, path: fullPath });
    } catch (error: any) {
      console.error("Save failed", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Proxy for FDSN services to avoid CORS
  app.get("/api/proxy/fdsn", async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send("URL is required");
    try {
      const response = await fetch(url as string);
      const data = await response.text();
      res.send(data);
    } catch (error) {
      res.status(500).send("Error fetching from FDSN");
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
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
