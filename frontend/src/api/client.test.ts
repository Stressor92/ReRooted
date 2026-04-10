import { describe, expect, it } from 'vitest';
import { API_BASE_URL, getApiErrorMessage, resolveApiUrl } from './client';

describe('api/client', () => {
  it('resolves relative API paths against the configured backend URL', () => {
    expect(resolveApiUrl('/persons')).toBe(`${API_BASE_URL}/persons`);
    expect(resolveApiUrl('tree')).toBe(`${API_BASE_URL}/tree`);
  });

  it('preserves absolute URLs and empty values', () => {
    expect(resolveApiUrl('https://example.test/file.png')).toBe('https://example.test/file.png');
    expect(resolveApiUrl(null)).toBeNull();
    expect(resolveApiUrl(undefined)).toBeNull();
  });

  it('extracts useful messages from Axios-style and generic errors', () => {
    const axiosLikeError = {
      isAxiosError: true,
      message: 'Request failed',
      response: { data: { detail: 'Backend says no' } },
    };

    expect(getApiErrorMessage(axiosLikeError)).toBe('Backend says no');
    expect(getApiErrorMessage(new Error('Boom'))).toBe('Boom');
  });
});
