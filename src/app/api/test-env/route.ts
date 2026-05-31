export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET() {
 return NextResponse.json({ 
 env_keys: Object.keys(process.env),
 mongodb_uri_exists: !!process.env.MONGODB_URI,
 mongodb_uri_value: process.env.MONGODB_URI ||"UNDEFINED",
 node_env: process.env.NODE_ENV
 });
}
