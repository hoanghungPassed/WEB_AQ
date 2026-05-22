export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";

// In-memory store on the Node server (shared across normal/incognito)
// Since Next.js dev server runs as a single process on localhost, this global is shared.
const globalStore: Record<string, string> = {};

export async function GET() {
  return NextResponse.json(globalStore);
}

export async function POST(request: Request) {
  try {
    const updates = await request.json();
    for (const key of Object.keys(updates)) {
      if (updates[key] !== undefined && updates[key] !== null) {
        globalStore[key] = updates[key];
      }
    }
    return NextResponse.json({ success: true, store: globalStore });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function DELETE() {
  // Xóa toàn bộ server store để reset về trạng thái ban đầu
  for (const key of Object.keys(globalStore)) {
    delete globalStore[key];
  }
  return NextResponse.json({ success: true, message: "Server store cleared" });
}
