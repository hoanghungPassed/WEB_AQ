import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Notification } from '@/models/Notification';

export async function GET() {
  try {
    await dbConnect();
    const notifications = await Notification.find({}).sort({ createdAt: -1 });
    return NextResponse.json(notifications || []);
  } catch (error: unknown) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json([], { status: 500 });
  }
}
