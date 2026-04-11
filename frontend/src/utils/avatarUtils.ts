/**
 * Gibt die URL zum passenden Platzhalter-Avatar zurück.
 *
 * Generationslogik:
 *   generation 0  → Teenager  (gen0)
 *   generation 1  → 20–30 J.  (gen1)
 *   generation 2  → 40–50 J.  (gen2)
 *   generation 3+ → 60+ J.    (gen3)
 *
 * Geschlechtslogik:
 *   "male"    → _male.svg
 *   "female"  → _female.svg
 *   "diverse" → _female.svg  (Fallback — beide neutral genug)
 *   null      → _male.svg      (Fallback — neutral)
 */
export function getAvatarUrl(
  generation: number,
  gender: 'male' | 'female' | 'diverse' | null,
): string {
  const genKey = `gen${Math.min(Math.max(Math.floor(generation), 0), 3)}`;
  const genderKey = gender === 'female' || gender === 'diverse' ? 'female' : 'male';
  return `/avatars/${genKey}_${genderKey}.svg`;
}

/**
 * Typsichere Prüfung ob ein Profilbild vorhanden ist.
 * Gibt true zurück wenn profile_image_url gesetzt und nicht leer ist.
 */
export function hasProfileImage(url: string | null | undefined): url is string {
  return typeof url === 'string' && url.trim().length > 0;
}
