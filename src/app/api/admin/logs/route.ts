import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Log } from '@/models/Log';

export async function GET() {
  try {
    await dbConnect();
    const logs = await Log.find({}).populate('user', 'name username').sort({ createdAt: -1 });
    return NextResponse.json(logs || []);
  } catch (error: any) {
    console.error("Error fetching system logs:", error);
    return NextResponse.json([], { status: 500 });
  }
}
