import { z } from "zod";

export const marketTickResponseSchema = z.object({
  ticker: z.string(),
  price: z.number(),
  volume: z.number(),
  ts: z.number(),
  source: z.enum(["redis", "polygon_rest", "yahoo_rest"]),
  marketOpen: z.boolean(),
});

export type MarketTickResponse = z.infer<typeof marketTickResponseSchema>;

export const tickPayloadSchema = z.object({
  ticker: z.string(),
  price: z.number(),
  volume: z.number(),
  ts: z.number(),
});

export type TickPayload = z.infer<typeof tickPayloadSchema>;
