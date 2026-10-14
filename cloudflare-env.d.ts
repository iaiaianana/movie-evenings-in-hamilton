declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    ADMIN_CREDENTIALS?: string;
    BUCKET?: R2Bucket;
  }
}
