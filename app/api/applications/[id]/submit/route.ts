import { NextResponse } from 'next/server'

export function POST() { return NextResponse.json({ error: { code: 'DISABLED', message: 'Association role is not active.' } }, { status: 403 }) }
