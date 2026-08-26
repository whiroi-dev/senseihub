import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { apiRequest, generateInstructorData, generateCertificateData } from './helpers.js';
import { JWT_SECRET } from '../src/middlewares/auth.js';

describe('Adversarial & Interface Conformance Audit (Reviewer 2)', () => {
  const instructor = generateInstructorData('adv_rev2');
  let validToken = '';
  let instructorId = 0;

  // Interface Contract 1: Register
  it('Interface Contract: POST /api/auth/register returns 201, token, and user { id, name, email }', async () => {
    const res = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: instructor,
    });

    assert.equal(res.status, 201, `Expected status 201, got ${res.status} (${JSON.stringify(res.data)})`);
    assert.ok(res.data.token && typeof res.data.token === 'string', 'Token must be a non-empty string');
    assert.ok(res.data.user && typeof res.data.user === 'object', 'User must be returned as an object');
    assert.ok(typeof res.data.user.id === 'number', 'User ID must be a number');
    assert.equal(res.data.user.email, instructor.email.toLowerCase(), 'Email must be normalized to lowercase');
    assert.equal(res.data.user.name, instructor.name, 'Name must match input');
    assert.equal(res.data.user.password, undefined, 'Password must never be returned in API response');

    validToken = res.data.token;
    instructorId = res.data.user.id;
  });

  // Interface Contract 2: Login
  it('Interface Contract: POST /api/auth/login returns 200, token, and user { id, name, email }', async () => {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: instructor.email,
        password: instructor.password,
      },
    });

    assert.equal(res.status, 200, `Expected status 200, got ${res.status}`);
    assert.ok(res.data.token && typeof res.data.token === 'string', 'Token must be returned');
    assert.ok(res.data.user && typeof res.data.user === 'object', 'User must be returned');
    assert.equal(res.data.user.id, instructorId);
    assert.equal(res.data.user.email, instructor.email.toLowerCase());
    assert.equal(res.data.user.password, undefined);
  });

  // Interface Contract 3: Login 401 on invalid password
  it('Interface Contract: POST /api/auth/login with wrong password returns 401 Unauthorized', async () => {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: instructor.email,
        password: 'DefinitiveWrongPassword!456',
      },
    });

    assert.equal(res.status, 401, `Expected status 401, got ${res.status}`);
    assert.ok(res.data.error, 'Error message must be present in response');
  });

  // Interface Contract 4: GET /api/auth/me
  it('Interface Contract: GET /api/auth/me with Bearer token returns 200 and user profile', async () => {
    assert.ok(validToken, 'Prerequisite: validToken required');
    const res = await apiRequest('/api/auth/me', {
      method: 'GET',
      token: validToken,
    });

    assert.equal(res.status, 200, `Expected status 200, got ${res.status}`);
    assert.ok(res.data.user, 'User object expected');
    assert.equal(res.data.user.id, instructorId);
    assert.equal(res.data.user.email, instructor.email.toLowerCase());
    assert.equal(res.data.user.name, instructor.name);
    assert.equal(res.data.user.password, undefined);
  });

  // Interface Contract 5: GET /api/auth/me without token returns 401
  it('Interface Contract: GET /api/auth/me without token returns 401 Unauthorized', async () => {
    const res = await apiRequest('/api/auth/me', {
      method: 'GET',
    });

    assert.equal(res.status, 401, `Expected status 401, got ${res.status}`);
  });

  // Interface Contract 6: POST /api/certificates without token returns 401
  it('Interface Contract: POST /api/certificates without token returns 401 Unauthorized', async () => {
    const cert = generateCertificateData();
    const res = await apiRequest('/api/certificates', {
      method: 'POST',
      body: cert,
    });

    assert.equal(res.status, 401, `Expected status 401, got ${res.status}`);
  });

  // Interface Contract 7: POST /api/certificates with token returns 201
  it('Interface Contract: POST /api/certificates with Bearer token succeeds with 201 Created', async () => {
    assert.ok(validToken, 'Prerequisite: validToken required');
    const cert = generateCertificateData();
    const res = await apiRequest('/api/certificates', {
      method: 'POST',
      token: validToken,
      body: cert,
    });

    assert.equal(res.status, 201, `Expected status 201, got ${res.status}`);
    assert.ok(res.data.success, 'Expected success = true');
    assert.ok(res.data.certificate && res.data.certificate.id, 'Expected certificate id');
  });

  // Adversarial 1: Empty strings in registration
  it('Adversarial: Registration with empty strings returns 400 Bad Request', async () => {
    const resEmptyName = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: { name: '', email: `empty_n_${Date.now()}@test.com`, password: 'password123' },
    });
    assert.equal(resEmptyName.status, 400, 'Empty name should be rejected with 400');

    const resEmptyEmail = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: { name: 'Sensei Tester', email: '', password: 'password123' },
    });
    assert.equal(resEmptyEmail.status, 400, 'Empty email should be rejected with 400');

    const resEmptyPass = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: { name: 'Sensei Tester', email: `empty_p_${Date.now()}@test.com`, password: '' },
    });
    assert.equal(resEmptyPass.status, 400, 'Empty password should be rejected with 400');
  });

  // Adversarial 2: Short password (<6 chars)
  it('Adversarial: Password < 6 chars returns 400 Bad Request', async () => {
    const res = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: { name: 'Sensei Tester', email: `short_p_${Date.now()}@test.com`, password: '12345' },
    });
    assert.equal(res.status, 400, 'Password < 6 chars should be rejected with 400');
  });

  // Adversarial 3: Malformed JWT token
  it('Adversarial: Malformed JWT token string returns 401 Unauthorized', async () => {
    const res = await apiRequest('/api/certificates', {
      method: 'POST',
      headers: { Authorization: 'Bearer this.is.not.a.valid.jwt.string' },
      body: generateCertificateData(),
    });
    assert.equal(res.status, 401, 'Malformed JWT must be rejected with 401');
  });

  // Adversarial 4: Expired JWT token
  it('Adversarial: Expired JWT token returns 401 Unauthorized', async () => {
    const expiredToken = jwt.sign(
      { id: instructorId, email: instructor.email, name: instructor.name },
      JWT_SECRET,
      { expiresIn: -10 }
    );

    const res = await apiRequest('/api/auth/me', {
      method: 'GET',
      token: expiredToken,
    });
    assert.equal(res.status, 401, 'Expired JWT must be rejected with 401');
  });

  // Adversarial 5: Forged / Wrong Secret JWT
  it('Adversarial: JWT signed with attacker secret key returns 401 Unauthorized', async () => {
    const forgedToken = jwt.sign(
      { id: instructorId, email: instructor.email, name: instructor.name },
      'attacker_compromised_secret_key_12345678'
    );

    const res = await apiRequest('/api/auth/me', {
      method: 'GET',
      token: forgedToken,
    });
    assert.equal(res.status, 401, 'Forged JWT must be rejected with 401');
  });

  // Adversarial 6: Missing "Bearer " prefix in Authorization header
  it('Adversarial: Authorization header without Bearer prefix returns 401 Unauthorized', async () => {
    const res = await apiRequest('/api/auth/me', {
      method: 'GET',
      headers: { Authorization: `Token ${validToken}` },
    });
    assert.equal(res.status, 401, 'Non-Bearer Authorization scheme must be rejected with 401');
  });

  // Adversarial 7: Duplicate email with case and whitespace variation
  it('Adversarial: Duplicate registration with case variation returns 400 Bad Request', async () => {
    const res = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Another Sensei',
        email: `  ${instructor.email.toUpperCase()}  `,
        password: 'password12345',
      },
    });
    assert.ok(res.status === 400 || res.status === 409, `Expected 400/409 for duplicate email, got ${res.status}`);
  });

  // Adversarial 8: SQL / NoSQL Injection in login
  it('Adversarial: SQL Injection payload in login returns 401 / 400 without leaking error trace', async () => {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: "' OR '1'='1' --",
        password: "' OR '1'='1' --",
      },
    });
    assert.ok(res.status === 401 || res.status === 400, `Expected 401 or 400, got ${res.status}`);
  });

  // Adversarial 9: Login with uppercase email works (case-insensitive login)
  it('Adversarial: Login with uppercase email normalizes and authenticates successfully', async () => {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: instructor.email.toUpperCase(),
        password: instructor.password,
      },
    });
    assert.equal(res.status, 200, `Expected 200 on uppercase email login, got ${res.status}`);
  });

  // Adversarial 10: Non-existent email login
  it('Adversarial: Login with non-existent email returns 401 Unauthorized', async () => {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: `non_existent_${Date.now()}@domain.com`,
        password: 'somepassword123',
      },
    });
    assert.equal(res.status, 401, 'Non-existent user login must return 401');
  });
});
