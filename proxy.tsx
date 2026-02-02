import { NextRequest, NextResponse } from "next/server"
import { redis } from "./lib/redis"
import { nanoid } from "nanoid"

export const proxy = async (req: NextRequest) => {
  const pathname = req.nextUrl.pathname

  // Match /room/:roomId
  const roomMatch = pathname.match(/^\/room\/([^/]+)$/)
  if (!roomMatch) return NextResponse.redirect(new URL("/", req.url))

  const roomId = roomMatch[1]

  const meta = await redis.hgetall<{ connected: string[]; createdAt: number }>(
    `meta:${roomId}`
  )

  // Room does not exist
  if (!meta) {
    return NextResponse.redirect(new URL("/?error=room-not-found", req.url))
  }

  const existingToken = req.cookies.get("x-auth-token")?.value

  // If user already has a token in this room, allow
  if (existingToken && meta.connected.includes(existingToken)) {
    return NextResponse.next()
  }

  // Generate a new token for new user
  const token = nanoid()

  const response = NextResponse.next()
  response.cookies.set("x-auth-token", token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  })

  // Add token to connected users
  const updatedConnected = meta.connected ? [...meta.connected, token] : [token]
  await redis.hset(`meta:${roomId}`, { connected: updatedConnected })

  return response
}

export const config = {
  matcher: "/room/:path*",
}
