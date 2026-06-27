// Next.js 16 type helpers
// In Next.js 16, dynamic route params are always a Promise. Always await them.
//
// Usage in route handlers:
//   export async function GET(_req: NextRequest, ctx: RouteContext<'/api/applications/[id]'>) {
//     const { id } = await ctx.params
//   }
//
// Usage in page components:
//   export default async function Page({ params }: { params: Promise<{ id: string }> }) {
//     const { id } = await params
//   }

import type { NextRequest } from 'next/server'

export type RouteHandler<TParams extends Record<string, string> = Record<string, string>> = (
  request: NextRequest,
  context: { params: Promise<TParams> }
) => Promise<Response>

// Common param shapes used across route handlers
export type IdParam = { id: string }
export type EntryIdParam = { id: string; entryId: string }
export type TeamIdParam = { id: string; teamId: string }
export type TournamentIdParam = { tournamentId: string }
export type AppIdParam = { appId: string }
export type CatIdParam = { id: string; catId: string }
