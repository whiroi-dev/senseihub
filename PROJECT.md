# Project: Gerador de Certificado — Advanced Features

## Architecture

The project is a full-stack certificate generation system for martial arts / training associations composed of:
1. **Backend**: Node.js (v22) + Express (v5) + Prisma ORM (v6) + PostgreSQL (v15).
   - Authentication: JWT (`jsonwebtoken`) + Password Hashing (`bcryptjs`).
   - Route Security: `authMiddleware` enforcing `401 Unauthorized` on protected endpoints (specifically `POST /api/certificates`, `GET /api/dashboard/stats`, `POST /api/settings/logo`).
   - File Upload: `multer` storing dynamic association logos in `./backend/uploads` and serving statically on `/uploads`.
   - Email Simulation: `nodemailer` using Ethereal test accounts (`nodemailer.createTestAccount()`), attaching certificate PDF, and logging Ethereal preview URLs to the server console (`nodemailer.getTestMessageUrl(info)`).
2. **Frontend**: React (v19) + Vite (v8) + Tailwind CSS (v4) + TypeScript.
   - Client Routing / State: Authentication context storing JWT tokens in `localStorage`, protected views, navigation tabs for Dashboard, Certificate Generator, and Settings/Logo.
   - Dynamic Certificate Renderer: Custom certificate HTML template styled for A4 landscape (`29.7cm x 21cm`), supporting dynamic association logo, student rank philosophies, and PDF export via `html2pdf.js`.
   - Email Feedback: Interactive modal showing email dispatch status and direct link to the Ethereal email preview.
3. **Infrastructure**: Docker Compose (`docker-compose.yml`) running `db`, `backend`, and `frontend` with hot-reload and volume mounts.

---

## Code Layout

```
c:/Gerador de Certificado/
├── .agents/                        # Agent metadata & reports
├── backend/
│   ├── prisma/
│   │   └── schema.prisma           # Prisma schema (Student, Certificate, User, Setting)
│   ├── src/
│   │   ├── config/                 # Prisma client, mailer, multer config
│   │   ├── controllers/            # auth, certificate, dashboard, settings controllers
│   │   ├── middlewares/            # authMiddleware (JWT verification & 401 handler)
│   │   ├── routes/                 # authRoutes, certificateRoutes, dashboardRoutes, settingsRoutes
│   │   ├── services/               # emailService (Ethereal mailer), pdfService
│   │   └── index.ts                # Express app initialization & route registration
│   ├── tests/                      # Automated API integration & unit tests
│   ├── uploads/                    # Uploaded logos storage directory
│   ├── package.json                # Dependencies: express, prisma, bcryptjs, jsonwebtoken, nodemailer, multer, supertest
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/             # Navbar, ProtectedRoute, EmailPreviewModal, LogoUploader, RankBadge
│   │   ├── context/                # AuthContext (login, logout, token state)
│   │   ├── pages/                  # LoginPage, DashboardPage, GeneratorPage, SettingsPage
│   │   ├── services/               # api.ts (Axios/Fetch with Bearer interceptor)
│   │   ├── types/                  # TypeScript interfaces (User, Student, Certificate, Stats)
│   │   ├── App.tsx                 # Root layout & navigation
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
└── docker-compose.yml
```

---

## Feature Inventory

Every requirement from `ORIGINAL_REQUEST.md` is inventoried and mapped to a concrete milestone:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Instructor User Model & Auth API | User model in Prisma schema, password hashing with bcryptjs, endpoints `/api/auth/register`, `/api/auth/login`, `/api/auth/me` returning JWT. | M1 | R1 |
| 2 | Backend Route Protection (401) | `authMiddleware` rejecting unauthenticated requests with HTTP `401 Unauthorized` for `POST /api/certificates` and protected resources. | M1 | R1 / Acceptance Criteria |
| 3 | Frontend Auth State & Login View | `LoginPage.tsx`, `AuthContext.tsx` with JWT persistence, auto-redirect on 401, protected routes. | M1 | R1 / Acceptance Criteria |
| 4 | Statistics API Metrics | `GET /api/dashboard/stats` aggregating total certificates, total students, rank distribution breakdown, and recent certificates. | M2 | R2 / Acceptance Criteria |
| 5 | Statistics Dashboard UI | `DashboardPage.tsx` displaying KPI metric cards, karate belt distribution chart/badges, and certificate history table. | M2 | R2 |
| 6 | Dynamic Logo Backend Upload | `multer` file upload route `POST /api/upload/logo` and `GET/POST /api/settings/logo` with static serving at `/uploads`. | M3 | R4 / Acceptance Criteria |
| 7 | Dynamic Logo Frontend & Template | `LogoUploader.tsx` in UI, Base64/URL live preview, dynamic injection into certificate template `buildCertificateHTML()`. | M3 | R4 / Acceptance Criteria |
| 8 | Nodemailer Ethereal Simulation | Server-side `nodemailer` transporter configured with Ethereal test account, sending email with PDF attachment. | M4 | R3 |
| 9 | Console Logging of Preview URL | Server logs `nodemailer.getTestMessageUrl(info)` clearly to the Node.js console and returns preview URL in API response. | M4 | R3 / Acceptance Criteria |
| 10 | Frontend Email Preview Modal | `EmailPreviewModal.tsx` displaying email dispatch success and a clickable link to open the Ethereal web preview. | M4 | R3 |
| 11 | End-to-End Automated Test Suite | Comprehensive automated integration tests (Tiers 1-4) verifying auth, stats, logo upload, email simulation, and frontend build. | M5 | Acceptance Criteria |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Instructor Authentication & Security | Schema `User`, auth routes, JWT middleware, 401 enforcement on `POST /api/certificates`, Frontend Login & AuthContext | none | DONE |
| M2 | Statistics Dashboard | Backend `GET /api/dashboard/stats` endpoint, Prisma aggregations, Frontend Dashboard UI with KPI cards & belt distribution | M1 | IN_PROGRESS |
| M3 | Dynamic Logo Upload & Certificate Integration | Multer upload, `/uploads` static route, `Setting` model, Frontend LogoUploader & dynamic certificate template rendering | M1 | PLANNED |
| M4 | Nodemailer Ethereal Email & PDF Preview | Server Nodemailer Ethereal dispatch, console preview URL logging, frontend email feedback modal | M1, M3 | PLANNED |
| M5 | Final E2E Verification & Adversarial Hardening | Automated API test suite, 100% test pass verification, adversarial test coverage, and forensic audit | M1, M2, M3, M4 | PLANNED |

---

## Interface Contracts

### 1. Authentication Endpoints
- **`POST /api/auth/register`**
  - Request: `{ "name": "Prof. Tanaka", "email": "tanaka@dojo.com", "password": "securepassword" }`
  - Response (201): `{ "token": "jwt_token...", "user": { "id": 1, "name": "Prof. Tanaka", "email": "tanaka@dojo.com" } }`
- **`POST /api/auth/login`**
  - Request: `{ "email": "tanaka@dojo.com", "password": "securepassword" }`
  - Response (200): `{ "token": "jwt_token...", "user": { "id": 1, "name": "Prof. Tanaka", "email": "tanaka@dojo.com" } }`
  - Response (401): `{ "error": "Credenciais inválidas" }`
- **`GET /api/auth/me`**
  - Headers: `Authorization: Bearer <token>`
  - Response (200): `{ "user": { "id": 1, "name": "Prof. Tanaka", "email": "tanaka@dojo.com" } }`
  - Response (401): `{ "error": "Token não fornecido ou inválido" }`

### 2. Certificate Issuance & Route Protection
- **`POST /api/certificates`**
  - Headers: `Authorization: Bearer <token>` (Mandatory: returns `401 Unauthorized` if missing/invalid)
  - Request:
    ```json
    {
      "studentName": "Lucas Silva",
      "studentEmail": "lucas@example.com",
      "rank": "Faixa Preta (1º Dan)",
      "associationName": "Associação Shotokan",
      "shihanName": "Shihan Kenji",
      "presidentName": "Presidente Sato",
      "issueDate": "2026-08-24"
    }
    ```
  - Response (201):
    ```json
    {
      "success": true,
      "certificate": {
        "id": 1,
        "studentId": 1,
        "associationName": "Associação Shotokan",
        "shihanName": "Shihan Kenji",
        "presidentName": "Presidente Sato",
        "issueDate": "2026-08-24T00:00:00.000Z"
      },
      "email": {
        "sent": true,
        "previewUrl": "https://ethereal.email/message/WaQKMgKddxQDoou...",
        "messageId": "<...>"
      }
    }
    ```

### 3. Statistics Dashboard
- **`GET /api/dashboard/stats`**
  - Headers: `Authorization: Bearer <token>`
  - Response (200):
    ```json
    {
      "totalCertificates": 42,
      "totalStudents": 35,
      "rankDistribution": [
        { "rank": "Faixa Branca (6º Kyu)", "count": 12, "color": "#F3F4F6" },
        { "rank": "Faixa Amarela (5º Kyu)", "count": 8, "color": "#FACC15" },
        { "rank": "Faixa Vermelha (4º Kyu)", "count": 6, "color": "#EF4444" },
        { "rank": "Faixa Laranja (3º Kyu)", "count": 5, "color": "#FB923C" },
        { "rank": "Faixa Verde (2º Kyu)", "count": 4, "color": "#22C55E" },
        { "rank": "Faixa Roxa (1º Kyu)", "count": 3, "color": "#A855F7" },
        { "rank": "Faixa Marrom (1º Kyu)", "count": 2, "color": "#78350F" },
        { "rank": "Faixa Preta (1º Dan)", "count": 2, "color": "#111827" }
      ],
      "recentCertificates": [
        {
          "id": 1,
          "studentName": "Lucas Silva",
          "rank": "Faixa Preta (1º Dan)",
          "associationName": "Associação Shotokan",
          "issueDate": "2026-08-24T00:00:00.000Z",
          "createdAt": "2026-08-24T22:00:00.000Z"
        }
      ]
    }
    ```

### 4. Dynamic Logo & Settings
- **`POST /api/settings/logo`** (or `POST /api/upload/logo`)
  - Headers: `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`
  - Body: `file` (image binary: `.png`, `.jpg`, `.jpeg`, `.svg`, `.webp`)
  - Response (200):
    ```json
    {
      "success": true,
      "logoUrl": "/uploads/logo-1724550000000.png",
      "fullUrl": "http://localhost:3000/uploads/logo-1724550000000.png"
    }
    ```
- **`GET /api/settings/logo`**
  - Response (200):
    ```json
    {
      "logoUrl": "/uploads/logo-1724550000000.png",
      "fullUrl": "http://localhost:3000/uploads/logo-1724550000000.png"
    }
    ```
