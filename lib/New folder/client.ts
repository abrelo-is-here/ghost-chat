// lib/client.ts
import { treaty } from "@elysiajs/eden"
import type { App } from "../app/api/[[...slugs]]/route"  // only import the type, not runtime

// Create a typed treaty client pointing to your backend
export const client = treaty<App>("http://localhost:3000")
