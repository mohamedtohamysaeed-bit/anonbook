// Pins an uploaded file to IPFS through Pinata. The Pinata JWT never leaves the server.
import { jwtVerify } from "npm:jose@5";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 25 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer /, "");
    const secret = new TextEncoder().encode(Deno.env.get("JWT_SECRET"));
    const { payload } = await jwtVerify(bearer, secret, { audience: "authenticated" }).catch(() => {
      throw Object.assign(new Error("unauthorized"), { status: 401 });
    });
    if (!payload.wallet) throw Object.assign(new Error("unauthorized"), { status: 401 });

    const file = (await req.formData()).get("file");
    if (!(file instanceof File)) throw Object.assign(new Error("file missing"), { status: 400 });

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) throw Object.assign(new Error("only images and videos"), { status: 415 });
    if (file.size > (isVideo ? MAX_VIDEO : MAX_IMAGE)) throw Object.assign(new Error("file too large"), { status: 413 });

    const out = new FormData();
    out.append("file", file, file.name);
    out.append("pinataMetadata", JSON.stringify({ name: `anonbook-${payload.wallet}-${Date.now()}` }));
    out.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("PINATA_JWT")}` },
      body: out,
    });
    if (!res.ok) throw Object.assign(new Error("pinning failed"), { status: 502 });
    const { IpfsHash } = await res.json();
    return json({ cid: IpfsHash });
  } catch (e) {
    return json({ error: (e as Error).message }, (e as any).status || 500);
  }
});
