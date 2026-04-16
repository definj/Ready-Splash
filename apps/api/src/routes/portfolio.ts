import { Prisma } from "@ready-splash/db";
import { tickerSchema } from "@ready-splash/types";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireUser } from "../lib/auth/requireUser.js";
import { prisma } from "../lib/prisma.js";

const accountBody = z.object({
  label: z.string().min(1).max(120),
  broker: z.string().max(120).optional(),
});

const holdingBody = z.object({
  ticker: tickerSchema,
  shares: z.coerce.number().positive(),
  avgCostBasis: z.coerce.number().nonnegative(),
});

export async function registerPortfolioRoutes(app: FastifyInstance) {
  app.get("/portfolio/summary", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;

    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      include: { holdings: true },
      orderBy: { createdAt: "asc" },
    });

    let totalEquity = 0;
    const shaped = accounts.map((a) => {
      const holdings = a.holdings.map((h) => ({
        id: h.id,
        ticker: h.ticker,
        shares: Number(h.shares),
        avgCostBasis: Number(h.avgCostBasis),
        marketValue: null as number | null,
      }));
      const accountCost = holdings.reduce((s, h) => s + h.shares * h.avgCostBasis, 0);
      totalEquity += accountCost;
      return {
        id: a.id,
        label: a.label,
        broker: a.broker,
        createdAt: a.createdAt,
        holdings,
        costBasisTotal: accountCost,
      };
    });

    return {
      privacyMode: user.privacyMode,
      totalEquity,
      accounts: shaped,
    };
  });

  app.post("/portfolio/accounts", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const parsed = accountBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const acc = await prisma.account.create({
      data: { userId: user.id, label: parsed.data.label, broker: parsed.data.broker },
    });
    return { account: acc };
  });

  app.post<{ Params: { accountId: string } }>("/portfolio/accounts/:accountId/holdings", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const parsed = holdingBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const { ticker, shares, avgCostBasis } = parsed.data as {
      ticker: string;
      shares: number;
      avgCostBasis: number;
    };
    const account = await prisma.account.findFirst({
      where: { id: request.params.accountId, userId: user.id },
    });
    if (!account) {
      return reply.status(404).send({ error: "Account not found" });
    }
    const holding = await prisma.holding.upsert({
      where: {
        accountId_ticker: { accountId: account.id, ticker },
      },
      create: {
        accountId: account.id,
        ticker,
        shares: new Prisma.Decimal(shares),
        avgCostBasis: new Prisma.Decimal(avgCostBasis),
      },
      update: {
        shares: new Prisma.Decimal(shares),
        avgCostBasis: new Prisma.Decimal(avgCostBasis),
      },
    });
    return { holding: { ...holding, shares: Number(holding.shares), avgCostBasis: Number(holding.avgCostBasis) } };
  });

  app.delete<{ Params: { holdingId: string } }>("/portfolio/holdings/:holdingId", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const holding = await prisma.holding.findFirst({
      where: { id: request.params.holdingId },
      include: { account: true },
    });
    if (!holding || holding.account.userId !== user.id) {
      return reply.status(404).send({ error: "Holding not found" });
    }
    await prisma.holding.delete({ where: { id: holding.id } });
    return { ok: true };
  });
}
