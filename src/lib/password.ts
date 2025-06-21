import { scrypt } from "@noble/hashes/scrypt";
import { randomBytes } from "@noble/hashes/utils";

/**
 * Hash a password using scrypt (Edge Runtime compatible)
 * @param password - The plain text password
 * @returns Promise<string> - The hashed password with salt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = scrypt(password, salt, { N: 16384, r: 8, p: 1, dkLen: 32 });

  // Combine salt and hash, encode as base64
  const combined = new Uint8Array(salt.length + hash.length);
  combined.set(salt);
  combined.set(hash, salt.length);

  return Buffer.from(combined).toString("base64");
}

/**
 * Verify a password against a hash (Edge Runtime compatible)
 * @param password - The plain text password to verify
 * @param hashedPassword - The stored hash
 * @returns Promise<boolean> - Whether the password matches
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  try {
    // For backwards compatibility with bcrypt hashes
    if (
      hashedPassword.startsWith("$2a$") ||
      hashedPassword.startsWith("$2b$") ||
      hashedPassword.startsWith("$2y$")
    ) {
      // This is a bcrypt hash - we need to handle this during migration
      // For now, return false to force password reset
      console.warn("Legacy bcrypt hash detected. User should reset password.");
      return false;
    }

    const combined = Buffer.from(hashedPassword, "base64");
    const salt = combined.slice(0, 16);
    const storedHash = combined.slice(16);

    const hash = scrypt(password, salt, { N: 16384, r: 8, p: 1, dkLen: 32 });

    // Constant-time comparison
    if (hash.length !== storedHash.length) return false;

    let result = 0;
    for (let i = 0; i < hash.length; i++) {
      result |= hash[i] ^ storedHash[i];
    }

    return result === 0;
  } catch (error) {
    console.error("Password verification error:", error);
    return false;
  }
}

/**
 * Migrate from bcrypt to scrypt hash
 * This should be called when a user logs in with a bcrypt hash
 */
export async function migrateBcryptPassword(
  password: string,
  bcryptHash: string,
): Promise<string | null> {
  try {
    // We can't verify bcrypt in Edge Runtime, so this would need to be done
    // in a Node.js runtime API route or during a migration script
    // For now, return null to indicate migration is needed
    return null;
  } catch (error) {
    console.error("Password migration error:", error);
    return null;
  }
}
