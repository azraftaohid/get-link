// default open-next.config.ts file created by @opennextjs/cloudflare
import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";
import d1TagCache from "@opennextjs/cloudflare/d1-tag-cache";
import kvIncrementalCache from "@opennextjs/cloudflare/kv-cache";

export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
  tagCache: d1TagCache,
});
