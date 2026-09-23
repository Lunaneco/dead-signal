# Security and privacy

## Data flow

DEAD SIGNAL is a static, client-side game. There is no account system, shared leaderboard, database, upload endpoint or score submission API. Camera access is requested only after selecting camera play. Audio capture is disabled. Camera frames and hand landmarks are processed in the browser by the bundled MediaPipe model; they are not uploaded or written to persistent storage. Tracks are stopped when leaving camera play or the page.

Only each game/input mode's personal best and minimal game statistics are saved in browser localStorage. There are at most four records, without names, user IDs, camera data or shot logs. Record values are validated and rendered using textContent. Invalid or unavailable storage does not prevent play. Local records can be edited by the browser user and are not an anti-cheat mechanism.

All game assets, pre-generated music, fonts, JavaScript and WASM are served from the same origin. The app includes no analytics or third-party runtime requests. The static hosting provider may independently retain routine HTTP access logs. GitHub Pages project sites under one account share an origin; localStorage is not suitable for storing secrets.

## Release review — 2026-09-23

- Removed the previous shared-ranking API, database code, name entry and replay uploads from the public application.
- Excluded private deployment metadata, local databases, environment files, credentials, logs and generated legacy server output from Git and from the Pages build. Old local data is not migrated or published.
- Inspected application code for external transports, camera lifecycle, untrusted DOM insertion and local-storage handling.
- Added a CSP to the HTML: scripts, fonts and connections are restricted to the same origin; object, frame and form destinations are disabled. `wasm-unsafe-eval` is required by the bundled model. Inline CSS remains allowed for the game's styles and animations; arbitrary inline JavaScript and JavaScript `eval` are not allowed. Referrers are disabled.
- The loopback-only development server additionally sends frame-ancestor, no-sniff, frame-denial and camera-only permission headers, rejects writes and foreign Host headers, and resolves real paths before serving files. GitHub Pages does not support arbitrary custom response headers; only the HTML-supported policies are portable to that host.
- Queried the [GitHub Advisory Database](https://docs.github.com/en/rest/security-advisories/global-advisories) for the exact runtime npm versions `three@0.170.0` and `@mediapipe/tasks-vision@0.10.21`: neither query returned an applicable advisory at review time. This is not a guarantee of absence of unknown vulnerabilities.
- Compared all six vendored JavaScript/WASM files against their official npm packages. Package SHA-512 integrity and the individual files match. The Three.js file is the official minified module. The application has no npm build/runtime dependencies to install.
- Browser-tested hand-model initialization and blank-image inference with the CSP enabled, without requesting a camera. Tested personal-best persistence, malformed storage, quota errors, shared API removal and development-server path/host/method restrictions.

This is a focused source review and automated/browser verification, not a formal penetration test. Real camera compatibility depends on the browser, GPU and device. Future edits and dependency updates need renewed review.

Music generation takes place separately in the local LUNA MUSIC application. Only finished audio and a sanitized provenance manifest enter the release; model weights, generation logs and the user’s music library stay local. Music playback fetches files from the same origin and does not use an external generation API.

## Maintainer checks

Run `npm test`, `npm run build` and `npm run check:release` before committing a public release. The release check rejects private file paths, oversized GitHub files and common credential patterns; it complements manual review and cannot recognize every possible secret.

Do not publish camera recordings, local storage exports, local databases or environment files in bug reports. Do not put credentials in client JavaScript. Public issues should describe reproducible behavior without including private data.
