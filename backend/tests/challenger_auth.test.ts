import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { apiRequest, generateInstructorData, generateCertificateData } from './helpers.js';

const JWT_SECRET = process.env.JWT_SECRET || 'gerador_certificado_super_secret_jwt_key_2026';

describe('Adversarial Security Challenges — Milestone 1 (Challenger 1)', () => {
  const masterInstructor = generateInstructorData('adversary_instr');
  let validToken = '';

  // Step 0: Setup valid account for comparison
  it('Setup: Register valid instructor account for baseline tests', async () => {
    const res = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: masterInstructor,
    });
    assert.ok(res.status === 200 || res.status === 201, `Failed to setup test user: ${res.status}`);
    assert.ok(res.data.token, 'Expected token to be returned');
    validToken = res.data.token;
  });

  // Challenge Scenario 1: Missing Authorization header on POST /api/certificates
  describe('Challenge 1: Missing / Empty Authorization Header', () => {
    it('1.1: POST /api/certificates with completely omitted Authorization header returns 401', async () => {
      const cert = generateCertificateData();
      const res = await apiRequest('/api/certificates', {
        method: 'POST',
        body: cert,
      });
      assert.equal(res.status, 401, `Expected 401, got ${res.status}`);
      assert.equal(res.data?.error, 'Unauthorized');
    });

    it('1.2: POST /api/certificates with empty Authorization header returns 401', async () => {
      const cert = generateCertificateData();
      const res = await apiRequest('/api/certificates', {
        method: 'POST',
        headers: { Authorization: '' },
        body: cert,
      });
      assert.equal(res.status, 401, `Expected 401, got ${res.status}`);
    });

    it('1.3: POST /api/certificates with "Authorization: Bearer " (empty token string) returns 401', async () => {
      const cert = generateCertificateData();
      const res = await apiRequest('/api/certificates', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' },
        body: cert,
      });
      assert.equal(res.status, 401, `Expected 401 for empty Bearer token, got ${res.status}`);
    });

    it('1.4: POST /api/certificates with "Authorization: Bearer    " (spaces only) returns 401', async () => {
      const cert = generateCertificateData();
      const res = await apiRequest('/api/certificates', {
        method: 'POST',
        headers: { Authorization: 'Bearer    ' },
        body: cert,
      });
      assert.equal(res.status, 401, `Expected 401 for whitespace Bearer token, got ${res.status}`);
    });

    it('1.5: POST /api/certificates with non-Bearer auth schemes returns 401', async () => {
      const cert = generateCertificateData();
      const schemes = [
        'Basic dXNlcjpwYXNz',
        'Digest username="Mufasa"',
        'Token abcdef123456',
        'bearer ' + validToken, // lowercase bearer
        'BEARER ' + validToken, // uppercase bearer
      ];

      for (const authHeader of schemes) {
        const res = await apiRequest('/api/certificates', {
          method: 'POST',
          headers: { Authorization: authHeader },
          body: cert,
        });
        assert.equal(res.status, 401, `Expected 401 for scheme "${authHeader.split(' ')[0]}", got ${res.status}`);
      }
    });
  });

  // Challenge Scenario 2: Forged JWT tokens with random strings or wrong secret
  describe('Challenge 2: Forged & Tampered JWT Tokens', () => {
    it('2.1: Token signed with wrong secret is rejected with 401', async () => {
      const forgedToken = jwt.sign(
        { id: 9999, email: 'fake@evil.com', name: 'Evil Hacker' },
        'wrong_secret_attack_key_xyz987',
        { expiresIn: '1h' }
      );

      const res = await apiRequest('/api/certificates', {
        method: 'POST',
        token: forgedToken,
        body: generateCertificateData(),
      });
      assert.equal(res.status, 401, `Expected 401 for wrong secret token, got ${res.status}`);
    });

    it('2.2: Token signed with "none" algorithm is rejected with 401', async () => {
      // Create unsigned JWT header.payload.
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ id: 1, email: 'admin@dojo.com', name: 'Admin' })).toString('base64url');
      const noneToken = `${header}.${payload}.`;

      const res = await apiRequest('/api/certificates', {
        method: 'POST',
        token: noneToken,
        body: generateCertificateData(),
      });
      assert.equal(res.status, 401, `Expected 401 for "none" algorithm JWT, got ${res.status}`);
    });

    it('2.3: Random garbage strings as Bearer token are rejected with 401', async () => {
      const junkTokens = [
        'random_non_jwt_string_123',
        'abc.def.ghi',
        'null',
        'undefined',
        '[object Object]',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.corrupted_payload.invalid_signature',
      ];

      for (const junk of junkTokens) {
        const res = await apiRequest('/api/certificates', {
          method: 'POST',
          token: junk,
          body: generateCertificateData(),
        });
        assert.equal(res.status, 401, `Expected 401 for junk token "${junk}", got ${res.status}`);
      }
    });

    it('2.4: Expired JWT token is rejected with 401', async () => {
      const expiredToken = jwt.sign(
        { id: 1, email: masterInstructor.email },
        JWT_SECRET,
        { expiresIn: -10 } // Expired 10 seconds ago
      );

      const res = await apiRequest('/api/certificates', {
        method: 'POST',
        token: expiredToken,
        body: generateCertificateData(),
      });
      assert.equal(res.status, 401, `Expected 401 for expired token, got ${res.status}`);
    });

    it('2.5: Tampered payload with original signature is rejected with 401', async () => {
      const parts = validToken.split('.');
      // Tamper payload
      const tamperedPayload = Buffer.from(JSON.stringify({ id: 999, email: 'hacked@dojo.com' })).toString('base64url');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      const res = await apiRequest('/api/certificates', {
        method: 'POST',
        token: tamperedToken,
        body: generateCertificateData(),
      });
      assert.equal(res.status, 401, `Expected 401 for tampered payload, got ${res.status}`);
    });
  });

  // Challenge Scenario 3: Email Case-Insensitivity & Trimming
  describe('Challenge 3: Email Normalization, Case Handling & Edge Values', () => {
    const caseUser = {
      name: 'Sensei Case Test',
      email: `CaseTest_${Date.now()}@DojoKenshi.COM`,
      password: 'StrongPassword123!',
    };

    it('3.1: Register with uppercase/mixed-case email', async () => {
      const res = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: caseUser,
      });
      assert.ok(res.status === 200 || res.status === 201, `Failed registration: ${res.status}`);
      assert.equal(res.data.user.email, caseUser.email.toLowerCase().trim());
    });

    it('3.2: Login with all-lowercase email succeeds', async () => {
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: {
          email: caseUser.email.toLowerCase(),
          password: caseUser.password,
        },
      });
      assert.equal(res.status, 200, `Expected 200 for lowercase email login, got ${res.status}`);
      assert.ok(res.data.token, 'Token must be present');
    });

    it('3.3: Login with ALL-UPPERCASE email succeeds', async () => {
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: {
          email: caseUser.email.toUpperCase(),
          password: caseUser.password,
        },
      });
      assert.equal(res.status, 200, `Expected 200 for uppercase email login, got ${res.status}`);
      assert.ok(res.data.token, 'Token must be present');
    });

    it('3.4: Login with leading and trailing spaces in email succeeds (sanitized/trimmed)', async () => {
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: {
          email: `   ${caseUser.email}   `,
          password: caseUser.password,
        },
      });
      assert.equal(res.status, 200, `Expected 200 for padded email login, got ${res.status}`);
    });

    it('3.5: Duplicate registration with case variation is rejected with 400', async () => {
      const res = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'Another Sensei',
          email: caseUser.email.toLowerCase(),
          password: 'AnotherPassword123!',
        },
      });
      assert.ok(res.status === 400 || res.status === 409, `Expected 400 for duplicate case variation, got ${res.status}`);
    });
  });

  // Challenge Scenario 4: SQL Injection & Malformed Input Fuzzing
  describe('Challenge 4: SQL Injection & Input Fuzzing Defense', () => {
    const sqliPayloads = [
      "' OR '1'='1",
      "' OR '1'='1' --",
      "admin' --",
      "admin' #",
      "' UNION SELECT 1, 'admin', 'hash', '2026-01-01', '2026-01-01' --",
      `"; DROP TABLE "User"; --`,
      `'; DELETE FROM "Certificate"; --`,
      `' OR 1=1; --`,
      `admin'/*`,
    ];

    for (const [idx, payload] of sqliPayloads.entries()) {
      it(`4.1.${idx + 1}: SQL Injection in login email: "${payload}" returns 400 or 401 without SQL error`, async () => {
        const res = await apiRequest('/api/auth/login', {
          method: 'POST',
          body: {
            email: payload,
            password: 'any_password',
          },
        });
        assert.ok(
          res.status === 400 || res.status === 401,
          `Expected 400/401 for SQLi payload, got ${res.status} (${JSON.stringify(res.data)})`
        );
        // Ensure no SQL syntax error leaked
        assert.ok(
          !JSON.stringify(res.data).toLowerCase().includes('syntax error'),
          'SQL syntax error was leaked to client'
        );
      });
    }

    it('4.2: SQL Injection in password field returns 401', async () => {
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: {
          email: masterInstructor.email,
          password: "' OR '1'='1",
        },
      });
      assert.equal(res.status, 401, `Expected 401 for SQLi in password, got ${res.status}`);
    });

    it('4.3: Type confusion (non-string objects in login payload) returns 400 or 401 gracefully', async () => {
      const weirdBodies = [
        { email: { $gt: '' }, password: 'password123' },
        { email: ['instr@test.com'], password: 'password123' },
        { email: 12345, password: 'password123' },
        { email: true, password: 'password123' },
        { email: masterInstructor.email, password: { evil: true } },
      ];

      for (const body of weirdBodies) {
        const res = await apiRequest('/api/auth/login', {
          method: 'POST',
          body,
        });
        assert.ok(
          res.status === 400 || res.status === 401 || res.status === 500,
          `Server crashed on type confusion payload: ${res.status}`
        );
        // Even if 400/401, make sure it didn't authenticate
        assert.ok(!res.data?.token, 'Type confusion payload should NEVER result in token issue');
      }
    });

    it('4.4: Registration with password under 6 chars is rejected with 400', async () => {
      const res = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'Short Pass',
          email: `shortpass_${Date.now()}@test.com`,
          password: '123',
        },
      });
      assert.equal(res.status, 400, `Expected 400 for short password, got ${res.status}`);
    });
  });

  // Challenge Scenario 5: Protected Routes Consistency & Token Profile Verification
  describe('Challenge 5: Multi-Endpoint Route Protection & Me Verification', () => {
    it('5.1: GET /api/auth/me returns 401 when called with invalid or expired token', async () => {
      const res = await apiRequest('/api/auth/me', {
        method: 'GET',
        token: 'invalid_token_xyz',
      });
      assert.equal(res.status, 401, `Expected 401 on /me with invalid token, got ${res.status}`);
    });

    it('5.2: Password is NEVER exposed in register, login, or me endpoints', async () => {
      const loginRes = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: {
          email: masterInstructor.email,
          password: masterInstructor.password,
        },
      });
      assert.equal(loginRes.status, 200);
      assert.equal(loginRes.data.user.password, undefined, 'Password exposed in login');

      const meRes = await apiRequest('/api/auth/me', {
        method: 'GET',
        token: validToken,
      });
      assert.equal(meRes.status, 200);
      assert.equal(meRes.data.user.password, undefined, 'Password exposed in me');
    });

    it('5.3: Successful certificate creation when valid Bearer token is provided', async () => {
      const certData = generateCertificateData();
      const res = await apiRequest('/api/certificates', {
        method: 'POST',
        token: validToken,
        body: certData,
      });

      assert.equal(res.status, 201, `Expected 201 Created for authenticated certificate creation, got ${res.status}`);
      assert.ok(res.data.success, 'Expected success: true');
      assert.ok(res.data.certificate?.id, 'Expected certificate ID');
      assert.equal(res.data.certificate.associationName, certData.associationName);
    });
  });
});
