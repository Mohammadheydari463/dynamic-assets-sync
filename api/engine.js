export const config = { runtime: "edge" };

const SRV_KEY = (process.env.REMOTE_SERVICE_URL || "").replace(/\/$/, "");

const EXCLUDE_KEYS = new Set([
  "host", "connection", "keep-alive", "proxy-authenticate", 
  "proxy-authorization", "te", "trailer", "transfer-encoding", 
  "upgrade", "forwarded", "x-forwarded-host", "x-forwarded-proto", 
  "x-forwarded-port", "x-vercel-id", "x-vercel-forwarded-for"
]);

export default async function handleTask(req) {
  if (!SRV_KEY) {
    return new Response("Initialize Core...", { status: 200 });
  }

  const reqUrl = new URL(req.url);
  
  if (!reqUrl.pathname.startsWith("/v2/sync/")) {
    return new Response("Invalid API Endpoint", { status: 404 });
  }

  try {
    const finalUrl = SRV_KEY + reqUrl.pathname + reqUrl.search;
    const secureHeaders = new Headers();

    for (const [key, val] of req.headers) {
      if (EXCLUDE_KEYS.has(key.toLowerCase())) continue;
      secureHeaders.set(key, val);
    }

    secureHeaders.set("X-Edge-Sync-ID", Math.random().toString(36).substring(7));

    const response = await fetch(finalUrl, {
      method: req.method,
      headers: secureHeaders,
      body: !["GET", "HEAD"].includes(req.method) ? req.body : undefined,
      duplex: "half",
      redirect: "manual",
    });

    const cleanRes = new Response(response.body, response);
    cleanRes.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    
    return cleanRes;

  } catch (e) {
    return new Response("Internal Optimization Error", { status: 500 });
  }
}
