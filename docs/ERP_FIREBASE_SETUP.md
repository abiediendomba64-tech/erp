# ERP Firebase Auth + Firestore setup (Spark-first)

This setup makes Firebase Authentication the identity provider and Firestore the canonical cloud data source. Browser localStorage is only a cache/explicit import source. Drive and Sheets are intentionally not connected in this phase.

## 1. Create or select the Google Firebase project

1. Open https://console.firebase.google.com/ and select the dedicated ERP project.
2. In Project settings, register a Web app and copy its API key and project ID.
3. In Authentication > Sign-in method, enable Email/Password.
4. Create a Cloud Firestore database in production mode.
5. In Firestore Rules, publish the repository's `firestore.rules` file. Do not test with public read/write rules.

## 2. Configure Cloudflare Pages (or local Vite)

Set these environment variables in the build environment and rebuild/redeploy:

```dotenv
VITE_FIREBASE_API_KEY=your_web_api_key
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
```

The Web API key is a public browser identifier, not a database password. Security is enforced by Firebase Authentication and Firestore Rules. Never put an Admin SDK service account, private key, or server credential in a `VITE_*` variable.

For email/password sign-in and password reset, configure the approved domains and email action settings in Firebase Authentication.

## 3. Cloud data model

- `users/{uid}/workspaces/{workspaceId}`: user's workspace index.
- `workspaces/{workspaceId}`: workspace metadata and owner identity.
- `workspaces/{workspaceId}/members/{uid}`: role (owner/admin/editor/viewer).
- `workspaces/{workspaceId}/modules/{module}/records/{recordId}`: individual operational/accounting records.
- `workspaces/{workspaceId}/modules/{module}/meta/state`: optimistic-concurrency version for each module.

Each module writes through one Firestore transaction that checks the module version and applies the row changes with the version increment. A stale client is blocked rather than silently overwriting a newer cloud version. Firestore Rules independently require authentication, membership, a writable role, and a version increment for module-row writes. The auditLog module is append-only through these client rules.

## 4. Data migration

Login does not silently upload browser data. After signing in, choose either:
- **Workspace kosong** — creates a clean cloud workspace.
- **Impor data lokal** — deliberately imports data from this browser's localStorage.

Before import, export and inspect the ERP JSON backup. Older browser snapshots may contain legacy/demo rows removed by the app's in-memory migration, while the explicit importer only imports serialized localStorage. Local IndexedDB file attachments are not uploaded by this phase.

If workspace initialization is interrupted during a large import, the workspace stays marked `provisioning` and does not appear as an active workspace. Remove the incomplete workspace/index from the Firebase console after verifying it contains no data you need, then retry.

## 5. Free-tier limits and known boundaries

Firebase Spark has no-cost quotas rather than unlimited use. Firestore Standard free tier currently includes 1 GiB stored data, 50,000 document reads/day, 20,000 writes/day, 20,000 deletes/day, and 10 GiB/month outbound transfer. A service may stop after its no-cost quota is exceeded for a billing cycle; monitor usage in the Firebase console.

This phase supports email/password accounts and workspace roles based on Firebase UID. It does not provide email invitations, privileged Admin SDK user management, Cloud Functions, Drive/Sheets integration, document attachment migration, or service-account automation. Inviting a member currently requires their Firebase UID and an owner-controlled membership/index update. Do not advertise these as implemented.

## 6. Verification checklist before production use

- Create a test account and sign in.
- Create a clean workspace, then confirm the workspace and module records appear in Firestore.
- Open the ERP in another browser/device with the same member account and confirm cloud data is loaded before UI providers mount.
- Verify a viewer cannot write, an unlisted user cannot read, and a client cannot write module rows without incrementing the module version.
- Edit the same module from two sessions. The stale session must show a conflict and must not silently overwrite the newer server version.
- Check Firestore Rules simulator for unauthenticated requests, cross-workspace reads, role escalation, audit-log update/delete, and direct record writes.
- Confirm backup export still works and contains no Firebase auth token.
