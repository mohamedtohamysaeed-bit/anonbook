import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Optional packages (pino-pretty, encoding, ...) are replaced in next.config.js, so nothing is left
// for OpenNext's bundler to resolve. Keep this config minimal.
export default defineCloudflareConfig({});
