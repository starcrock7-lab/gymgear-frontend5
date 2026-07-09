import type { NextConfig } from "next";

/* Security headers on every response (2026-07-09 security review). HSTS is
   added by Vercel on the custom domain; CSP is deliberately omitted — Next's
   inline runtime scripts would need nonce plumbing, revisit if we ever accept
   user-generated content. */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
