import winston from "winston";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Supabase Winston transport
const supabaseTransport = () => ({
  log: async (info, callback) => {
    try {
      // Destructure extra fields if present
      const { batchId, platform, ip } = info;

      await supabase.from("logs").insert({
        level: info.level,
        message: info.message,
        batch_id: batchId || null,
        platform: platform || null,
        ip_address: ip || null,
        timestamp: new Date().toISOString(),
        service: "autopromptr-backend"
      });
    } catch (err) {
      console.error("❌ Failed to log to Supabase:", err.message);
    }
    callback();
  }
});

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
    supabaseTransport() // pushes logs to Supabase
  ]
});

export default logger;
