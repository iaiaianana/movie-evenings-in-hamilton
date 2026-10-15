declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    ADMIN_CREDENTIALS?: string;
    TMDB_READ_TOKEN?: string;
    BUCKET?: R2Bucket;
  }
}
