import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest, generateInstructorData, generateCertificateData } from './helpers.js';

describe('R3: Nodemailer Ethereal Email & PDF Preview (Tiers 1 & 2)', () => {
  let authToken: string = '';

  before(async () => {
    const instructor = generateInstructorData('email_test');
    const regRes = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: instructor,
    });
    authToken = regRes.data?.token;
  });

  it('T3.1: POST /api/certificates triggers Ethereal email simulation and returns previewUrl', async () => {
    assert.ok(authToken, 'Prerequisite: Auth token required');

    const certData = generateCertificateData('student.karate@ethereal.test', 'Faixa Preta (1º Dan)');
    const res = await apiRequest('/api/certificates', {
      method: 'POST',
      token: authToken,
      body: certData,
    });

    assert.ok(
      res.status === 200 || res.status === 201,
      `Expected 200 or 201 for certificate creation, got ${res.status} (${JSON.stringify(res.data)})`
    );

    // Verify Certificate record
    assert.ok(res.data.certificate || res.data.id, 'Expected certificate object in response');
    const cert = res.data.certificate || res.data;
    assert.ok(cert.id, 'Certificate must have an id');
    assert.equal(cert.associationName, certData.associationName);

    // Verify Email simulation object & previewUrl
    assert.ok(res.data.email, 'Expected email object in response');
    assert.ok(res.data.email.previewUrl, 'Expected email.previewUrl to be returned');
    assert.ok(
      typeof res.data.email.previewUrl === 'string' && res.data.email.previewUrl.includes('ethereal.email'),
      `Expected previewUrl to contain 'ethereal.email', got: ${res.data.email.previewUrl}`
    );
  });

  it('T3.2: POST /api/certificates with accented Portuguese names handles encoding correctly', async () => {
    assert.ok(authToken, 'Prerequisite: Auth token required');

    const certData = {
      ...generateCertificateData('joao.muller@ethereal.test', 'Faixa Vermelha (4º Kyu)'),
      studentName: 'João Müller da Conceição e Gonçalves',
      associationName: 'Associação Tradição & Ação de Karatê-Dô',
    };

    const res = await apiRequest('/api/certificates', {
      method: 'POST',
      token: authToken,
      body: certData,
    });

    assert.ok(
      res.status === 200 || res.status === 201,
      `Expected success for accented names, got ${res.status}`
    );

    assert.ok(res.data.email?.previewUrl, 'Expected previewUrl to be returned for accented name');
  });

  it('T3.3: POST /api/certificates with missing mandatory fields returns 400 Bad Request', async () => {
    assert.ok(authToken, 'Prerequisite: Auth token required');

    const res = await apiRequest('/api/certificates', {
      method: 'POST',
      token: authToken,
      body: {
        studentEmail: 'incomplete@test.com',
        // Missing studentName, associationName, rank
      },
    });

    assert.equal(
      res.status,
      400,
      `Expected status 400 Bad Request for incomplete certificate data, got ${res.status}`
    );
  });
});
