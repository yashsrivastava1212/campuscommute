import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { institutes, refreshTokens, users } from "../db/schema.js";
import { normalizeEmail } from "../lib/email-domain.js";
import { nameFromEmail, resolveDisplayName } from "../lib/display-name.js";
import {
  getRefreshTokenExpiry,
  hashToken,
  signAccessToken,
  signRefreshToken,
  TOKEN_EXPIRY_SECONDS,
  verifyRefreshToken,
} from "../lib/jwt.js";

export type AuthUser = typeof users.$inferSelect;

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export async function findOrCreateUser(email: string): Promise<{
  user: AuthUser;
  isNewUser: boolean;
}> {
  const normalized = normalizeEmail(email);

  const [institute] = await db
    .select()
    .from(institutes)
    .where(eq(institutes.emailDomain, "gim.ac.in"))
    .limit(1);

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.campusEmail, normalized))
    .limit(1);

  if (existing) {
    if (existing.verificationStatus !== "VERIFIED") {
      const [updated] = await db
        .update(users)
        .set({
          verificationStatus: "VERIFIED",
          verifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id))
        .returning();
      return { user: updated, isNewUser: false };
    }
    if (!existing.displayName) {
      const [updated] = await db
        .update(users)
        .set({
          displayName: nameFromEmail(normalized),
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id))
        .returning();
      return { user: updated, isNewUser: false };
    }
    return { user: existing, isNewUser: false };
  }

  const [created] = await db
    .insert(users)
    .values({
      campusEmail: normalized,
      displayName: nameFromEmail(normalized),
      instituteId: institute?.id,
      verificationStatus: "VERIFIED",
      verifiedAt: new Date(),
    })
    .returning();

  return { user: created, isNewUser: true };
}

export async function issueAuthTokens(user: AuthUser): Promise<AuthTokens> {
  const payload = { sub: user.id, email: user.campusEmail };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: getRefreshTokenExpiry(),
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: TOKEN_EXPIRY_SECONDS,
  };
}

export async function refreshAuthTokens(
  refreshToken: string
): Promise<AuthTokens | null> {
  try {
    const payload = verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);

    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    if (!stored || stored.expiresAt < new Date()) {
      return null;
    }

    await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user) {
      return null;
    }

    return issueAuthTokens(user);
  } catch {
    return null;
  }
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  await db
    .delete(refreshTokens)
    .where(eq(refreshTokens.tokenHash, hashToken(refreshToken)));
}

export function serializeUser(user: AuthUser, isNewUser: boolean) {
  return {
    id: user.id,
    email: user.campusEmail,
    displayName: resolveDisplayName(user.displayName, user.campusEmail),
    isNewUser,
    profileComplete: Boolean(user.displayName),
  };
}
