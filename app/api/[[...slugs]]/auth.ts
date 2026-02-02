import { redis } from "@/lib/redis"
import Elysia from "elysia"

class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AuthError"
  }
}

export const authMiddleware = new Elysia({ name: "auth" })
  .error({ AuthError })
  .onError(({ code, set }) => {
    if (code === "AuthError") {
      set.status = 401
      return { error: "Unauthorized" }
    }
  })
  .derive({ as: "scoped" }, async ({ query, cookie }) => {
    const roomId = query.roomId
    const token = cookie["x-auth-token"]?.value

    if (!roomId || !token) {
      throw new AuthError("Missing roomId or token.")
    }

    // Get list of connected tokens for this room
    const connected = await redis.hget<string[]>(`meta:${roomId}`, "connected")

    // Check if token is valid
    if (!connected || !connected.includes(token)) {
      throw new AuthError("Invalid token")
    }

    // Return auth info for downstream handlers
    return { auth: { roomId, token, connected } }
  })
