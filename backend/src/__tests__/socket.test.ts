import { describe, it, expect } from 'vitest';
import { getGridRoom, parseCookieHeader } from '../socket/socket.server';

describe('Socket.IO Server Helpers', () => {
  it('calculates deterministic 0.01-degree grid room ID correctly', () => {
    const room1 = getGridRoom(12.9716, 77.5946);
    expect(room1).toBe('geo:7759:1297');

    const room2 = getGridRoom(-33.8688, 151.2093);
    expect(room2).toBe('geo:15120:-3387');
  });

  it('parses HttpOnly cookie headers correctly', () => {
    const rawHeader = 'access_token=jwt_mock_token_123; refresh_token=jwt_refresh_456';
    const parsed = parseCookieHeader(rawHeader);

    expect(parsed.access_token).toBe('jwt_mock_token_123');
    expect(parsed.refresh_token).toBe('jwt_refresh_456');
  });

  it('handles empty or undefined cookie headers safely', () => {
    expect(parseCookieHeader(undefined)).toEqual({});
    expect(parseCookieHeader('')).toEqual({});
  });
});
