export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Notification } from '@/models/Notification';
import mongoose from 'mongoose';
import { checkPermission, logAuditTrail } from "@/lib/permissions";
import { pusherServer } from "@/lib/pusher";

export async function GET(req: NextRequest) {
  try {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 await dbConnect();
 const notifications = await Notification.find({})
 .populate('author', 'name username role avatar')
 .populate('comments.userId', 'name username role avatar')
 .populate('comments.replies.userId', 'name username role avatar')
 .sort({ createdAt: -1 });
 return NextResponse.json(notifications || []);
 } catch (error: unknown) {
 console.error("Error fetching notifications:", error);
 return NextResponse.json([], { status: 500 });
 }
}

export async function POST(req: NextRequest) {
 try {
 const userId = req.headers.get("x-user-id");
 if (!userId) return NextResponse.json({ error:"Unauthorized" }, { status: 401 });

 await dbConnect();
 const body = await req.json();
 body.author = userId;

 const newPost = await Notification.create(body);
 const populated = await newPost.populate('author', 'name username role avatar');

 // Notify clients about new newsfeed post
 try {
   await pusherServer.trigger("newsfeed", "new-post", populated);
 } catch (pushErr) {
   console.error("Pusher trigger newsfeed error:", pushErr);
 }

 return NextResponse.json({ success: true, data: populated }, { status: 201 });
 } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
 return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
 }
}

export async function PUT(req: NextRequest) {
 try {
 const userId = req.headers.get("x-user-id");
 const userRole = req.headers.get("x-user-role");
 if (!userId) return NextResponse.json({ error:"Unauthorized" }, { status: 401 });

 await dbConnect();
 const body = await req.json();
 const { id, action, content, commentId } = body;
 
 const post = await Notification.findById(id);
 if (!post) return NextResponse.json({ success: false, error:"Not found" }, { status: 404 });

 if (action ==="LIKE") {
 const likes = post.likes as mongoose.Types.ObjectId[] || [];
 const hasLiked = likes.some(uid => String(uid) === String(userId));
 if (hasLiked) {
 post.likes = likes.filter(uid => String(uid) !== String(userId));
 } else {
 post.likes = [...likes, new mongoose.Types.ObjectId(userId)];
 }
 } else if (action ==="COMMENT") {
 if (!post.comments) post.comments = [];
 post.comments.push({ userId, content, createdAt: new Date() });
 } else if (action ==="REPLY") {
 if (post.comments) {
 const comment = post.comments.find(c => String((c as any)._id) === commentId);
 if (comment) {
 if (!comment.replies) comment.replies = [];
 comment.replies.push({ userId, content, createdAt: new Date() });
 }
 }
 } else if (action ==="TOGGLE_PIN") {
  const hasPermission = await checkPermission(userRole || "", 4, ["all", "reports"]);
  if (hasPermission) {
  post.isPinned = !post.isPinned;
  await logAuditTrail(userId || "system", "TOGGLE_NEWSFEED_PIN_SUCCESS", "newsfeed", { id, isPinned: post.isPinned }, req);
  } else {
  await logAuditTrail(userId || "unknown", "UNAUTHORIZED_TOGGLE_NEWSFEED_PIN", "newsfeed", { id }, req);
  return NextResponse.json({ success: false, error:"Forbidden: Not enough permissions to pin." }, { status: 403 });
  }
  }

 await post.save();
 const populated = await Notification.findById(id)
 .populate('author', 'name username role avatar')
 .populate('comments.userId', 'name username role avatar')
 .populate('comments.replies.userId', 'name username role avatar');
 
 // Notify clients about post update
 try {
   await pusherServer.trigger("newsfeed", "update-post", populated);
 } catch (pushErr) {}

 return NextResponse.json({ success: true, data: populated });
 } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
 return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
 }
}

export async function DELETE(req: NextRequest) {
 try {
  const userId = req.headers.get("x-user-id");
  const userRole = req.headers.get("x-user-role");
  if (!userId) return NextResponse.json({ error:"Unauthorized" }, { status: 401 });

  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, error:"ID is required" }, { status: 400 });

  const post = await Notification.findById(id);
  if (!post) return NextResponse.json({ success: false, error:"Not found" }, { status: 404 });

  const hasPermission = await checkPermission(userRole || "", 4, ["all", "reports"]);
  if (String(post.author) === String(userId) || hasPermission) {
  await Notification.findByIdAndDelete(id);

  // Notify clients about deleted post
  try {
    await pusherServer.trigger("newsfeed", "delete-post", { id });
  } catch (pushErr) {}

  await logAuditTrail(userId || "system", "DELETE_NEWSFEED_POST_SUCCESS", "newsfeed", { id }, req);
  return NextResponse.json({ success: true });
  } else {
  await logAuditTrail(userId || "unknown", "UNAUTHORIZED_DELETE_NEWSFEED_POST", "newsfeed", { id }, req);
  return NextResponse.json({ success: false, error:"Forbidden: You don't have permission to delete this post." }, { status: 403 });
  }
 } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
 return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
 }
}
