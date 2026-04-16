import type { FastifyReply, FastifyRequest } from "fastify";
import { lucia } from "./lucia.js";

export async function validateRequestSession(request: FastifyRequest, reply: FastifyReply) {
  const sessionId = lucia.readSessionCookie(request.headers.cookie ?? "");
  if (!sessionId) {
    return { user: null, session: null } as const;
  }
  const result = await lucia.validateSession(sessionId);
  if (result.session?.fresh) {
    const cookie = lucia.createSessionCookie(result.session.id);
    reply.header("Set-Cookie", cookie.serialize());
  }
  return result;
}
