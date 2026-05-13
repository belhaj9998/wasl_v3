import jwt, { SignOptions } from "jsonwebtoken";
import { prisma } from "../setup/testDatabase";
import { UserFactory, StoreFactory } from "./factories";
import { config } from "../../configs/App.config";
import type { User, Store } from "../../../generated/prisma";

// ─── Auth Test Helpers ──────────────────────────────────────────────────────

/**
 * Creates a user in the test database and generates valid access + refresh tokens.
 * The refresh token is stored in the database (matching production behavior).
 *
 * @param overrides - Optional user field overrides passed to UserFactory.create()
 * @returns The created user, a signed JWT access token, and a raw refresh token
 */
export async function createAuthenticatedUser(
  overrides?: Parameters<typeof UserFactory.create>[0],
): Promise<{
  user: User;
  accessToken: string;
  refreshToken: string;
}> {
  const user = await UserFactory.create(overrides);

  const accessToken = jwt.sign(
    { userId: user.id, systemRole: user.system_role },
    config.jwtSecret,
    { expiresIn: config.jwtAccessExpiry as SignOptions["expiresIn"] },
  );

  // Generate a refresh token and store its hash in the DB (mirrors TokenService)
  const crypto = await import("crypto");
  const rawToken = crypto.randomBytes(40).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      user_id: user.id,
      token: hashedToken,
      expires_at: expiresAt,
    },
  });

  return { user, accessToken, refreshToken: rawToken };
}

/**
 * Creates a user, a store, an "Owner" StoreRole, and a StoreMembership linking them.
 * Returns everything needed to make authenticated store-admin requests.
 *
 * @param overrides - Optional overrides for user and store creation
 * @returns The user, store, store role, membership, and a signed access token
 */
export async function createStoreAdmin(overrides?: {
  user?: Parameters<typeof UserFactory.create>[0];
  store?: Parameters<typeof StoreFactory.create>[0];
}): Promise<{
  user: User;
  store: Store;
  accessToken: string;
}> {
  const user = await UserFactory.create(overrides?.user);
  const store = await StoreFactory.create(overrides?.store);

  // Create the Owner role for this store
  const ownerRole = await prisma.storeRole.create({
    data: {
      store_id: store.id,
      name: "Owner",
      slug: "owner",
      is_protected: true,
    },
  });

  // Create membership linking user to store with Owner role
  await prisma.storeMembership.create({
    data: {
      store_id: store.id,
      user_id: user.id,
      role_id: ownerRole.id,
      status: "ACTIVE",
      joined_at: new Date(),
    },
  });

  const accessToken = jwt.sign(
    { userId: user.id, systemRole: user.system_role },
    config.jwtSecret,
    { expiresIn: config.jwtAccessExpiry as SignOptions["expiresIn"] },
  );

  return { user, store, accessToken };
}

/**
 * Generates a JWT signed with the app's secret key for testing custom scenarios.
 * Useful for testing expired tokens, invalid payloads, missing fields, etc.
 *
 * @param payload - Custom JWT payload (e.g., { userId, systemRole })
 * @param expiresIn - Token expiry (defaults to "15m"). Use "0s" or negative for expired tokens.
 * @returns A signed JWT string
 */
export function generateTestToken(
  payload: Record<string, unknown>,
  expiresIn: string = "15m",
): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: expiresIn as SignOptions["expiresIn"],
  });
}
