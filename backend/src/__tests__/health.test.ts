import request from 'supertest';
import app from '../app';

describe('GET /health', () => {
  it('returns 200 with status healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.timestamp).toBeDefined();
  });
});
