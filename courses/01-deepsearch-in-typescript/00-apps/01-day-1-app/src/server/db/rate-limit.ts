import { db } from "~/server/db";
import { requests, users } from "~/server/db/schema";

import { eq, and, sql, gte, lte } from "drizzle-orm";

// Rate limiting configuration
const RATE_LIMIT_PER_DAY = 1; // 10 requests per day for non-admin users

// Helper function to check rate limit
export async function checkRateLimit(userId: string): Promise<{
  allowed: boolean;
  currentCount: number;
  limit: number;
  isAdmin: boolean;
}> {
  // First check if user is admin
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { isAdmin: true },
  });

  if (!user) {
    return {
      allowed: false,
      currentCount: 0,
      limit: RATE_LIMIT_PER_DAY,
      isAdmin: false,
    };
  }

  if (user.isAdmin) {
    return {
      allowed: true,
      currentCount: 0,
      limit: RATE_LIMIT_PER_DAY,
      isAdmin: true,
    };
  }

  // Count requests for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const result = await db
    .select({
      count: sql<number>`count(*)`.as("count"),
    })
    .from(requests)
    .where(
      and(
        eq(requests.userId, userId),
        gte(requests.requestDate, today),
        lte(requests.requestDate, tomorrow),
      ),
    );

  const currentCount = result[0]?.count ?? 0;
  const allowed = currentCount < RATE_LIMIT_PER_DAY;

  return { allowed, currentCount, limit: RATE_LIMIT_PER_DAY, isAdmin: false };
}

export async function recordRequest(
  userId: string,
  endpoint = "/api/chat",
): Promise<void> {
  await db.insert(requests).values({
    userId,
    endpoint,
  });
}
