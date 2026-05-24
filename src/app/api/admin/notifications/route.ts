import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Notification } from '@/models/Notification';
import mongoose from 'mongoose';

export async function GET() {
  try {
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

export async function POST(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const body = await req.json();
    body.author = userId;

    const newPost = await Notification.create(body);
    const populated = await newPost.populate('author', 'name username role avatar');
    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const body = await req.json();
    const { id, action, content, commentId } = body;
    
    const post = await Notification.findById(id);
    if (!post) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    if (action === "LIKE") {
      const likes = post.likes as mongoose.Types.ObjectId[] || [];
      const hasLiked = likes.some(uid => String(uid) === String(userId));
      if (hasLiked) {
        post.likes = likes.filter(uid => String(uid) !== String(userId));
      } else {
        post.likes = [...likes, new mongoose.Types.ObjectId(userId)];
      }
    } else if (action === "COMMENT") {
      if (!post.comments) post.comments = [];
      post.comments.push({ userId, content, createdAt: new Date() });
    } else if (action === "REPLY") {
      if (post.comments) {
        const comment = post.comments.find(c => String((c as any)._id) === commentId);
        if (comment) {
          if (!comment.replies) comment.replies = [];
          comment.replies.push({ userId, content, createdAt: new Date() });
        }
      }
    } else if (action === "TOGGLE_PIN") {
      if (userRole === '01' || userRole === '02') {
        post.isPinned = !post.isPinned;
      } else {
        return NextResponse.json({ success: false, error: "Forbidden: Not enough permissions to pin." }, { status: 403 });
      }
    }

    await post.save();
    const populated = await Notification.findById(id)
      .populate('author', 'name username role avatar')
      .populate('comments.userId', 'name username role avatar')
      .populate('comments.replies.userId', 'name username role avatar');
      
    return NextResponse.json({ success: true, data: populated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });

    const post = await Notification.findById(id);
    if (!post) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    if (String(post.author) === String(userId) || userRole === '01' || userRole === '02') {
      await Notification.findByIdAndDelete(id);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: "Forbidden: You don't have permission to delete this post." }, { status: 403 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

