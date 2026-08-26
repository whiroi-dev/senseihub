import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest, generateInstructorData, generateCertificateData, createSamplePng, API_BASE_URL } from './helpers.js';
import prisma from '../src/config/prisma.js';
import { generateCertificatePdfBuffer } from '../src/services/pdf.service.js';
import { sendCertificateEmail } from '../src/services/email.service.js';

describe('🥋 FINAL CHALLENGER — Empirical Verification & Adversarial Stress Suite', () => {
  let authToken: string = '';
  let instructorEmail: string = '';
  let instructorId: number = 0;

  before(async () => {
    const instructor = generateInstructorData('final_challenger');
    instructorEmail = instructor.email;
    const regRes = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: instructor,
    });
    assert.equal(regRes.status, 201, `Failed to register instructor for challenge suite: ${JSON.stringify(regRes.data)}`);
    authToken = regRes.data.token;
    instructorId = regRes.data.user.id;
  });

  // =========================================================================
  // 1. DASHBOARD STATISTICS EMPIRICAL VERIFICATION
  // =========================================================================
  describe('1. Dashboard Statistics Empirical Verification (R2)', () => {
    it('1.1: GET /api/dashboard/stats rejects unauthenticated and invalid tokens with 401', async () => {
      const resNoToken = await apiRequest('/api/dashboard/stats', { method: 'GET' });
      assert.equal(resNoToken.status, 401, 'Expected 401 for request without token');

      const resBadToken = await apiRequest('/api/dashboard/stats', {
        method: 'GET',
        token: 'forged.invalid.token',
      });
      assert.equal(resBadToken.status, 401, 'Expected 401 for forged token');
    });

    it('1.2: GET /api/dashboard/stats returns valid schema invariants', async () => {
      const res = await apiRequest('/api/dashboard/stats', {
        method: 'GET',
        token: authToken,
      });

      assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
      const { totalCertificates, totalStudents, rankDistribution, recentCertificates } = res.data;

      assert.ok(typeof totalCertificates === 'number' && totalCertificates >= 0, 'totalCertificates must be non-negative number');
      assert.ok(typeof totalStudents === 'number' && totalStudents >= 0, 'totalStudents must be non-negative number');
      assert.ok(Array.isArray(rankDistribution), 'rankDistribution must be an array');
      assert.ok(Array.isArray(recentCertificates), 'recentCertificates must be an array');
    });

    it('1.3: Verifies rank distribution color assignment for all 8 standard karate belt ranks', async () => {
      const standardRanks = [
        { rank: 'Faixa Branca (7º Kyu)', expectedColor: '#F3F4F6' },
        { rank: 'Faixa Amarela (6º Kyu)', expectedColor: '#FACC15' },
        { rank: 'Faixa Laranja (5º Kyu)', expectedColor: '#FB923C' },
        { rank: 'Faixa Vermelha (4º Kyu)', expectedColor: '#EF4444' },
        { rank: 'Faixa Azul (4º Kyu)', expectedColor: '#3B82F6' },
        { rank: 'Faixa Verde (3º Kyu)', expectedColor: '#22C55E' },
        { rank: 'Faixa Roxa (2º Kyu)', expectedColor: '#A855F7' },
        { rank: 'Faixa Marrom (1º Kyu)', expectedColor: '#78350F' },
        { rank: 'Faixa Preta (1º Dan)', expectedColor: '#111827' },
      ];

      // Issue one certificate for each rank
      for (const item of standardRanks) {
        const certData = {
          studentName: `Aluno ${item.rank} ${Date.now()}`,
          rank: item.rank,
          associationName: 'Associação Geral de Karatê',
          shihanName: 'Shihan Kenji',
          presidentName: 'Presidente Sato',
          issueDate: '2026-08-24',
        };

        const createRes = await apiRequest('/api/certificates', {
          method: 'POST',
          token: authToken,
          body: certData,
        });
        assert.equal(createRes.status, 201, `Failed to issue certificate for ${item.rank}`);
      }

      // Query dashboard stats
      const statsRes = await apiRequest('/api/dashboard/stats', {
        method: 'GET',
        token: authToken,
      });
      assert.equal(statsRes.status, 200);

      const rankDistribution = statsRes.data.rankDistribution;
      assert.ok(Array.isArray(rankDistribution), 'rankDistribution must be array');

      for (const item of standardRanks) {
        const found = rankDistribution.find((r: any) => r.rank === item.rank);
        assert.ok(found, `Expected rank '${item.rank}' in rankDistribution`);
        assert.ok(found.count >= 1, `Expected count >= 1 for rank '${item.rank}'`);
        assert.equal(
          found.color,
          item.expectedColor,
          `Rank color mismatch for '${item.rank}': expected ${item.expectedColor}, got ${found.color}`
        );
      }
    });

    it('1.4: Distinguishes count increments when auto-creating student vs reusing studentId', async () => {
      // 1. Get baseline stats
      const initialRes = await apiRequest('/api/dashboard/stats', {
        method: 'GET',
        token: authToken,
      });
      const initialCerts = initialRes.data.totalCertificates;
      const initialStudents = initialRes.data.totalStudents;

      // 2. Issue certificate with studentName (auto-creates student)
      const res1 = await apiRequest('/api/certificates', {
        method: 'POST',
        token: authToken,
        body: {
          studentName: `Novo Aluno Auto ${Date.now()}`,
          rank: 'Faixa Preta (1º Dan)',
          associationName: 'Dojo Central',
          shihanName: 'Shihan Kenji',
          presidentName: 'Presidente Sato',
          issueDate: '2026-08-24',
        },
      });
      assert.equal(res1.status, 201);
      const createdStudentId = res1.data.certificate.studentId;

      // Check stats: both incremented by 1
      const statsAfterAuto = await apiRequest('/api/dashboard/stats', {
        method: 'GET',
        token: authToken,
      });
      assert.equal(statsAfterAuto.data.totalCertificates, initialCerts + 1);
      assert.equal(statsAfterAuto.data.totalStudents, initialStudents + 1);

      // 3. Issue certificate reusing createdStudentId
      const res2 = await apiRequest('/api/certificates', {
        method: 'POST',
        token: authToken,
        body: {
          studentId: createdStudentId,
          associationName: 'Dojo Central - Segundo Curso',
          shihanName: 'Shihan Kenji',
          presidentName: 'Presidente Sato',
          issueDate: '2026-08-25',
        },
      });
      assert.equal(res2.status, 201);

      // Check stats: totalCertificates incremented by 1, but totalStudents remained unchanged
      const statsAfterReuse = await apiRequest('/api/dashboard/stats', {
        method: 'GET',
        token: authToken,
      });
      assert.equal(statsAfterReuse.data.totalCertificates, initialCerts + 2);
      assert.equal(statsAfterReuse.data.totalStudents, initialStudents + 1);
    });

    it('1.5: recentCertificates maintains max 10 entries and descending chronological order', async () => {
      const statsRes = await apiRequest('/api/dashboard/stats', {
        method: 'GET',
        token: authToken,
      });
      assert.equal(statsRes.status, 200);
      const recent = statsRes.data.recentCertificates;

      assert.ok(recent.length <= 10, `recentCertificates should not exceed 10 items, got ${recent.length}`);

      // Verify descending order
      for (let i = 0; i < recent.length - 1; i++) {
        const timeCurrent = new Date(recent[i].createdAt).getTime();
        const timeNext = new Date(recent[i + 1].createdAt).getTime();
        assert.ok(timeCurrent >= timeNext, `Recent certificates must be in descending order: ${recent[i].createdAt} >= ${recent[i + 1].createdAt}`);
      }
    });
  });

  // =========================================================================
  // 2. LOGO UPLOAD & STATIC SERVING EMPIRICAL VERIFICATION
  // =========================================================================
  describe('2. Logo Upload & Static Serving Empirical Verification (R4)', () => {
    it('2.1: POST /api/settings/logo rejects unauthenticated requests with 401', async () => {
      const { buffer, fileName, mimeType } = createSamplePng();
      const formData = new FormData();
      formData.append('file', new Blob([buffer], { type: mimeType }), fileName);

      const res = await apiRequest('/api/settings/logo', {
        method: 'POST',
        body: formData,
        isFormData: true,
      });
      assert.equal(res.status, 401);
    });

    it('2.2: POST /api/settings/logo strictly rejects non-image files (e.g. text, pdf, exe)', async () => {
      const textBuffer = Buffer.from('console.log("malicious code");');
      const formData = new FormData();
      formData.append('file', new Blob([textBuffer], { type: 'text/plain' }), 'exploit.txt');

      const res = await apiRequest('/api/settings/logo', {
        method: 'POST',
        token: authToken,
        body: formData,
        isFormData: true,
      });

      // Multer fileFilter rejection results in 400/500 with error message
      assert.ok(
        res.status === 400 || res.status === 500,
        `Expected non-image file to be rejected with 400/500, got ${res.status}`
      );
      const resStr = JSON.stringify(res.data);
      assert.ok(
        resStr.toLowerCase().includes('imagem') || resStr.toLowerCase().includes('permitidos') || resStr.toLowerCase().includes('falha'),
        `Expected error message referencing image requirement, got ${resStr}`
      );
    });

    it('2.3: POST /api/settings/logo uploads valid PNG and returns URL with static accessibility', async () => {
      const { buffer, fileName, mimeType } = createSamplePng();
      const formData = new FormData();
      formData.append('file', new Blob([buffer], { type: mimeType }), fileName);

      const res = await apiRequest('/api/settings/logo', {
        method: 'POST',
        token: authToken,
        body: formData,
        isFormData: true,
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(res.data.logoUrl && res.data.logoUrl.startsWith('/uploads/'));
      assert.ok(res.data.fullUrl && res.data.fullUrl.includes('/uploads/'));

      // Fetch static URL directly via HTTP GET
      const staticUrl = res.data.fullUrl;
      const getRes = await fetch(staticUrl);
      assert.equal(getRes.status, 200, `Static image at ${staticUrl} returned status ${getRes.status}`);
      const contentType = getRes.headers.get('content-type') || '';
      assert.ok(contentType.includes('image'), `Expected image Content-Type, got ${contentType}`);

      const fetchedBuffer = Buffer.from(await getRes.arrayBuffer());
      assert.equal(fetchedBuffer.length, buffer.length, 'Static served byte length should match uploaded buffer');
    });

    it('2.4: Uploads larger 500KB image buffer cleanly without corruption', async () => {
      // Create a 500KB mock PNG buffer (with PNG header)
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const largePayload = Buffer.alloc(500 * 1024, 0x41);
      const combinedBuffer = Buffer.concat([pngHeader, largePayload]);

      const formData = new FormData();
      formData.append('file', new Blob([combinedBuffer], { type: 'image/png' }), `large-logo-${Date.now()}.png`);

      const res = await apiRequest('/api/settings/logo', {
        method: 'POST',
        token: authToken,
        body: formData,
        isFormData: true,
      });

      assert.equal(res.status, 200);
      assert.ok(res.data.logoUrl);

      // Verify static download of large file
      const getRes = await fetch(res.data.fullUrl);
      assert.equal(getRes.status, 200);
      const fetchedBuffer = Buffer.from(await getRes.arrayBuffer());
      assert.equal(fetchedBuffer.length, combinedBuffer.length);
    });

    it('2.5: GET /api/settings/logo returns current active logo and persists in PostgreSQL Setting table', async () => {
      const getRes = await apiRequest('/api/settings/logo', { method: 'GET' });
      assert.equal(getRes.status, 200);
      assert.ok(getRes.data.logoUrl);
      assert.ok(getRes.data.fullUrl);

      // Verify database record
      const dbSetting = await prisma.setting.findUnique({
        where: { key: 'active_logo' },
      });
      assert.ok(dbSetting, 'Setting key "active_logo" must exist in PostgreSQL');
      assert.equal(dbSetting.value, getRes.data.logoUrl);
    });
  });

  // =========================================================================
  // 3. NODEMAILER ETHEREAL SIMULATION & PDF GENERATION EMPIRICAL VERIFICATION
  // =========================================================================
  describe('3. Nodemailer Ethereal Simulation & PDF Generation (R3)', () => {
    it('3.1: generateCertificatePdfBuffer produces valid A4 PDF binary with %PDF- header', async () => {
      const pdfBuffer = await generateCertificatePdfBuffer({
        studentName: 'Lucas Tanaka da Silva',
        rank: 'Faixa Preta (1º Dan)',
        associationName: 'Associação Kenshi-kai de Karatê-Dô',
        shihanName: 'Shihan Marcos Ribeiro',
        presidentName: 'Presidente Daniel Pinto',
        issueDate: '2026-08-24',
      });

      assert.ok(Buffer.isBuffer(pdfBuffer), 'Expected result to be a Buffer');
      assert.ok(pdfBuffer.length > 2000, `Expected PDF buffer length > 2000 bytes, got ${pdfBuffer.length}`);

      // Verify magic bytes: "%PDF-"
      const header = pdfBuffer.subarray(0, 5).toString('ascii');
      assert.equal(header, '%PDF-', `Expected PDF magic header "%PDF-", got "${header}"`);
    });

    it('3.2: sendCertificateEmail connects to Ethereal sandbox and returns valid previewUrl', async () => {
      const pdfBuffer = await generateCertificatePdfBuffer({
        studentName: 'Camila Gonçalves',
        rank: 'Faixa Roxa (2º Kyu)',
        associationName: 'Associação Shotokan Central',
        shihanName: 'Shihan Otomo',
        presidentName: 'Presidente Morita',
        issueDate: '2026-08-24',
      });

      const emailResult = await sendCertificateEmail({
        to: 'camila.test@ethereal.test',
        studentName: 'Camila Gonçalves',
        rank: 'Faixa Roxa (2º Kyu)',
        associationName: 'Associação Shotokan Central',
        pdfBuffer,
      });

      assert.equal(emailResult.sent, true, 'Email dispatch should report sent: true');
      assert.ok(emailResult.previewUrl, 'Email dispatch must return previewUrl');
      assert.ok(
        emailResult.previewUrl.startsWith('https://ethereal.email/message/'),
        `Expected Ethereal preview URL starting with https://ethereal.email/message/, got: ${emailResult.previewUrl}`
      );
      assert.ok(emailResult.messageId, 'Email dispatch must return messageId');
    });

    it('3.3: POST /api/certificates sends email with PDF and handles complex Portuguese characters', async () => {
      const complexStudent = {
        studentName: 'Sensei João Ângelo d’Ávila Müller-Gonçalves',
        studentEmail: 'joao.muller.accent@ethereal.test',
        rank: 'Faixa Preta (1º Dan)',
        associationName: 'Federação Tradição & Ação de Karatê-Dô do Brasil',
        shihanName: 'Shihan José Cláudio da Conceição',
        presidentName: 'Presidente Antônio Carlos de Pádua',
        issueDate: '2026-08-24',
      };

      const res = await apiRequest('/api/certificates', {
        method: 'POST',
        token: authToken,
        body: complexStudent,
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.success, true);
      assert.ok(res.data.certificate.id);
      assert.equal(res.data.email.sent, true);
      assert.ok(res.data.email.previewUrl.startsWith('https://ethereal.email/message/'));

      // Verify certificate in DB has accurate UTF-8 characters
      const dbCert = await prisma.certificate.findUnique({
        where: { id: res.data.certificate.id },
        include: { student: true },
      });
      assert.ok(dbCert);
      assert.equal(dbCert.student.name, complexStudent.studentName);
      assert.equal(dbCert.associationName, complexStudent.associationName);
      assert.equal(dbCert.shihanName, complexStudent.shihanName);
    });

    it('3.4: Concurrent certificate issuance executes reliably without race conditions or transporter locks', async () => {
      const requests = Array.from({ length: 3 }, (_, i) => ({
        studentName: `Atleta Paralelo ${i + 1} ${Date.now()}`,
        studentEmail: `atleta.paralelo.${i + 1}@ethereal.test`,
        rank: 'Faixa Amarela (6º Kyu)',
        associationName: 'Associação Samurai',
        shihanName: 'Shihan Kenji',
        presidentName: 'Presidente Sato',
        issueDate: '2026-08-24',
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        requests.map((r) =>
          apiRequest('/api/certificates', {
            method: 'POST',
            token: authToken,
            body: r,
          })
        )
      );
      const duration = Date.now() - startTime;

      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        assert.equal(res.status, 201, `Parallel issuance ${i + 1} failed with status ${res.status}`);
        assert.equal(res.data.success, true);
        assert.equal(res.data.email.sent, true);
        assert.ok(res.data.email.previewUrl.includes('ethereal.email'));
      }
      console.log(`  [Pass] 3 concurrent certificate generations & Ethereal dispatches completed in ${duration}ms`);
    });
  });

  // =========================================================================
  // 4. CROSS-FEATURE LIFECYCLE & ADVERSARIAL STRESS VERIFICATION
  // =========================================================================
  describe('4. Cross-Feature Lifecycle & Adversarial Stress Verification', () => {
    it('4.1: Executes complete End-to-End Instructor Workflow with full state transitions', async () => {
      // Step 1: Register New Instructor
      const instructorData = generateInstructorData('lifecycle_sensei');
      const regRes = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: instructorData,
      });
      assert.equal(regRes.status, 201);
      const lifeToken = regRes.data.token;
      assert.ok(lifeToken);

      // Step 2: Login
      const loginRes = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email: instructorData.email, password: instructorData.password },
      });
      assert.equal(loginRes.status, 200);

      // Step 3: Check Initial Stats
      const statsBefore = await apiRequest('/api/dashboard/stats', {
        method: 'GET',
        token: lifeToken,
      });
      assert.equal(statsBefore.status, 200);
      const initialCertCount = statsBefore.data.totalCertificates;
      const initialStudentCount = statsBefore.data.totalStudents;

      // Step 4: Upload Association Logo
      const { buffer, fileName, mimeType } = createSamplePng();
      const formData = new FormData();
      formData.append('file', new Blob([buffer], { type: mimeType }), fileName);

      const logoRes = await apiRequest('/api/settings/logo', {
        method: 'POST',
        token: lifeToken,
        body: formData,
        isFormData: true,
      });
      assert.equal(logoRes.status, 200);
      const activeLogoUrl = logoRes.data.fullUrl;

      // Step 5: Verify Static Logo Serving
      const staticCheck = await fetch(activeLogoUrl);
      assert.equal(staticCheck.status, 200);

      // Step 6: Issue 3 Certificates across different belt ranks
      const ranksToIssue = [
        'Faixa Branca (7º Kyu)',
        'Faixa Verde (3º Kyu)',
        'Faixa Preta (1º Dan)',
      ];

      const issuedCertificates = [];
      for (const rank of ranksToIssue) {
        const certRes = await apiRequest('/api/certificates', {
          method: 'POST',
          token: lifeToken,
          body: {
            studentName: `Aluno Ciclo ${rank.split(' ')[1]} ${Date.now()}`,
            studentEmail: `aluno.${rank.split(' ')[1].toLowerCase()}@ethereal.test`,
            rank,
            associationName: 'Associação Kenshi-kai Oficial',
            shihanName: 'Shihan Marcos Ribeiro',
            presidentName: 'Presidente Daniel Pinto',
            issueDate: '2026-08-24',
          },
        });
        assert.equal(certRes.status, 201);
        assert.equal(certRes.data.success, true);
        assert.equal(certRes.data.email.sent, true);
        assert.ok(certRes.data.email.previewUrl.includes('ethereal.email'));
        issuedCertificates.push(certRes.data.certificate);
      }

      // Step 7: Verify Updated Dashboard Statistics
      const statsAfter = await apiRequest('/api/dashboard/stats', {
        method: 'GET',
        token: lifeToken,
      });
      assert.equal(statsAfter.status, 200);
      assert.equal(
        statsAfter.data.totalCertificates,
        initialCertCount + 3,
        `Expected totalCertificates to increase by 3 (from ${initialCertCount} to ${initialCertCount + 3})`
      );
      assert.equal(
        statsAfter.data.totalStudents,
        initialStudentCount + 3,
        `Expected totalStudents to increase by 3 (from ${initialStudentCount} to ${initialStudentCount + 3})`
      );

      // Step 8: Verify recentCertificates contains the newly created certs
      const recentIds = statsAfter.data.recentCertificates.map((c: any) => c.id);
      for (const cert of issuedCertificates) {
        assert.ok(recentIds.includes(cert.id), `Expected certificate ID ${cert.id} in recentCertificates`);
      }

      // Step 9: Verify settings active logo remains consistent
      const currentLogoRes = await apiRequest('/api/settings/logo', { method: 'GET' });
      assert.equal(currentLogoRes.status, 200);
      assert.equal(currentLogoRes.data.logoUrl, logoRes.data.logoUrl);
    });

    it('4.2: Adversarial route boundary enforcement across all endpoints', async () => {
      const protectedEndpoints = [
        { path: '/api/certificates', method: 'POST', body: generateCertificateData() },
        { path: '/api/dashboard/stats', method: 'GET' },
        { path: '/api/settings/logo', method: 'POST', body: {} },
        { path: '/api/auth/me', method: 'GET' },
      ];

      for (const ep of protectedEndpoints) {
        // Without token
        const resNoToken = await apiRequest(ep.path, {
          method: ep.method,
          body: ep.body,
        });
        assert.equal(
          resNoToken.status,
          401,
          `Expected 401 for unauthenticated ${ep.method} ${ep.path}, got ${resNoToken.status}`
        );

        // With invalid token
        const resInvalidToken = await apiRequest(ep.path, {
          method: ep.method,
          token: 'invalid-signature-12345',
          body: ep.body,
        });
        assert.equal(
          resInvalidToken.status,
          401,
          `Expected 401 for invalid token ${ep.method} ${ep.path}, got ${resInvalidToken.status}`
        );
      }
    });
  });
});
