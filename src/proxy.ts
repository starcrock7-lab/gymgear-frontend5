import { NextResponse, type NextRequest } from "next/server";

/* Password for /stats (the link-click counts). Set STATS_PASSWORD in Vercel;
   the browser asks for it once. Without it the page stays closed. The
   username can be anything. */
export function proxy(req: NextRequest) {
  const pass = process.env.STATS_PASSWORD;
  const auth = req.headers.get("authorization") ?? "";
  const given = auth.startsWith("Basic ") ? atob(auth.slice(6)).split(":").slice(1).join(":") : null;
  if (pass && given === pass) return NextResponse.next();
  return new NextResponse(pass ? "Password needed." : "Set STATS_PASSWORD in Vercel to open this page.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="GymGear stats"' },
  });
}

export const config = { matcher: "/stats" };
