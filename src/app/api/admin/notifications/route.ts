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
    await dbConnect();
    const body = await req.json();
    const newPost = await Notification.create(body);
    const populated = await newPost.populate('author', 'name username role avatar');
    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { id, action, userId, content, commentId } = body;
    
    const post = await Notification.findById(id);
    if (!post) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    if (action === "LIKE") {
      const likes = post.likes as mongoose.Types.ObjectId[] || [];
      const hasLiked = likes.some(uid => String(uid) === String(userId));
      if (hasLiked) {
        post.likes = likes.filter(uid => String(uid) !== String(userId));
      } else {
        post.likes = [...likes, userId];
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
      post.isPinned = !post.isPinned;
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
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });

    await Notification.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
