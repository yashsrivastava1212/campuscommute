import type { FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { verifyAccessToken, type AccessTokenPayload } from "../lib/jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: AccessTokenPayload;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const header = request.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return reply.status(401).send({ message: "Authentication required" });
  }

  const token = header.slice(7);

  try {
    request.user = verifyAccessToken(token);

    const [user] = await db
      .select({ isBanned: users.isBanned })
      .from(users)
      .where(eq(users.id, request.user.sub))
      .limit(1);

    if (user?.isBanned) {
      return reply.status(403).send({ message: "Account suspended" });
    }
  } catch {
    return reply.status(401).send({ message: "Invalid or expired token" });
  }
}
