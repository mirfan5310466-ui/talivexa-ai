# Android App & Google Play Preparation Guide (Talivexa AI)

1. **Host Over HTTPS:** Deploy `public/` and `server/` to an HTTPS host (such as Render, Railway, Fly.io, or a VPS with SSL). Android TWA/PWA requires HTTPS.
2. **Verify Manifest & Icons:** Ensure `/manifest.json`, `/sw.js`, `/assets/icons/icon-192x192.png`, and `/assets/icons/icon-512x512.png` load with HTTP 200.
3. **Wrap as Android App (TWA):** Use **PWABuilder** (`pwabuilder.com`) or **Bubblewrap CLI** with your live HTTPS URL to generate an Android project and signed `.aab` (Android App Bundle).
4. **Google Play Console:** Create a Google Play Developer account when you are ready to publish, upload your signed `.aab`, complete data safety disclosures, and submit for review.
5. **iOS Note:** Safari on iOS supports "Add to Home Screen" web apps; native App Store submission requires a Mac with Xcode and an Apple Developer account.
