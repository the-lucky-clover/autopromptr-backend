import winston, { LogEntry } from "winston";
import Transport from "winston-transport";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_KEY environment variables");
}

// Initialize Supabase client
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Custom Winston transport for Supabase
class SupabaseTransport extends Transport {
  constructor(opts?: Transport.TransportStreamOptions) {
    super(opts);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async log(info: any, callback: () => void) {
    setImmediate(() => {
      this.emit("logged", info);
    });

    try {
      const { batchId, platform, ip } = info;

      await supabase.from("logs").insert({
        level: info.level,
        message: info.message,
        batch_id: batchId || null,
        platform: platform || null,
        ip_address: ip || null,
        timestamp: new Date().toISOString(),
        service: "autopromptr-backend",
      });
    } catch (err: any) {
      console.error("❌ Failed to log to Supabase:", err.message || err);
    }

    callback();
  }
}

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
    new SupabaseTransport(),
  ],
});

export default logger;
