# IG Video Downloader — full-stack starter

## What is included
- Responsive frontend
- Node.js + Express backend
- `.env.example` for the Meta/Instagram access token
- `/api/health`, `/api/resolve`, and `/api/download`
- Server-side token handling
- No Instagram password/cookie collection
- No scraping/private-account/login bypass

## Run locally
1. Install Node.js 18+.
2. Copy `.env.example` to `.env`.
3. Put your authorized Meta/Instagram Graph API access token in `.env`.
4. Run `npm install`
5. Run `npm start`
6. Open `http://localhost:3000`

## Important API limitation
This implementation deliberately uses an authorized Graph API media ID rather than scraping arbitrary Instagram URLs. Meta's API permissions and eligible account types determine which media can be accessed. A public Instagram page URL by itself does not automatically give an application the right to fetch its video file.

## Production
Deploy the Node app to a Node-compatible host. Set environment variables there; do not upload `.env` or expose the access token in frontend code.

If you want a public URL downloader for arbitrary Instagram links, you would need a third-party service/API whose terms explicitly permit that use. Review its copyright, privacy, rate-limit, and platform-terms requirements before integrating it.
