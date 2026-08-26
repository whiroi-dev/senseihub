import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest, generateInstructorData, generateCertificateData } from './helpers.js';

describe('R2: Statistics Dashboard Metrics (Tiers 1 & 2)', () => {
  let authToken: string = '';

  before(async () => {
    // Authenticate an instructor to get a valid token
    const instructor = generateInstructorData('stats_test');
    const regRes = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: instructor,
    });
    if (regRes.data?.token) {
      authToken = regRes.data.token;
    } else {
      const loginRes = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email: instructor.email, password: instructor.password },
      });
      authToken = loginRes.data?.token;
    }
  });

  it('T2.1: GET /api/dashboard/stats without token returns HTTP 401 Unauthorized', async () => {
    const res = await apiRequest('/api/dashboard/stats', {
      method: 'GET',
    });

    assert.equal(
      res.status,
      401,
      `Expected status 401 Unauthorized when unauthenticated, got ${res.status}`
    );
  });

  it('T2.2: GET /api/dashboard/stats with invalid token returns HTTP 401 Unauthorized', async () => {
    const res = await apiRequest('/api/dashboard/stats', {
      method: 'GET',
      token: 'bad.token.signature',
    });

    assert.equal(
      res.status,
      401,
      `Expected status 401 Unauthorized for bad token, got ${res.status}`
    );
  });

  it('T2.3: GET /api/dashboard/stats with valid token returns 200 with structured metrics', async () => {
    assert.ok(authToken, 'Prerequisite: Valid auth token required');

    const res = await apiRequest('/api/dashboard/stats', {
      method: 'GET',
      token: authToken,
    });

    assert.equal(
      res.status,
      200,
      `Expected status 200 on GET /api/dashboard/stats, got ${res.status} (${JSON.stringify(res.data)})`
    );

    const data = res.data;
    assert.ok(typeof data.totalCertificates === 'number', 'totalCertificates must be a number');
    assert.ok(data.totalCertificates >= 0, 'totalCertificates must be non-negative');

    assert.ok(typeof data.totalStudents === 'number', 'totalStudents must be a number');
    assert.ok(data.totalStudents >= 0, 'totalStudents must be non-negative');

    assert.ok(Array.isArray(data.rankDistribution), 'rankDistribution must be an array');
    if (data.rankDistribution.length > 0) {
      const firstItem = data.rankDistribution[0];
      assert.ok('rank' in firstItem, 'rankDistribution item must have rank');
      assert.ok('count' in firstItem, 'rankDistribution item must have count');
    }

    assert.ok(Array.isArray(data.recentCertificates), 'recentCertificates must be an array');
  });

  it('T2.4: GET /api/dashboard/stats totalCertificates increments after issuing certificate', async () => {
    assert.ok(authToken, 'Prerequisite: Valid auth token required');

    // 1. Get initial stats
    const initialStatsRes = await apiRequest('/api/dashboard/stats', {
      method: 'GET',
      token: authToken,
    });
    assert.equal(initialStatsRes.status, 200);
    const initialCount = initialStatsRes.data.totalCertificates;

    // 2. Issue a new certificate
    const targetRank = 'Faixa Roxa (1º Kyu)';
    const certData = generateCertificateData(undefined, targetRank);
    const createCertRes = await apiRequest('/api/certificates', {
      method: 'POST',
      token: authToken,
      body: certData,
    });
    assert.ok(
      createCertRes.status === 200 || createCertRes.status === 201,
      `Certificate creation failed with ${createCertRes.status}`
    );

    // 3. Get updated stats
    const updatedStatsRes = await apiRequest('/api/dashboard/stats', {
      method: 'GET',
      token: authToken,
    });
    assert.equal(updatedStatsRes.status, 200);
    const updatedCount = updatedStatsRes.data.totalCertificates;

    assert.equal(
      updatedCount,
      initialCount + 1,
      `Expected totalCertificates to increment by 1 (was ${initialCount}, now ${updatedCount})`
    );

    // 4. Verify the rank count is represented
    const rankItem = updatedStatsRes.data.rankDistribution.find((r: any) => r.rank === targetRank);
    assert.ok(rankItem, `Expected rankDistribution to contain '${targetRank}'`);
    assert.ok(rankItem.count >= 1, `Expected count for '${targetRank}' to be at least 1`);
  });
});
