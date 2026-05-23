import "dotenv/config";

function int(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  port: int("PORT", 7717),
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:8080")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  credKey: process.env.CRED_KEY ?? "dev-only-change-me-32chars-min!!",
  queryTimeoutMs: int("QUERY_TIMEOUT_MS", 30_000),
  safeMode: (process.env.SAFE_MODE ?? "true").toLowerCase() === "true",
};