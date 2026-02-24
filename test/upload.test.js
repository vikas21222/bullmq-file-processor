import request from 'supertest';

process.env.NODE_ENV = 'test';
import app from '../src/app.js';

describe('Upload endpoint', () => {
  it('rejects non-csv uploads with 422 UnprocessableError', async () => {
    const res = await request(app)
      .post('/upload/upload')
      .attach('file', 'test/fixtures/dummy.pdf');

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error', 'UnprocessableError');
  });
});
