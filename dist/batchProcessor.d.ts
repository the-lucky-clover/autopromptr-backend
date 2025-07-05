export interface Batch {
    id?: string;
    targetUrl?: string;
    prompt: string;
    [key: string]: any;
}
export interface ProcessOptions {
    batchId?: string;
    ip?: string;
    waitForIdle?: boolean;
    maxRetries?: number;
    retryDelay?: number;
}
export declare function processBatch(batch: Batch, options: ProcessOptions): Promise;
