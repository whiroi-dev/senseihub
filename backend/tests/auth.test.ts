import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest, generateInstructorData, generateCertificateData } from './helpers.js';

describe('R1: Instructor Authentication & Route Security (Tiers 1 & 2)', () => {
  const instructor = generateInstructorData();
  let registeredToken: string = '';

  // Tier 1 & 2: Route Protection (401 on unauthenticated / invalid requests)
  it('T1.1: POST /api/certificates without token returns HTTP 401 Unauthorized', async () => {
    const certData = generateCertificateData();
    const res = await apiRequest('/api/certificates', {
      method: 'POST',
      body: certData,
    });

    assert.equal(
      res.status,
      401,
      `Expected status 401 Unauthorized when no token provided, got ${res.status} (${JSON.stringify(res.data)})`
    );
  });

  it('T1.2: POST /api/certificates with invalid token returns HTTP 401 Unauthorized', async () => {
    const certData = generateCertificateData();
    const res = await apiRequest('/api/certificates', {
      method: 'POST',
      token: 'invalid.jwt.token12345',
      body: certData,
    });

    assert.equal(
      res.status,
      401,
      `Expected status 401 Unauthorized when invalid token provided, got ${res.status}`
    );
  });

  it('T1.3: POST /api/certificates with malformed Authorization header returns HTTP 401 Unauthorized', async () => {
    const certData = generateCertificateData();
    const res = await apiRequest('/api/certificates', {
      method: 'POST',
      headers: { Authorization: 'Basic dXNlcjpwYXNz' },
      body: certData,
    });

    assert.equal(
      res.status,
      401,
      `Expected status 401 Unauthorized for non-Bearer auth header, got ${res.status}`
    );
  });

  // Tier 1: Registration
  it('T1.4: POST /api/auth/register creates instructor and returns token with user object', async () => {
    const res = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: instructor,
    });

    assert.ok(
      res.status === 200 || res.status === 201,
      `Expected status 200 or 201 on registration, got ${res.status} (${JSON.stringify(res.data)})`
    );
    assert.ok(res.data.token, 'Expected token to be returned in register response');
    assert.ok(typeof res.data.token === 'string', 'Token should be a string');
    assert.ok(res.data.user, 'Expected user object in register response');
    assert.equal(res.data.user.email, instructor.email, 'User email should match registered email');
    assert.equal(res.data.user.name, instructor.name, 'User name should match registered name');
    assert.equal(res.data.user.password, undefined, 'Password must not be returned in plaintext');

    registeredToken = res.data.token;
  });

  // Tier 2: Registration duplicate / validation
  it('T1.5: POST /api/auth/register with duplicate email returns 400 or 409', async () => {
    const res = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: instructor, // Same email
    });

    assert.ok(
      res.status === 400 || res.status === 409,
      `Expected status 400 or 409 for duplicate email, got ${res.status}`
    );
  });

  it('T1.6: POST /api/auth/register with missing required fields returns 400', async () => {
    const res = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: { name: 'Only Name' }, // Missing email & password
    });

    assert.equal(
      res.status,
      400,
      `Expected status 400 for missing registration fields, got ${res.status}`
    );
  });

  // Tier 1: Login
  it('T1.7: POST /api/auth/login with correct credentials returns 200 + token', async () => {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: instructor.email,
        password: instructor.password,
      },
    });

    assert.equal(res.status, 200, `Expected status 200 on valid login, got ${res.status} (${JSON.stringify(res.data)})`);
    assert.ok(res.data.token, 'Expected token to be returned on login');
    assert.ok(res.data.user, 'Expected user object on login');
    assert.equal(res.data.user.email, instructor.email);
  });

  it('T1.8: POST /api/auth/login with incorrect password returns 401', async () => {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: instructor.email,
        password: 'wrong_password_123',
      },
    });

    assert.equal(res.status, 401, `Expected status 401 for wrong password, got ${res.status}`);
  });

  it('T1.9: POST /api/auth/login with non-existent email returns 401', async () => {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: `nonexistent_${Date.now()}@example.com`,
        password: 'somepassword',
      },
    });

    assert.equal(res.status, 401, `Expected status 401 for non-existent email, got ${res.status}`);
  });

  // Tier 1 & 2: User Profile (GET /api/auth/me)
  it('T1.10: GET /api/auth/me with valid token returns user profile', async () => {
    assert.ok(registeredToken, 'Prerequisite: registered token must exist');

    const res = await apiRequest('/api/auth/me', {
      method: 'GET',
      token: registeredToken,
    });

    assert.equal(res.status, 200, `Expected status 200 on GET /api/auth/me, got ${res.status}`);
    assert.ok(res.data.user, 'Expected user object in response');
    assert.equal(res.data.user.email, instructor.email);
    assert.equal(res.data.user.name, instructor.name);
  });

  it('T1.11: GET /api/auth/me without token returns 401', async () => {
    const res = await apiRequest('/api/auth/me', {
      method: 'GET',
    });

    assert.equal(res.status, 401, `Expected status 401 on GET /api/auth/me without token, got ${res.status}`);
  });
});
