// Centralized list of special users and helpers for OTP bypass and role lookup
// Strict typing and safe fallbacks for robustness

export type SpecialRole = 'main_admin' | 'admin' | 'privileged' | 'regular';

interface SpecialUser {
  role: SpecialRole;
  bypass: boolean;
}

// Keyed by normalized phone number (digits only)
export const SPECIAL_USERS: Record<string, SpecialUser> = {
  // Example seeded accounts for development/testing
  // Normalize to digits only (no +, spaces, or dashes)
  '15551234567': { role: 'main_admin', bypass: true },
  '15557654321': { role: 'admin', bypass: true },
  '19998887777': { role: 'privileged', bypass: true },
};

function normalizePhone(input: string | undefined | null): string {
  const raw = (input ?? '').toString();
  const digits = raw.replace(/\D/g, '');
  return digits;
}

export function hasOTPBypass(phoneNumber: string | undefined | null): boolean {
  try {
    const normalized = normalizePhone(phoneNumber);
    const user = SPECIAL_USERS[normalized];
    const canBypass = !!user?.bypass;
    console.log('[specialUsers] hasOTPBypass', { phoneNumber, normalized, canBypass });
    return canBypass;
  } catch (e) {
    console.warn('[specialUsers] hasOTPBypass error, defaulting to false', e);
    return false;
  }
}

export function getUserRole(phoneNumber: string | undefined | null): SpecialRole {
  try {
    const normalized = normalizePhone(phoneNumber);
    const user = SPECIAL_USERS[normalized];
    const role: SpecialRole = user?.role ?? 'regular';
    console.log('[specialUsers] getUserRole', { phoneNumber, normalized, role });
    return role;
  } catch (e) {
    console.warn('[specialUsers] getUserRole error, defaulting to regular', e);
    return 'regular';
  }
}

export function isSpecialUser(phoneNumber: string | undefined | null): boolean {
  return hasOTPBypass(phoneNumber) || getUserRole(phoneNumber) !== 'regular';
}
