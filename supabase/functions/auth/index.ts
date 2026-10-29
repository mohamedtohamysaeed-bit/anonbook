// Verifies a wallet signature and returns a short-lived JWT carrying the wallet address.
// Row-level security reads that claim, so users can only write rows as themselves.
import { verifyMessage } from "npm:viem@2";
import { SignJWT } from "npm:jose@5";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { address, message, signature } = await req.json();
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error("bad address");

    const m = /^AnonBook login\nWallet: (0x[0-9a-f]{40})\nIssued: (\d+)$/.exec(message);
    if (!m || m[1] !== address.toLowerCase()) throw new Error("bad message");
    if (Math.abs(Date.now() - Number(m[2])) > 5 * 60 * 1000) throw new Error("expired");

    const ok = await verifyMessage({ address, message, signature });
    if (!ok) throw new Error("bad signature");

    const exp = Math.floor(Date.now() / 1000) + 24 * 3600;
    const secret = new TextEncoder().encode(Deno.env.get("JWT_SECRET"));
    const token = await new SignJWT({ role: "authenticated", wallet: address.toLowerCase() })
      .setProtectedHeader({ alg: "HS256" })
      .setAudience("authenticated")
      .setIssuedAt()
      .setExpirationTime(exp)
      .sign(secret);

    return json({ token, exp: exp * 1000 });
  } catch (e) {
    return json({ error: String((e as Error).message) }, 401);
  }
});
