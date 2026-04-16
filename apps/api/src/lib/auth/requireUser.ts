import type { FastifyReply, FastifyRequest } from "fastify";
import { validateRequestSession } from "./session.js";

export type SessionUser = NonNullable<Awaited<ReturnType<typeof validateRequestSession>>["user"]>;

export async function requireUser(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<SessionUser | null> {
  const { user } = await validateRequestSession(request, reply);
  if (!user) {
    void reply.status(401).send({ error: "Unauthorized" });
    return null;
  }
  return user;
}
