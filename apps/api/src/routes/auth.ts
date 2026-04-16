import argon2 from "argon2";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lucia } from "../lib/auth/lucia.js";
import { validateRequestSession } from "../lib/auth/session.js";
import { prisma } from "../lib/prisma.js";

const registerBody = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
});

const loginBody = registerBody;

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (request, reply) => {
    const parsed = registerBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: "Email already registered" });
    }
    const passwordHash = await argon2.hash(password);
    const user = await prisma.user.create({
      data: { email, passwordHash },
    });
    const session = await lucia.createSession(user.id, {});
    const cookie = lucia.createSessionCookie(session.id);
    reply.header("Set-Cookie", cookie.serialize());
    return reply.status(201).send({
      user: { id: user.id, email: user.email, privacyMode: user.privacyMode, createdAt: user.createdAt },
    });
  });

  app.post("/auth/login", async (request, reply) => {
    const parsed = loginBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.status(401).send({ error: "Invalid email or password" });
    }
    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      return reply.status(401).send({ error: "Invalid email or password" });
    }
    const session = await lucia.createSession(user.id, {});
    const cookie = lucia.createSessionCookie(session.id);
    reply.header("Set-Cookie", cookie.serialize());
    return {
      user: { id: user.id, email: user.email, privacyMode: user.privacyMode, createdAt: user.createdAt },
    };
  });

  app.post("/auth/logout", async (request, reply) => {
    const { session } = await validateRequestSession(request, reply);
    if (!session) {
      return reply.status(401).send({ error: "Not authenticated" });
    }
    await lucia.invalidateSession(session.id);
    reply.header("Set-Cookie", lucia.createBlankSessionCookie().serialize());
    return { ok: true };
  });

  app.get("/auth/me", async (request, reply) => {
    const { user: sessionUser } = await validateRequestSession(request, reply);
    if (!sessionUser) {
      return reply.status(401).send({ error: "Not authenticated" });
    }
    return {
      user: {
        id: sessionUser.id,
        email: sessionUser.email,
        privacyMode: sessionUser.privacyMode,
        createdAt: sessionUser.createdAt,
      },
    };
  });
}
