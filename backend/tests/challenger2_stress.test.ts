import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { apiRequest, generateInstructorData, generateCertificateData } from './helpers.js';
import prisma from '../src/config/prisma.js';
import { JWT_SECRET } from '../src/middlewares/auth.js';

describe('CHALLENGER 2: Empirical Stress Test & Security Hardening', () => {

  // =========================================================================
  // SCENARIO 1: Rapid Concurrent Logins and Registrations (Race Conditions)
  // =========================================================================
  describe('Scenario 1: Concurrency Stress & Race Conditions', () => {
    
    it('1.1: 20 simultaneous registrations with distinct emails all succeed (201)', async () => {
      const instructors = Array.from({ length: 20 }, (_, i) => generateInstructorData(`concurrent_${i}`));
      
      const startTime = Date.now();
      const results = await Promise.all(
        instructors.map(inst => apiRequest('/api/auth/register', { method: 'POST', body: inst }))
      );
      const elapsed = Date.now() - startTime;

      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        assert.equal(
          res.status,
          201,
          `Expected 201 for instructor ${instructors[i].email}, got ${res.status}: ${JSON.stringify(res.data)}`
        );
        assert.ok(res.data.token, 'Token must be present in response');
        assert.equal(res.data.user.email, instructors[i].email.toLowerCase().trim());
      }
      console.log(`  [Pass] 20 concurrent registrations completed in ${elapsed}ms`);
    });

    it('1.2: 10 simultaneous registrations with the EXACT SAME email handle race condition cleanly', async () => {
      const duplicateInstructor = generateInstructorData('duplicate_race');
      
      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          apiRequest('/api/auth/register', { method: 'POST', body: duplicateInstructor })
        )
      );

      const successCount = results.filter(r => r.status === 201).length;
      const rejectedCount = results.filter(r => r.status === 400 || r.status === 409 || r.status === 500).length;
      const cleanRejections = results.filter(r => r.status === 400 || r.status === 409).length;

      // Exactly 1 must succeed in creating the user
      assert.equal(successCount, 1, `Exactly 1 registration should succeed, got ${successCount}`);
      // The remaining 9 should be rejected
      assert.equal(rejectedCount, 9, `All 9 duplicate attempts should be rejected`);

      // Verify that no unhandled 500 leaked raw crash trace to client
      for (const res of results) {
        const dataStr = JSON.stringify(res.data);
        assert.ok(!dataStr.includes('PrismaClientKnownRequestError'), 'Must not leak raw Prisma exception');
        assert.ok(!dataStr.includes('stack'), 'Must not leak stack trace');
      }

      console.log(`  [Pass] Exact duplicate race: 1 success (201), ${cleanRejections} clean 400/409, 0 crash leaks`);
    });

    it('1.3: 20 simultaneous logins for an existing user all succeed (200) without deadlock', async () => {
      const instructor = generateInstructorData('concurrent_login');
      const regRes = await apiRequest('/api/auth/register', { method: 'POST', body: instructor });
      assert.equal(regRes.status, 201);

      const startTime = Date.now();
      const loginPromises = Array.from({ length: 20 }, () =>
        apiRequest('/api/auth/login', {
          method: 'POST',
          body: { email: instructor.email, password: instructor.password }
        })
      );
      const results = await Promise.all(loginPromises);
      const elapsed = Date.now() - startTime;

      for (const res of results) {
        assert.equal(res.status, 200, `Expected 200 on concurrent login, got ${res.status}`);
        assert.ok(res.data.token, 'Token must be present in response');
        assert.equal(res.data.user.email, instructor.email.toLowerCase().trim());
      }
      console.log(`  [Pass] 20 concurrent logins completed in ${elapsed}ms`);
    });

    it('1.4: 20 simultaneous logins with mixed valid and invalid passwords isolate correctly', async () => {
      const instructor = generateInstructorData('mixed_login');
      await apiRequest('/api/auth/register', { method: 'POST', body: instructor });

      const attempts = Array.from({ length: 20 }, (_, i) => ({
        email: instructor.email,
        password: i % 2 === 0 ? instructor.password : 'wrong_password_attack',
        expectedStatus: i % 2 === 0 ? 200 : 401
      }));

      const results = await Promise.all(
        attempts.map(att =>
          apiRequest('/api/auth/login', {
            method: 'POST',
            body: { email: att.email, password: att.password }
          })
        )
      );

      for (let i = 0; i < results.length; i++) {
        assert.equal(
          results[i].status,
          attempts[i].expectedStatus,
          `Attempt ${i} expected ${attempts[i].expectedStatus}, got ${results[i].status}`
        );
      }
      console.log(`  [Pass] 20 mixed valid/invalid logins strictly isolated`);
    });
  });

  // =========================================================================
  // SCENARIO 2: Token Decoding, User ID Matching & Tampering Defense
  // =========================================================================
  describe('Scenario 2: Token Lifecycle, Decoding & Tampering Defense', () => {
    
    it('2.1: Decodes JWT payload and matches exact database instructor ID and fields', async () => {
      const instructor = generateInstructorData('token_match');
      const regRes = await apiRequest('/api/auth/register', { method: 'POST', body: instructor });
      assert.equal(regRes.status, 201);
      const token = regRes.data.token;

      // Decode token
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      assert.ok(decoded.id, 'Decoded token must have id');
      assert.equal(decoded.email, instructor.email.toLowerCase().trim());
      assert.equal(decoded.name, instructor.name.trim());
      assert.ok(decoded.iat, 'Decoded token must have iat');
      assert.ok(decoded.exp, 'Decoded token must have exp');
      assert.ok(decoded.exp > decoded.iat, 'Token expiration must be in the future');

      // Verify direct PostgreSQL match
      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.id }
      });
      assert.ok(dbUser, 'User must exist in PostgreSQL');
      assert.equal(dbUser.email, decoded.email);
      assert.equal(dbUser.name, decoded.name);
      console.log(`  [Pass] Token decoded: id=${decoded.id}, email=${decoded.email}, PostgreSQL user matched`);
    });

    it('2.2: Tampered signature is strictly rejected with 401 Unauthorized', async () => {
      const instructor = generateInstructorData('tamper_sig');
      const regRes = await apiRequest('/api/auth/register', { method: 'POST', body: instructor });
      const validToken = regRes.data.token;

      // Alter signature
      const tamperedToken = validToken.slice(0, -5) + 'XXXXX';

      const certRes = await apiRequest('/api/certificates', {
        method: 'POST',
        token: tamperedToken,
        body: generateCertificateData()
      });
      assert.equal(certRes.status, 401, `Tampered token must return 401, got ${certRes.status}`);

      const meRes = await apiRequest('/api/auth/me', {
        method: 'GET',
        token: tamperedToken
      });
      assert.equal(meRes.status, 401, `Tampered token on /me must return 401, got ${meRes.status}`);
      console.log(`  [Pass] Tampered signature blocked with 401 on all routes`);
    });

    it('2.3: Token signed with wrong secret is rejected with 401 Unauthorized', async () => {
      const fakeToken = jwt.sign(
        { id: 9999, email: 'hacker@attacker.com', name: 'Attacker' },
        'wrong_attacker_secret_key_123',
        { expiresIn: '1h' }
      );

      const res = await apiRequest('/api/certificates', {
        method: 'POST',
        token: fakeToken,
        body: generateCertificateData()
      });
      assert.equal(res.status, 401, `Token with wrong secret must return 401, got ${res.status}`);
      console.log(`  [Pass] Wrong secret token blocked with 401`);
    });

    it('2.4: Expired token is rejected with 401 Unauthorized', async () => {
      const expiredToken = jwt.sign(
        { id: 1, email: 'expired@dojo.com', name: 'Expired Sensei' },
        JWT_SECRET,
        { expiresIn: '-10s' } // Expired 10 seconds ago
      );

      const res = await apiRequest('/api/auth/me', {
        method: 'GET',
        token: expiredToken
      });
      assert.equal(res.status, 401, `Expired token must return 401, got ${res.status}`);
      assert.equal(res.data.message, 'Token inválido ou expirado');
      console.log(`  [Pass] Expired token returned 401 with standard expiry message`);
    });

    it('2.5: Malformed Authorization header variants all return 401', async () => {
      const testHeaders = [
        { Authorization: '' },
        { Authorization: 'Bearer ' },
        { Authorization: 'Bearer   ' },
        { Authorization: 'Bearer' },
        { Authorization: 'Token abcdef123' },
        { Authorization: 'Basic dXNlcjpwYXNz' },
        { Authorization: 'Bearer null' },
        { Authorization: 'Bearer undefined' },
      ];

      for (const h of testHeaders) {
        const res = await apiRequest('/api/certificates', {
          method: 'POST',
          headers: h,
          body: generateCertificateData()
        });
        assert.equal(
          res.status,
          401,
          `Header '${JSON.stringify(h)}' expected 401, got ${res.status}`
        );
      }
      console.log(`  [Pass] 8 malformed Authorization header variants blocked with 401`);
    });
  });

  // =========================================================================
  // SCENARIO 3: Error Sanitization & Information Leakage Prevention
  // =========================================================================
  describe('Scenario 3: Error Sanitization & Security Leakage Prevention', () => {

    it('3.1: Invalid credentials return standard 401 JSON and no stack traces', async () => {
      const badCredentials = [
        { email: 'nonexistent_instructor@dojo.com', password: 'password123' },
        { email: 'admin@domain.com', password: 'wrong' },
        { email: "' OR '1'='1' --", password: 'password' },
        { email: "admin' UNION SELECT * FROM \"User\" --", password: 'x' },
      ];

      for (const cred of badCredentials) {
        const res = await apiRequest('/api/auth/login', {
          method: 'POST',
          body: cred
        });
        assert.equal(res.status, 401, `Bad credentials should return 401, got ${res.status}`);
        assert.equal(res.data.error, 'Credenciais inválidas');
        assert.equal(res.data.token, undefined);

        const dataStr = JSON.stringify(res.data);
        assert.ok(!dataStr.includes('stack'), 'Response must not contain stack property');
        assert.ok(!dataStr.includes('node_modules'), 'Response must not leak node_modules path');
        assert.ok(!dataStr.includes('Error:'), 'Response must not leak raw Error string');
      }
      console.log(`  [Pass] Bad credentials and SQL injection attempts return clean 401 JSON`);
    });

    it('3.2: Malformed and boundary registration inputs return clean 400 errors without crash', async () => {
      const invalidInputs = [
        { name: '', email: 'valid@test.com', password: 'password123' },
        { name: 'Sensei', email: '', password: 'password123' },
        { name: 'Sensei', email: 'notanemail', password: 'password123' },
        { name: 'Sensei', email: 'valid@test.com', password: '123' }, // < 6 chars
        { name: 'Sensei', email: 'valid@test.com', password: '' },
        {},
      ];

      for (const input of invalidInputs) {
        const res = await apiRequest('/api/auth/register', {
          method: 'POST',
          body: input
        });
        assert.equal(res.status, 400, `Invalid input ${JSON.stringify(input)} should return 400, got ${res.status}`);
        assert.ok(res.data.error, 'Response must have error description');
        const dataStr = JSON.stringify(res.data);
        assert.ok(!dataStr.includes('stack'), 'Response must not contain stack trace');
      }
      console.log(`  [Pass] 6 invalid registration edge cases return clean 400 JSON`);
    });
  });

  // =========================================================================
  // SCENARIO 4: Student & Certificate Persistence in PostgreSQL under Auth
  // =========================================================================
  describe('Scenario 4: PostgreSQL Persistence Under Authenticated Session', () => {

    it('4.1: Authenticated instructor creates student & certificate with full PostgreSQL persistence', async () => {
      // 1. Register authenticated instructor
      const instructor = generateInstructorData('cert_persist');
      const regRes = await apiRequest('/api/auth/register', { method: 'POST', body: instructor });
      assert.equal(regRes.status, 201);
      const token = regRes.data.token;

      // 2. Issue certificate with new student
      const certPayload = {
        studentName: `Carla Karateca ${Date.now()}`,
        rank: 'Faixa Marrom (1º Kyu)',
        associationName: 'Federação Paulista de Karatê',
        shihanName: 'Shihan Kenji',
        presidentName: 'Presidente Tanaka',
        issueDate: '2026-08-24'
      };

      const certRes = await apiRequest('/api/certificates', {
        method: 'POST',
        token,
        body: certPayload
      });

      assert.equal(certRes.status, 201, `Expected 201 on certificate creation, got ${certRes.status}: ${JSON.stringify(certRes.data)}`);
      assert.equal(certRes.data.success, true);
      assert.ok(certRes.data.certificate.id, 'Certificate ID must be returned');
      const certId = certRes.data.certificate.id;
      const studentId = certRes.data.certificate.studentId;
      assert.ok(studentId, 'Student ID must be returned');

      // 3. Empirically verify persistence directly in PostgreSQL using Prisma client
      const dbCert = await prisma.certificate.findUnique({
        where: { id: certId },
        include: { student: true }
      });

      assert.ok(dbCert, 'Certificate record MUST exist in PostgreSQL database');
      assert.equal(dbCert.id, certId);
      assert.equal(dbCert.associationName, certPayload.associationName);
      assert.equal(dbCert.shihanName, certPayload.shihanName);
      assert.equal(dbCert.presidentName, certPayload.presidentName);
      assert.equal(new Date(dbCert.issueDate).toISOString().split('T')[0], '2026-08-24');

      assert.ok(dbCert.student, 'Associated Student relation MUST exist in PostgreSQL');
      assert.equal(dbCert.student.id, studentId);
      assert.equal(dbCert.student.name, certPayload.studentName);
      assert.equal(dbCert.student.rank, certPayload.rank);

      console.log(`  [Pass] Certificate ID ${certId} & Student ID ${studentId} verified in PostgreSQL`);
    });

    it('4.2: Authenticated instructor creates certificate reusing existing student ID', async () => {
      // 1. Create a student first
      const existingStudent = await prisma.student.create({
        data: {
          name: `Aluno Preexistente ${Date.now()}`,
          rank: 'Faixa Verde (2º Kyu)'
        }
      });

      // 2. Register instructor
      const instructor = generateInstructorData('reuse_student');
      const regRes = await apiRequest('/api/auth/register', { method: 'POST', body: instructor });
      const token = regRes.data.token;

      // 3. Create certificate with existing studentId
      const certPayload = {
        studentId: existingStudent.id,
        associationName: 'Associação Budokan',
        shihanName: 'Shihan Otomo',
        presidentName: 'Presidente Morita',
        issueDate: '2026-08-25'
      };

      const certRes = await apiRequest('/api/certificates', {
        method: 'POST',
        token,
        body: certPayload
      });

      assert.equal(certRes.status, 201);
      assert.equal(certRes.data.certificate.studentId, existingStudent.id);

      // Verify DB
      const dbCert = await prisma.certificate.findUnique({
        where: { id: certRes.data.certificate.id }
      });
      assert.ok(dbCert);
      assert.equal(dbCert.studentId, existingStudent.id);
      console.log(`  [Pass] Certificate created reusing existing Student ID ${existingStudent.id} in PostgreSQL`);
    });

    it('4.3: Unauthenticated certificate creation does NOT write any record to PostgreSQL', async () => {
      const initialCertCount = await prisma.certificate.count();
      const initialStudentCount = await prisma.student.count();

      const unauthRes = await apiRequest('/api/certificates', {
        method: 'POST',
        body: {
          studentName: 'Hacker Student',
          rank: 'Faixa Preta (1º Dan)',
          associationName: 'Fake Dojo',
          shihanName: 'Fake Shihan',
          presidentName: 'Fake President',
          issueDate: '2026-08-24'
        }
      });

      assert.equal(unauthRes.status, 401, 'Unauthenticated request must be rejected with 401');

      // Verify no records inserted
      const finalCertCount = await prisma.certificate.count();
      const finalStudentCount = await prisma.student.count();

      assert.equal(finalCertCount, initialCertCount, 'No certificate record should be inserted without auth');
      assert.equal(finalStudentCount, initialStudentCount, 'No student record should be inserted without auth');
      console.log(`  [Pass] Unauthenticated request blocked: zero records inserted in PostgreSQL`);
    });
  });

  // =========================================================================
  // SCENARIO 5: Adversarial Boundary & Type Confusion Hardening
  // =========================================================================
  describe('Scenario 5: Adversarial Boundary & Type Confusion Hardening', () => {

    it('5.1: Token for non-existent user returns clean 404', async () => {
      // Validly signed token, but user ID 9999999 does not exist in DB
      const phantomToken = jwt.sign(
        { id: 9999999, email: 'phantom@dojo.com', name: 'Phantom Sensei' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await apiRequest('/api/auth/me', {
        method: 'GET',
        token: phantomToken
      });

      assert.equal(res.status, 404, `Phantom user should return 404, got ${res.status}`);
      assert.equal(res.data.error, 'Usuário não encontrado');
      console.log(`  [Pass] Phantom user token cleanly returns 404 without crash`);
    });

    it('5.2: Extreme payload sizes (10KB string) do not crash server or leak stack', async () => {
      const longString = 'A'.repeat(10000);
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: {
          email: `${longString}@dojo.com`,
          password: longString
        }
      });

      assert.equal(res.status, 401, `Extreme login payload should return 401, got ${res.status}`);
      assert.equal(res.data.error, 'Credenciais inválidas');
      console.log(`  [Pass] 10KB oversized payload handled cleanly`);
    });

    it('5.3: Type confusion in login fields (numbers, objects, booleans) handled safely', async () => {
      const typeConfusionPayloads = [
        { email: 123456, password: true },
        { email: { key: 'value' }, password: ['array', 'pass'] },
        { email: false, password: 0 },
        { email: null, password: null },
      ];

      for (const payload of typeConfusionPayloads) {
        const res = await apiRequest('/api/auth/login', {
          method: 'POST',
          body: payload
        });
        // Must return 400 or 401 and must not crash or leak stack
        assert.ok(
          res.status === 400 || res.status === 401,
          `Expected 400 or 401 for payload ${JSON.stringify(payload)}, got ${res.status}`
        );
        const dataStr = JSON.stringify(res.data);
        assert.ok(!dataStr.includes('stack'), 'Response must not contain stack trace');
      }
      console.log(`  [Pass] Type confusion payloads safely handled with 400/401`);
    });

    it('5.4: SQL injection strings in certificate creation are safely escaped by Prisma', async () => {
      const instructor = generateInstructorData('cert_sqli');
      const regRes = await apiRequest('/api/auth/register', { method: 'POST', body: instructor });
      const token = regRes.data.token;

      const sqliPayload = {
        studentName: "'; DROP TABLE \"Certificate\"; --",
        rank: "' OR '1'='1",
        associationName: "Shotokan'; DELETE FROM \"User\"; --",
        shihanName: "' UNION SELECT NULL, NULL --",
        presidentName: "President <script>alert(1)</script>",
        issueDate: '2026-08-24'
      };

      const certRes = await apiRequest('/api/certificates', {
        method: 'POST',
        token,
        body: sqliPayload
      });

      assert.equal(certRes.status, 201, `SQL injection strings should be stored as literal text, got ${certRes.status}`);

      // Verify certificate table still exists and record is stored literally
      const dbCert = await prisma.certificate.findUnique({
        where: { id: certRes.data.certificate.id },
        include: { student: true }
      });

      assert.ok(dbCert, 'Certificate record should exist');
      assert.equal(dbCert.student.name, "'; DROP TABLE \"Certificate\"; --");
      assert.equal(dbCert.associationName, "Shotokan'; DELETE FROM \"User\"; --");

      console.log(`  [Pass] SQL injection strings safely parameterized and stored as literal strings`);
    });
  });
});

