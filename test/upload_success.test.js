import request from 'supertest';

process.env.NODE_ENV = 'test';
import app from '../src/app.js';

describe('CSV Upload success (test mode)', () => {
  it('accepts CSV and returns 201 with file_upload_id', async () => {
    const res = await request(app)
      .post('/upload/upload')
      .field('upload_type', 'bse_scheme')
      .attach('file', 'test/fixtures/sample.csv');

    if (res.status !== 201) {
      console.error('Upload failed with status:', res.status);
      console.error('Response body:', res.body);
    }

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('file_upload_id');
  }, 10000);
});
