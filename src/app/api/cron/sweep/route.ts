import { NextResponse, type NextRequest } from "next/server";
import { sweep } from "@/lib/sweep";

export const maxDuration = 60;

// Vercel Cron calls this with the CRON_SECRET as a bearer token.
export const GET = async (request: NextRequest) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await sweep());
};
