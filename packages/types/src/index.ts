import { z } from "zod";

export * from "./market";

export const tickerSchema = z
  .string()
  .min(1)
  .max(16)
  .regex(/^[A-Z0-9.-]+$/, "Ticker must be uppercase symbols");

export type Ticker = z.infer<typeof tickerSchema>;

export const scenarioHorizonSchema = z.union([
  z.literal(30),
  z.literal(60),
  z.literal(90),
]);

export type ScenarioHorizon = z.infer<typeof scenarioHorizonSchema>;
