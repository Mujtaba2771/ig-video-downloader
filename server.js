require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v23.0";

app.use(express.json({ limit: "32kb" }));
app.use(express.static(path.join(__dirname, "public")));

function extractInstagramId(value) {
  const s = String(value || "").trim();

  // Accept a raw Instagram media ID.
  if (/^\d+$/.test(s)) return s;

  // This starter intentionally does not scrape Instagram pages to discover IDs.
  // For production, resolve a permalink through an authorized Meta API flow
  // that your app/account is permitted to use.
  return null;
}

async function graphGet(mediaId) {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token || token.includes("PASTE_YOUR")) {
    throw new Error("META_ACCESS_TOKEN is not configured on the server.");
  }

  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(mediaId)}`);
  url.searchParams.set("fields", "id,media_type,media_url,thumbnail_url,permalink,caption,timestamp");
  url.searchParams.set("access_token", token);

  const r = await fetch(url);
  const data = await r.json();

  if (!r.ok || data.error) {
    const msg = data?.error?.message || `Graph API returned HTTP ${r.status}`;
    throw new Error(msg);
  }
  return data;
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "ig-video-downloader" });
});

app.post("/api/resolve", async (req, res) => {
  try {
    const mediaId = extractInstagramId(req.body?.url);
    if (!mediaId) {
      return res.status(400).json({
        ok: false,
        error: "This backend accepts an authorized Instagram media ID. A public Instagram permalink cannot be scraped by this starter."
      });
    }

    const media = await graphGet(mediaId);

    if (!["VIDEO", "REELS"].includes(String(media.media_type).toUpperCase())) {
      return res.status(400).json({ ok: false, error: "The selected media is not a video/reel." });
    }

    res.json({
      ok: true,
      media: {
        id: media.id,
        type: media.media_type,
        permalink: media.permalink || null,
        mediaUrl: media.media_url || null,
        thumbnailUrl: media.thumbnail_url || null,
        timestamp: media.timestamp || null
      }
    });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
});

app.get("/api/download", async (req, res) => {
  if (process.env.ENABLE_PROXY_DOWNLOAD !== "true") {
    return res.status(403).json({
      ok: false,
      error: "Proxy downloads are disabled. Set ENABLE_PROXY_DOWNLOAD=true after reviewing your API/provider terms."
    });
  }

  try {
    const mediaId = extractInstagramId(req.query?.id);
    if (!mediaId) return res.status(400).json({ ok: false, error: "Valid media ID required." });

    const media = await graphGet(mediaId);
    if (!media.media_url) return res.status(404).json({ ok: false, error: "No downloadable media URL was returned." });

    const upstream = await fetch(media.media_url);
    if (!upstream.ok || !upstream.body) {
      return res.status(502).json({ ok: false, error: "Unable to retrieve the authorized media URL." });
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="instagram-${mediaId}.mp4"`);

    const reader = upstream.body.getReader();
    const { Readable } = require("stream");
    Readable.from((async function* () {
      while (true) {
        const { done, value } = await reader.read();
        if (done) return;
        yield value;
      }
    })()).pipe(res);
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`IG Downloader running at http://localhost:${PORT}`);
});
