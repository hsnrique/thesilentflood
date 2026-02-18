import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import { getCount, shiftVibe, findByFingerprint } from "./db";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

app.get("/api/count", async (_req, res) => {
  try {
    const count = await getCount();
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch count" });
  }
});

app.post("/api/check", async (req, res) => {
  try {
    const { fingerprint } = req.body;
    if (!fingerprint) {
      res.status(400).json({ error: "Missing fingerprint" });
      return;
    }

    const existing = await findByFingerprint(fingerprint);
    if (existing) {
      const count = await getCount();
      res.json({ shifted: true, id: existing.id, count });
    } else {
      res.json({ shifted: false });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to check fingerprint" });
  }
});

app.post("/api/shift", async (req, res) => {
  try {
    const { fingerprint } = req.body;
    if (!fingerprint) {
      res.status(400).json({ error: "Missing fingerprint" });
      return;
    }

    const id = await shiftVibe(fingerprint);
    const count = await getCount();
    res.json({ id, count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to shift" });
  }
});

app.get("/{*path}", (_req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is live on http://localhost:${PORT}`);
});
