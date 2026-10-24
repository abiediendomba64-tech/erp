# ERP Properti & Konstruksi — Google Apps Script

Backend production path: `Security.gs` + `Wrapper.html` + `Code.gs`, with the React client using `src/lib/gasBridge.ts` and `src/auth/CloudAuthGate.tsx`.

Do not add `CloudWorkspace.gs` or `Index.html` from the retired duplicate-gateway prototype. The active gateway is `Security.gs` and the active browser RPC bridge is `Wrapper.html`/`gasBridge.ts`.

Setup requirements and smoke-test instructions are maintained in `docs/GOOGLE_BACKEND_SETUP.md`. Configure the OAuth Client ID, private spreadsheet ID, admin allowlist, frontend HTTPS origin, and the deployed `/exec` URL before enabling real users.

Unauthenticated legacy REST routes, live OCR, Drive upload, and messaging webhooks remain disabled until their end-to-end authorization and audit flow is implemented. Passing CI is not evidence of live deployment.