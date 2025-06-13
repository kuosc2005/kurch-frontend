import {
  db,
  project,
  projectCollaborators,
  userProfile,
  users,
} from "@/db/schema";
import { ProfileData } from "@/types/profile";
import { eq } from "drizzle-orm";
import nodemailer from "nodemailer";

export function isEmailValid(email: string): boolean {
  const emailRegex = /^[^\s@]+@(student\.ku\.edu\.np|ku\.edu\.np)$/;
  return emailRegex.test(email);
}

export function isStrongPassword(password: string): boolean {
  const minLength = 8;
  if (password.length < minLength) return false;

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return hasUpperCase && hasLowerCase && hasDigit && hasSpecialChar;
}

//send email:

// Create a transporter using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface SendOTPEmailParams {
  to: string;

  otp: string;
}

export async function sendOTPEmail({
  to,

  otp,
}: SendOTPEmailParams) {
  const mailOptions = {
    from: `"KURCH" <${process.env.SMTP_USER}>`,
    to,
    subject: "KURCH - Email Verification OTP",
    text: `
KURCH - Email Verification

Dear ${to},

To complete your registration, please verify your email using the following OTP:

${otp}

This OTP is valid for 5 minutes. Please do not share it with anyone.

If you did not request this, please ignore this email.

For assistance, contact kucc@ku.edu.np

© 2025 KURCH. All rights reserved.
	`.trim(),
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Error sending OTP email:", error);
    return { success: false, error };
  }
}

export async function getUserProfileData(
  userId: string
): Promise<ProfileData | null> {
  try {
    const results = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        title: userProfile.title,
        bio: userProfile.bio,
        education: userProfile.education,
        location: userProfile.location,
        department: userProfile.department,
        google_scholar: userProfile.google_scholar,
        website: userProfile.website,
        research_interests: userProfile.research_interests,
        ocrid: userProfile.orcid_id,
      })
      .from(users)
      .leftJoin(userProfile, eq(users.id, userProfile.user_id))
      .where(eq(users.id, userId));

    const row = results[0];

    if (!row) return null;

    const research_interests = row.research_interests
      ? row.research_interests.split(",").map((s) => s.trim())
      : [];

    const profileData: ProfileData = {
      name: row.name || "User",
      email: row.email,
      title: row.title || "",
      university: "Kathmandu University",
      location: row.location || "",
      education: row.education || "",
      bio: row.bio || "",
      research_interests,
      department: row.department || "",
      google_scholar: row.google_scholar || "",
      website: row.website || "",
      orcid: row.ocrid || "",
    };

    return profileData;
  } catch (err) {
    console.error("Error fetching joined user profile:", err);
    return null;
  }
}

export async function getAllProjects() {
  try {
    const projects = await db
      .select({
        id: project.id,
        title: project.title,
        user_id: project.user_id,
        description: project.description,
        tags: project.tags,
        categories: project.categories,
        technologies: project.technologies,
        updated_at: project.updated_at,
        semester: project.semester,
        field_of_study: project.field_of_study,
      })
      .from(project);

    if (!projects || projects.length === 0) {
      return null;
    }

    const projectsWithCollaborators = await Promise.all(
      projects.map(async (proj) => {
        const tags = JSON.parse(proj.tags);
        const categories = JSON.parse(proj.categories);
        const technologies = JSON.parse(proj.technologies);

        const collaborators = await db
          .select()
          .from(projectCollaborators)
          .where(eq(projectCollaborators.project_id, proj.id));

        return {
          ...proj,
          tags,
          categories,
          technologies,
          collaborators: collaborators || [],
        };
      })
    );

    return projectsWithCollaborators;
  } catch (error) {
    throw error;
  }
}
