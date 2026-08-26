# Test Suite Ready — Gerador de Certificado

## 1. Overview
The automated E2E and API integration test suite for **Gerador de Certificado** has been fully implemented in `backend/tests/` and configured with `npm test`.

## 2. Test Architecture & Execution
- **Framework**: Node.js v24 Test Runner (`node:test`) + `node:assert/strict` executed via `tsx`.
- **Location**: `backend/tests/`
- **Execution Command**:
  ```bash
  cd backend
  npm test
  ```
  Or to run individual test files:
  ```bash
  npx tsx --test tests/auth.test.ts
  npx tsx --test tests/stats.test.ts
  npx tsx --test tests/email.test.ts
  npx tsx --test tests/logo.test.ts
  npx tsx --test tests/e2e_lifecycle.test.ts
  ```

## 3. Test Suites & Coverage Matrix

| Suite | File | Requirement / Tiers Covered | Verification Highlights |
|---|---|---|---|
| **R1: Auth & Security** | `backend/tests/auth.test.ts` | R1 (Tier 1 & Tier 2) | • Unauthenticated `POST /api/certificates` returns HTTP 401<br>• Malformed / invalid token returns 401<br>• `POST /api/auth/register` creates instructor & returns JWT<br>• `POST /api/auth/login` valid/invalid password verification<br>• `GET /api/auth/me` user profile verification |
| **R2: Statistics Dashboard** | `backend/tests/stats.test.ts` | R2 (Tier 1 & Tier 2) | • Unauthenticated `GET /api/dashboard/stats` returns 401<br>• Returns metrics: `totalCertificates`, `totalStudents`, `rankDistribution`, `recentCertificates`<br>• Real-time increment verification on certificate issuance |
| **R3: Nodemailer Ethereal Email** | `backend/tests/email.test.ts` | R3 (Tier 1 & Tier 2) | • `POST /api/certificates` triggers Ethereal simulation<br>• Response returns `email.previewUrl` containing `ethereal.email`<br>• UTF-8 / Portuguese accent encoding verification |
| **R4: Dynamic Logo Upload** | `backend/tests/logo.test.ts` | R4 (Tier 1 & Tier 2) | • Unauthenticated upload returns 401<br>• `POST /api/settings/logo` multipart upload returns `logoUrl`<br>• Static serving at `GET /uploads/<filename>` returns 200 image<br>• `GET /api/settings/logo` returns active logo |
| **Tier 3 & Tier 4: E2E Lifecycle** | `backend/tests/e2e_lifecycle.test.ts` | Tiers 3 & 4 (Cross-Feature & Real-World Flow) | • Full lifecycle: Register -> Login -> Check Stats -> Upload Logo -> Issue multiple certificates across ranks -> Verify Ethereal previews -> Verify updated dashboard KPIs & rank distribution<br>• Adversarial security boundary verification |

## 4. Environment Variables
- `TEST_API_URL`: (Optional) URL of the running backend server. Defaults to `http://localhost:3000`.
- `PORT`: (Optional) Backend server port.

## 5. Pass/Fail Semantic
- Tests validate HTTP status codes, payload structures, security tokens, and data invariants.
- A passing run produces exit code `0` with all subtests marked with `✔`.
