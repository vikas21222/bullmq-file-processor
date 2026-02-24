import request from 'supertest';

// set auth env prior to importing app
process.env.BULLUI_USER = 'testuser';
process.env.BULLUI_PASS = 'testpass';
process.env.NODE_ENV = 'test';

import app from '../src/app.js';

describe('Bull UI auth', () => {
  it('returns 401 when no credentials provided', async () => {
    const res = await request(app).get('/bullui');
    expect(res.status).toBe(401);
  });

  it('returns 200 when correct credentials provided', async () => {
    const res = await request(app)
      .get('/bullui')
      .auth('testuser', 'testpass');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Bull UI/);
  });
});
