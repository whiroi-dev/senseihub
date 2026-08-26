# E2E Test Infra: Gerador de Certificado

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.

## Feature Inventory & Test Coverage Goals
| # | Feature | Source (requirement) | Tier 1 (Feature) | Tier 2 (Boundary) | Tier 3 (Cross-Feature) | Tier 4 (Real-World) |
|---|---------|---------------------|:----------------:|:-----------------:|:----------------------:|:-------------------:|
| 1 | Instructor Authentication & 401 Guard | R1 & Acceptance Criteria | ≥5 tests | ≥5 tests | ✓ | ✓ |
| 2 | Statistics Dashboard Metrics | R2 & Acceptance Criteria | ≥5 tests | ≥5 tests | ✓ | ✓ |
| 3 | Dynamic Logo Upload & Static Serve | R4 & Acceptance Criteria | ≥5 tests | ≥5 tests | ✓ | ✓ |
| 4 | Nodemailer Ethereal Email & Preview URL | R3 & Acceptance Criteria | ≥5 tests | ≥5 tests | ✓ | ✓ |

## Test Architecture
- Test runner: `npx tsx backend/tests/api.test.ts` (using Supertest & Axios / Node native HTTP).
- Pass/Fail semantics: All assertions must pass with exit code 0.
- Verification points:
  1. `POST /api/certificates` without token returns HTTP 401 Unauthorized.
  2. `POST /api/auth/register` and `POST /api/auth/login` authenticate instructor and return valid JWT.
  3. `GET /api/dashboard/stats` matches actual database records for student and certificate counts.
  4. `POST /api/settings/logo` uploads image, returns URL, and static file is accessible via GET.
  5. `POST /api/certificates` with token generates certificate, triggers Ethereal email simulation, prints preview URL in console, and returns preview URL in response.
  6. Frontend build (`npm run build`) and lint (`npm run lint`) pass with 0 errors.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Instructor logs in, uploads dojo logo, issues certificate to student, email preview URL is generated, and stats dashboard increments. | F1, F2, F3, F4 | High |
| 2 | Unauthenticated attacker attempts to issue certificate, is blocked with 401. Attacker attempts to access dashboard stats, is blocked with 401. | F1, F2 | Medium |
| 3 | Multiple certificates across different belt ranks issued; dashboard correctly calculates belt distribution and total certificate count. | F2, F3 | High |
