import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest, generateInstructorData, createSamplePng, API_BASE_URL } from './helpers.js';

describe('R4: Dynamic Logo Upload & Static Serving (Tiers 1 & 2)', () => {
  let authToken: string = '';
  let uploadedLogoUrl: string = '';

  before(async () => {
    const instructor = generateInstructorData('logo_test');
    const regRes = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: instructor,
    });
    authToken = regRes.data?.token;
  });

  it('T4.1: POST /api/settings/logo without token returns HTTP 401 Unauthorized', async () => {
    const { buffer, fileName, mimeType } = createSamplePng();
    const formData = new FormData();
    formData.append('file', new Blob([buffer], { type: mimeType }), fileName);

    const res = await apiRequest('/api/settings/logo', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });

    assert.equal(
      res.status,
      401,
      `Expected status 401 for unauthenticated logo upload, got ${res.status}`
    );
  });

  it('T4.2: POST /api/settings/logo with valid token and image file returns logoUrl', async () => {
    assert.ok(authToken, 'Prerequisite: Auth token required');

    const { buffer, fileName, mimeType } = createSamplePng();
    const formData = new FormData();
    formData.append('file', new Blob([buffer], { type: mimeType }), fileName);

    const res = await apiRequest('/api/settings/logo', {
      method: 'POST',
      token: authToken,
      body: formData,
      isFormData: true,
    });

    assert.ok(
      res.status === 200 || res.status === 201,
      `Expected 200 or 201 for logo upload, got ${res.status} (${JSON.stringify(res.data)})`
    );

    assert.ok(res.data.logoUrl, 'Expected logoUrl in response data');
    assert.ok(
      typeof res.data.logoUrl === 'string' && res.data.logoUrl.includes('/uploads/'),
      `Expected logoUrl to include '/uploads/', got ${res.data.logoUrl}`
    );

    uploadedLogoUrl = res.data.logoUrl;
  });

  it('T4.3: GET /uploads/<filename> statically serves the uploaded image', async () => {
    assert.ok(uploadedLogoUrl, 'Prerequisite: uploaded logo URL must exist');

    const imageUrl = uploadedLogoUrl.startsWith('http')
      ? uploadedLogoUrl
      : `${API_BASE_URL}${uploadedLogoUrl}`;

    const res = await fetch(imageUrl, { method: 'GET' });
    assert.equal(
      res.status,
      200,
      `Expected 200 OK when fetching uploaded logo at ${imageUrl}, got ${res.status}`
    );

    const contentType = res.headers.get('content-type') || '';
    assert.ok(
      contentType.includes('image'),
      `Expected Content-Type to be an image type, got: ${contentType}`
    );

    const arrayBuffer = await res.arrayBuffer();
    assert.ok(arrayBuffer.byteLength > 0, 'Image file should not be empty');
  });

  it('T4.4: GET /api/settings/logo returns active logo URL', async () => {
    const res = await apiRequest('/api/settings/logo', {
      method: 'GET',
    });

    assert.equal(
      res.status,
      200,
      `Expected status 200 on GET /api/settings/logo, got ${res.status}`
    );

    assert.ok(res.data.logoUrl, 'Expected active logoUrl in settings response');
    assert.equal(res.data.logoUrl, uploadedLogoUrl, 'Active logoUrl should match the last uploaded logo');
  });

  it('T4.5: POST /api/settings/logo without file payload returns 400 Bad Request', async () => {
    assert.ok(authToken, 'Prerequisite: Auth token required');

    const emptyFormData = new FormData();

    const res = await apiRequest('/api/settings/logo', {
      method: 'POST',
      token: authToken,
      body: emptyFormData,
      isFormData: true,
    });

    assert.equal(
      res.status,
      400,
      `Expected status 400 for upload without file, got ${res.status}`
    );
  });
});
