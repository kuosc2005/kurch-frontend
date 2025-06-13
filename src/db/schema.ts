import {
  timestamp,
  pgTable,
  text,
  uuid,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

// Use Neon-provided connection string (often DATABASE_URL)
const connectionString = process.env.DATABASE_URL || "";

if (!connectionString) {
  throw new Error("Missing Neon DATABASE_URL environment variable");
}

// Neon requires SSL; postgres-js handles this automatically for Neon URLs.
const pool = postgres(connectionString, { max: 1 });

export const users = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash"),
  provider: text("provider").default("credentials"),
  profile_pic: text("profile_pic"),
  created_at: timestamp("created_at").defaultNow(),
  role: text("role").default("student").notNull(),
  is_verified: boolean("is_verified").default(false).notNull(),
});

export const email_otps = pgTable("email_otps", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  otp: text("otp").notNull(),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const userProfile = pgTable("user_profile", {
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .primaryKey(),
  title: text("title"),
  department: text("department"),
  bio: text("bio"),
  website: text("website"),
  education: text("education"),
  location: text("location"),
  orcid_id: text("orcid_id"),
  google_scholar: text("google_scholar"),
  research_interests: text("research_interests"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const project = pgTable("project", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  abstract: text("abstract").notNull(),
  tags: text("tags").notNull(),
  semester: text("semester").notNull(),
  field_of_study: text("field_of_study").notNull(),
  technologies: text("technologies").notNull(),
  categories: text("categories").notNull(),
  view_count: integer("view_count").default(0),
  like_count: integer("like_count").default(0),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at"),
  views: integer("views").default(0),
  forks: integer("forks").default(0),
  likes: integer("likes").default(0),
  shares: integer("shares").default(0),
  github_link: text("github_link"),
  report_link: text("report_link"),
});

export const projectCollaborators = pgTable("project_collaborators", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id"),
  project_id: uuid("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role").notNull(),
  email: text("email").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const db = drizzle(pool, {
  schema: {
    users,
    userProfile,
    email_otps,
    project,
    projectCollaborators,
  },
});
