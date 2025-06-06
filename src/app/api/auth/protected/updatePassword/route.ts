import { eq } from "drizzle-orm";
import { users } from "@/db/user_schema";
import { NextRequest, NextResponse } from "next/server";
import { isStrongPassword } from "@/lib/helper";
import { getUserByEmail, retrievePasswordHash } from "@/lib/auth/authHelper";
import bcrypt from "bcrypt";
import { getToken } from "next-auth/jwt";

export async function POST(req: NextRequest) {
  try {
    // Validate environment variable
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    // Unauthorized
    if (!token || !token.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { newPassword, currentPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 },
      );
    }

    // Check if user provided same password
    if (newPassword === currentPassword) {
      return NextResponse.json(
        { message: "Your new password cannot be same as old password" },
        { status: 400 },
      );
    }

    if (!isStrongPassword(newPassword)) {
      return NextResponse.json(
        {
          message:
            "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.",
        },
        { status: 400 },
      );
    }

    // Check if user exists
    const userRecord = await getUserByEmail(token.email);

    if (!userRecord) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Find a way to extract hash password of user to verify if current password matches
    const userPasswordObj = await retrievePasswordHash(userRecord.email);
    if (!userPasswordObj || !userPasswordObj.password) {
      return NextResponse.json(
        { message: "User has no password set" },
        { status: 404 },
      );
    }

    // Compare stored hash pass with current password of user to verify if current password is correct
    const isMatch = await bcrypt.compare(
      currentPassword,
      userPasswordObj.password,
    );

    if (!isMatch) {
      return NextResponse.json(
        { message: "Current password is incorrect" },
        { status: 401 },
      );
    }

    // Only hash the password if current password provided by user is correct
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Dynamic import to avoid build-time issues
    const { db } = await import("@/db/schema");

    // Update in db
    await db
      .update(users)
      .set({ password_hash: hashedPassword })
      .where(eq(users.email, token.email));

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Update password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
