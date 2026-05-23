import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ totalMails: 0, totalFines: 0, activeStaff: 0 });
}
