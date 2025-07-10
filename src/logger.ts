import winston, { LogEntry } from "winston";
import Transport from "winston-transport";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";

// Only initialize Supabase if credentials are provided
let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn("SUPABASE_URL or SUPABASE_KEY not provided. Supabase logging disabled.");
}

// Custom Winston transport for Supabase
class SupabaseTransport extends Transport {
  constructor(opts?: Transport.TransportStreamOptions) {
    super(opts);
  }

  log(info: LogEntry, callback: () => void) {
    setImmediate(() => {
      this.emit("logged", info);
    });

    // Only log to Supabase if client is available
    if (!supabase) {
      callback();
      return;
    }

    // Insert log into Supabase
    const insertPromise = supabase
      .from("logs")
      .insert([
        {
          level: info.level,
          message: info.message,
          timestamp: new Date().toISOString(),
          meta: JSON.stringify(info),
        },
      ]);

    // Handle the promise properly
    Promise.resolve(insertPromise)
      .then(() => {
        callback();
      })
      .catch((error: any) => {
        console.error("Failed to log to Supabase:", error);
        callback();
      });
  }
}

// Create Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "autopromptr-backend" },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new SupabaseTransport(),
  ],
});

export default logger;
