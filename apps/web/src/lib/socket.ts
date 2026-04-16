"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

function apiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

/** Singleton Socket.io client (browser only). */
export function getSocket(): Socket {
  if (typeof window === "undefined") {
    throw new Error("getSocket() must only run in the browser");
  }
  if (!socket) {
    socket = io(apiBaseUrl(), {
      path: "/socket.io/",
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
  }
  return socket;
}
