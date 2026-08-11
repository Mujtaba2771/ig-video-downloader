const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v23.0";
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "IG Video Downloader"
  });
});

app.post("/api/resolve", async (req, res) => {
  try {
    const mediaId = String(req.body?.url || "").trim();

    if (!mediaId) {
      return res.status(400).json({
        ok: false,
        error: "Media ID is required."
      });
    }

    if (!ACCESS_TOKEN) {
      return res.status(500).json({
        ok: false,
        error: "Server API token is not configured."
      });
    }

    const url =
      `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(mediaId)}` +
      `?fields=id,media_type,media_url,thumbnail_url,permalink` +
      `&access_token=${encodeURIComponent(ACCESS_TOKEN)}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || data.error) {
      return res.status(400).json({
        ok: false,
        error: data.error?.message || "Unable to access this media."
      });
    }

    return res.json({
      ok: true,
      media: {
        id: data.id,
        type: data.media_type,
        mediaUrl: data.media_url || null,
        thumbnailUrl: data.thumbnail_url || null,
        permalink: data.permalink || null
      }
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: "Server error."
    });
  }
});

app.get("/api/download", async (req, res) => {
  try {
    const id = String(req.query.id || "").trim();

    if (!id) {
      return res.status(400).send("Media ID is required.");
    }

    if (!ACCESS_TOKEN) {
      return res.status(500).send("Server API token is not configured.");
    }

    const apiUrl =
      `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(id)}` +
      `?fields=id,media_type,media_url` +
      `&access_token=${encodeURIComponent(ACCESS_TOKEN)}`;

    const apiResponse = await fetch(apiUrl);
    const data = await apiResponse.json();

    if (!apiResponse.ok || !data.media_url) {
      return res.status(400).send(
        data.error?.message || "Video is not available."
      );
    }

    const mediaResponse = await fetch(data.media_url);

    if (!mediaResponse.ok || !mediaResponse.body) {
      return res.status(502).send("Unable to fetch the media.");
    }

    res.setHeader(
      "Content-Type",
      mediaResponse.headers.get("content-type") ||
      "application/octet-stream"
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="instagram-video.mp4"'
    );

    const reader = mediaResponse.body.getReader();

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      res.write(Buffer.from(value));
    }

    res.end();

  } catch (error) {
    console.error(error);

    if (!res.headersSent) {
      res.status(500).send("Download failed.");
    } else {
      res.end();
    }
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
