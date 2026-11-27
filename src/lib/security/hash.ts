import { createHmac } from "node:crypto";

/**
 * Keyed, one-way hash for identifiers we must compare but never store raw
 * (IP addresses, device ids). Without the secret the hashes cannot be reversed
 * by brute-forcing the small IPv4 space.
 */
export function hmacId(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url").slice(0, 32);
}
