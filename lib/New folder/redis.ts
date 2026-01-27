//creating redis DB

import { Redis } from "@upstash/redis";

export const redit = Redis.fromEnv() // read the .env file