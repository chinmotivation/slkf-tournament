import { z } from 'zod'

// Zod v4 enforces RFC 9562 version/variant bits, which rejects well-known test UUIDs
// like 00000000-0000-0000-0000-000000000010 (version nibble = 0, variant = 0).
// This helper accepts any structurally valid UUID regardless of version/variant.
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

export function zodUuid(message: string) {
  return z.string().regex(UUID_RE, message)
}
