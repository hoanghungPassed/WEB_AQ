import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Kpi } from '@/models/Kpi';

export async function GET() {
  try {
    await dbConnect();
    const kpis = await Kpi.find({}).sort({ date: -1 });
    return NextResponse.json(kpis || []);
  } catch (error: any) {
    console.error("Error fetching KPI data:", error);
    return NextResponse.json([], { status: 500 });
  }
}
