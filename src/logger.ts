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

  log(info: LogEntry, callback: () => void) {
    setImmediate(() => {
      this.emit("logged", info);
    });

    // Insert log into Supabase
    supabase
      .from("logs")
      .insert([
        {
          level: info.level,
          message: info.message,
          timestamp: new Date().toISOString(),
          meta: JSON.stringify(info),
        },
      ])
      .then(() => {
        callback();
      })
      .catch((error: any) => { // Explicitly type error as any
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
