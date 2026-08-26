import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  apiRequest,
  generateInstructorData,
  generateCertificateData,
  createSamplePng,
  API_BASE_URL,
} from './helpers.js';

describe('Tier 3 & Tier 4: Cross-Feature Integration & Real-World Lifecycle', () => {
  const instructor = generateInstructorData('lifecycle');
  let token: string = '';
  let logoUrl: string = '';
  let initialTotalCertificates = 0;
  const issuedCertificates: any[] = [];

  it('Step 1: Instructor Registers and Authenticates', async () => {
    // 1. Register
    const regRes = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: instructor,
    });
    assert.ok(regRes.status === 200 || regRes.status === 201, `Register failed: ${regRes.status}`);
    token = regRes.data.token;
    assert.ok(token, 'Token must be present in registration response');

    // 2. Verify /api/auth/me
    const meRes = await apiRequest('/api/auth/me', {
      method: 'GET',
      token,
    });
    assert.equal(meRes.status, 200);
    assert.equal(meRes.data.user.email, instructor.email);
  });

  it('Step 2: Check Initial Dashboard Metrics', async () => {
    const statsRes = await apiRequest('/api/dashboard/stats', {
      method: 'GET',
      token,
    });
    assert.equal(statsRes.status, 200);
    initialTotalCertificates = statsRes.data.totalCertificates;
    assert.ok(typeof initialTotalCertificates === 'number');
  });

  it('Step 3: Upload Association Logo & Verify Availability', async () => {
    const { buffer, fileName, mimeType } = createSamplePng();
    const formData = new FormData();
    formData.append('file', new Blob([buffer], { type: mimeType }), fileName);

    const uploadRes = await apiRequest('/api/settings/logo', {
      method: 'POST',
      token,
      body: formData,
      isFormData: true,
    });
    assert.ok(uploadRes.status === 200 || uploadRes.status === 201, 'Logo upload failed');
    logoUrl = uploadRes.data.logoUrl;
    assert.ok(logoUrl, 'Logo URL must be returned');

    // Verify static access
    const staticUrl = logoUrl.startsWith('http') ? logoUrl : `${API_BASE_URL}${logoUrl}`;
    const staticRes = await fetch(staticUrl);
    assert.equal(staticRes.status, 200, 'Uploaded logo must be statically accessible');

    // Verify settings endpoint returns updated logo
    const settingsRes = await apiRequest('/api/settings/logo');
    assert.equal(settingsRes.status, 200);
    assert.equal(settingsRes.data.logoUrl, logoUrl);
  });

  it('Step 4: Issue Multiple Certificates with Varied Belt Ranks & Verify Ethereal Preview', async () => {
    const testRanks = [
      'Faixa Branca (6º Kyu)',
      'Faixa Amarela (5º Kyu)',
      'Faixa Preta (1º Dan)',
    ];

    for (const rank of testRanks) {
      const certData = generateCertificateData(undefined, rank);
      const res = await apiRequest('/api/certificates', {
        method: 'POST',
        token,
        body: certData,
      });

      assert.ok(
        res.status === 200 || res.status === 201,
        `Failed to issue certificate for rank ${rank}: ${res.status}`
      );

      // Verify certificate data
      const cert = res.data.certificate || res.data;
      assert.ok(cert.id, 'Certificate ID must exist');
      issuedCertificates.push({ ...cert, rank });

      // Verify email simulation and previewUrl
      assert.ok(res.data.email, 'Email result must be present in response');
      assert.ok(res.data.email.previewUrl, 'Email previewUrl must be present in response');
      assert.ok(
        res.data.email.previewUrl.includes('ethereal.email'),
        `Preview URL must point to ethereal.email, got ${res.data.email.previewUrl}`
      );
    }

    assert.equal(issuedCertificates.length, 3, 'Should have issued 3 certificates');
  });

  it('Step 5: Verify Dashboard Statistics Updated with New Certificates and Ranks', async () => {
    const statsRes = await apiRequest('/api/dashboard/stats', {
      method: 'GET',
      token,
    });

    assert.equal(statsRes.status, 200);
    const updatedStats = statsRes.data;

    // 1. Total certificates should have increased by 3
    assert.equal(
      updatedStats.totalCertificates,
      initialTotalCertificates + 3,
      `totalCertificates should have increased by 3 (from ${initialTotalCertificates} to ${initialTotalCertificates + 3})`
    );

    // 2. Rank distribution should contain entries for all 3 issued ranks
    const ranksToCheck = ['Faixa Branca (6º Kyu)', 'Faixa Amarela (5º Kyu)', 'Faixa Preta (1º Dan)'];
    for (const rank of ranksToCheck) {
      const rankEntry = updatedStats.rankDistribution.find((r: any) => r.rank === rank);
      assert.ok(rankEntry, `Rank distribution should include entry for '${rank}'`);
      assert.ok(rankEntry.count >= 1, `Rank count for '${rank}' should be >= 1`);
    }

    // 3. Recent certificates should include the latest issued certificates
    assert.ok(Array.isArray(updatedStats.recentCertificates), 'recentCertificates should be an array');
    assert.ok(updatedStats.recentCertificates.length > 0, 'recentCertificates should not be empty');
  });

  it('Step 6: Adversarial & Security Boundary Verification', async () => {
    // 1. Forged token rejected
    const forgedTokenRes = await apiRequest('/api/certificates', {
      method: 'POST',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDcSemACt8x4iTMCda8Yhe3iZaWbvV5XKSTbuAn0M',
      body: generateCertificateData(),
    });
    assert.equal(forgedTokenRes.status, 401, 'Forged JWT must be rejected with 401');

    // 2. Stats without auth rejected
    const unauthStats = await apiRequest('/api/dashboard/stats');
    assert.equal(unauthStats.status, 401, 'Unauthenticated stats request must be rejected with 401');

    // 3. Logo upload without auth rejected
    const { buffer, fileName, mimeType } = createSamplePng();
    const formData = new FormData();
    formData.append('file', new Blob([buffer], { type: mimeType }), fileName);
    const unauthLogo = await apiRequest('/api/settings/logo', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
    assert.equal(unauthLogo.status, 401, 'Unauthenticated logo upload must be rejected with 401');
  });
});
