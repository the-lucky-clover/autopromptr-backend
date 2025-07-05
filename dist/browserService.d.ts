interface LaunchOptions {
    url: string;
    headless?: boolean;
}
export declare function launchBrowser({ url, headless }: LaunchOptions): Promise<{
    title: string;
    screenshotPath: string;
    url: string;
}>;
export {};
