import { auth, currentUser } from "@clerk/nextjs/server";

export type AppRole = "user" | "admin";

export type AppSession = {
  userId: string;
  email: string | null;
  role: AppRole;
};

function getAdminEmailAllowlist() {
  return new Set(
    (process.env.ADMIN_EMAIL_ALLOWLIST ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function getCurrentAppSession(): Promise<AppSession | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress ?? null;
  const normalizedEmail = email?.toLowerCase() ?? null;
  const role: AppRole = normalizedEmail && getAdminEmailAllowlist().has(normalizedEmail) ? "admin" : "user";

  return {
    userId,
    email,
    role,
  };
}

export async function requireAppSession() {
  const session = await getCurrentAppSession();

  if (!session) {
    throw new Error("AUTH_REQUIRED");
  }

  return session;
}

export async function requireAdminSession() {
  const session = await requireAppSession();

  if (session.role !== "admin") {
    throw new Error("ADMIN_REQUIRED");
  }

  return session;
}
