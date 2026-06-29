import { NextResponse } from 'next/server'

export function GET() { return NextResponse.json({ error: { code: 'DISABLED', message: 'Association role is not active.' } }, { status: 403 }) }
export function PUT() { return NextResponse.json({ error: { code: 'DISABLED', message: 'Association role is not active.' } }, { status: 403 }) }
