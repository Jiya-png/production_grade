import { NextResponse } from "next/server";
import { getQueueStats } from "@/lib/queue";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const stats = getQueueStats();
    
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      queue: stats,
      uptime: process.uptime()
    };

    logger.debug("Health check", health);
    return NextResponse.json(health);
  } catch (e) {
    logger.error("Health check failed", e as Error);
    return NextResponse.json(
      { status: "unhealthy", error: "Internal error" },
      { status: 503 }
    );
  }
}
