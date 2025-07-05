import winston from "winston";
import Transport from "winston-transport";
import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_KEY environment variables");
}
// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);
// Custom Winston transport for Supabase
class SupabaseTransport extends Transport {
    constructor(opts) {
        super(opts);
    }
    async log(info, callback) {
        setImmediate(() => {
            this.emit("logged", info);
        });
        // Insert log into Supabase
        try {
            await supabase
                .from("logs")
                .insert([
                {
                    level: info.level,
                    message: info.message,
                    timestamp: new Date().toISOString(),
                    meta: JSON.stringify(info),
                },
            ]);
            callback();
        }
        catch (error) {
            console.error("Failed to log to Supabase:", error);
            callback();
        }
    }
}
// Create Winston logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json()),
    defaultMeta: { service: "autopromptr-backend" },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
        }),
        new SupabaseTransport(),
    ],
});
export default logger;
