import dbConnect from "@/lib/mongodb";
import { Log } from "@/models/Log";
import { User } from "@/models/User";

export const logAction = async (userId: string, action: string, details: string) => {
  try {
    await dbConnect();
    let userDetails = { name: "Hệ thống", role: "ADMIN" };
    
    if (userId && userId !== "system") {
      const u = await User.findById(userId);
      if (u) {
        userDetails.name = u.name || u.username;
        userDetails.role = u.role;
      }
    }

    await Log.create({
      user: userDetails.name,
      role: userDetails.role,
      action: action,
      type: "SUCCESS",
      timestamp: new Date().toLocaleString("vi-VN"),
      details: details
    });
  } catch (error) {
    console.error("Lỗi khi ghi Log:", error);
  }
};
