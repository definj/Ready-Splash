import { Prisma } from "@ready-splash/db";
import { tickerSchema } from "@ready-splash/types";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireUser } from "../lib/auth/requireUser.js";
import { prisma } from "../lib/prisma.js";

const listBody = z.object({
  name: z.string().min(1).max(120),
});

const itemBody = z.object({
  ticker: tickerSchema,
  notes: z.string().max(500).optional(),
  alertPrice: z.coerce.number().nonnegative().optional(),
});

const reorderBody = z.object({
  itemIds: z.array(z.string().min(1)).min(1),
});

export async function registerWatchlistRoutes(app: FastifyInstance) {
  app.get("/watchlists", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const lists = await prisma.watchlist.findMany({
      where: { userId: user.id },
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }, { addedAt: "asc" }],
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return {
      watchlists: lists.map((w) => ({
        id: w.id,
        name: w.name,
        createdAt: w.createdAt,
        items: w.items.map((i) => ({
          id: i.id,
          ticker: i.ticker,
          notes: i.notes,
          sortOrder: i.sortOrder,
          alertPrice: i.alertPrice != null ? Number(i.alertPrice) : null,
          addedAt: i.addedAt,
        })),
      })),
    };
  });

  app.post("/watchlists", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const parsed = listBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const wl = await prisma.watchlist.create({
      data: { userId: user.id, name: parsed.data.name },
    });
    return { watchlist: wl };
  });

  app.post<{ Params: { watchlistId: string } }>("/watchlists/:watchlistId/items", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const parsed = itemBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const { ticker, notes, alertPrice } = parsed.data as {
      ticker: string;
      notes?: string;
      alertPrice?: number;
    };
    const wl = await prisma.watchlist.findFirst({
      where: { id: request.params.watchlistId, userId: user.id },
    });
    if (!wl) {
      return reply.status(404).send({ error: "Watchlist not found" });
    }
    const maxRow = await prisma.watchlistItem.aggregate({
      where: { watchlistId: wl.id },
      _max: { sortOrder: true },
    });
    const nextOrder = (maxRow._max.sortOrder ?? -1) + 1;
    const item = await prisma.watchlistItem.upsert({
      where: {
        watchlistId_ticker: { watchlistId: wl.id, ticker },
      },
      create: {
        watchlistId: wl.id,
        ticker,
        notes,
        sortOrder: nextOrder,
        alertPrice: alertPrice == null ? undefined : new Prisma.Decimal(alertPrice),
      },
      update: {
        notes,
        alertPrice: alertPrice == null ? undefined : new Prisma.Decimal(alertPrice),
      },
    });
    return {
      item: {
        ...item,
        alertPrice: item.alertPrice != null ? Number(item.alertPrice) : null,
      },
    };
  });

  app.patch<{ Params: { watchlistId: string } }>("/watchlists/:watchlistId/order", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const parsed = reorderBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const wl = await prisma.watchlist.findFirst({
      where: { id: request.params.watchlistId, userId: user.id },
    });
    if (!wl) {
      return reply.status(404).send({ error: "Watchlist not found" });
    }
    const { itemIds } = parsed.data;
    const count = await prisma.watchlistItem.count({
      where: { watchlistId: wl.id, id: { in: itemIds } },
    });
    if (count !== itemIds.length) {
      return reply.status(400).send({ error: "itemIds must all belong to this watchlist" });
    }
    await prisma.$transaction(
      itemIds.map((id, i) =>
        prisma.watchlistItem.update({
          where: { id },
          data: { sortOrder: i },
        }),
      ),
    );
    return { ok: true };
  });

  app.delete<{ Params: { itemId: string } }>("/watchlists/items/:itemId", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const item = await prisma.watchlistItem.findFirst({
      where: { id: request.params.itemId },
      include: { watchlist: true },
    });
    if (!item || item.watchlist.userId !== user.id) {
      return reply.status(404).send({ error: "Item not found" });
    }
    await prisma.watchlistItem.delete({ where: { id: item.id } });
    return { ok: true };
  });
}
