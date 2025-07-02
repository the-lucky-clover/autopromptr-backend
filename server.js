// server.js
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import { processBatch } from "./batchProcessor.js";
import logger from "./logger.js";

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = [
  "https://bolt-diy-34-1751466323377.vercel.app", // Your Vercel domain
  "https://autopromptr.com",
  "https://id-preview--1fec766e-41d8-4e0e-9e5c-277ce2efbe11.lovable.app",
  "https://lovable.dev",
  "http://localhost:3000",
  "http://localhost:5173",
  "https://k03e2io1v3fx9wvj0vr8qd5q58o56n-fkdo--8080--6e337437.local-credentialless.webcontainer-api.io"
];

const lovableProjectRegex = /.*\.lovableproject\.com$/;

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like healthchecks, curl, Electron apps)
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin) || lovableProjectRegex.test(origin)) {
      return callback(null, true);
    }
    console.error(`Blocked by CORS: ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "autopromptr-backend",
    version: "2.0.0"
  });
});

app.get("/test", (req, res) => {
  res.json({
    message: "AutoPromptr Backend is running!",
    timestamp: new Date().toISOString(),
    nodeVersion: process.version
  });
});

app.post("/api/run-batch", async (req, res) => {
  try {
    const { batch, platform, wait_for_idle, max_retries } = req.body;

    if (!batch || !batch.prompt) {
      logger.warn("Missing required fields in batch", {
        ip: req.ip
      });
      return res.status(400).json({
        error: "Missing required fields: batch.prompt is required",
        received: req.body
      });
    }

    logger.info("Batch request received", {
      batchId: batch.id,
      platform,
      ip: req.ip
    });

    const result = await processBatch(batch, platform, {
      waitForIdle: wait_for_idle,
      maxRetries: max_retries,
      ip: req.ip
    });

    logger.info("Batch processed successfully", {
      batchId: batch.id,
      platform,
      ip: req.ip
    });

    res.json(result);
  } catch (error) {
    logger.error("Batch processing error", {
      message: error.message,
      ip: req.ip
    });
    res.status(500).json({
      error: "Batch processing failed",
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get("/", (req, res) => {
  res.json({
    message: "AutoPromptr Backend is running!",
    timestamp: new Date().toISOString(),
    nodeVersion: process.version
  });
});

app.options("*", (req, res) => {
  res.sendStatus(200);
});

// Debug endpoint to list Puppeteer Chrome cache directory files
app.get("/debug/chrome-path", (req, res) => {
  const basePath = "/opt/render/.cache/puppeteer/chrome/linux-121.0.6167.85/";
  fs.readdir(basePath, (err, files) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ basePath, files });
  });
});

// Debug endpoint to list installed Puppeteer revisions and executable paths
app.get("/debug/chrome-executable-path", async (req, res) => {
  try {
    const browserFetcher = puppeteer.createBrowserFetcher();
    const localRevisions = await browserFetcher.localRevisions();
    const executablePaths = localRevisions.map(
      rev => browserFetcher.revisionInfo(rev).executablePath
    );

    res.json({
      message: "Puppeteer installed revisions and executable paths",
      localRevisions,
      executablePaths
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Debug endpoint to get Puppeteer's runtime executable path
app.get("/debug/puppeteer-executable", async (req, res) => {
  try {
    const executablePath = puppeteer.executablePath();
    res.json({ executablePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  logger.info(`AutoPromptr backend listening on port ${port}`);
});
