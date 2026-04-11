import { describe, expect, it } from 'vitest';
import { getAvatarUrl, hasProfileImage } from './avatarUtils';

describe('avatarUtils', () => {
  it('maps generation and gender to the correct avatar asset', () => {
    expect(getAvatarUrl(0, 'male')).toBe('/avatars/gen0_male.svg');
    expect(getAvatarUrl(2, 'female')).toBe('/avatars/gen2_female.svg');
    expect(getAvatarUrl(4, 'diverse')).toBe('/avatars/gen3_female.svg');
    expect(getAvatarUrl(-2, null)).toBe('/avatars/gen0_male.svg');
  });

  it('detects whether a real profile image URL is present', () => {
    expect(hasProfileImage('/files/123')).toBe(true);
    expect(hasProfileImage('   ')).toBe(false);
    expect(hasProfileImage(null)).toBe(false);
    expect(hasProfileImage(undefined)).toBe(false);
  });
});
