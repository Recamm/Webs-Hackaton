import { NextRequest, NextResponse } from "next/server";
import { getState, setState } from "@/lib/store";
import { GameState } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getState());
}

export async function PUT(request: NextRequest) {
  const body: GameState = await request.json();
  setState(body);
  return NextResponse.json({ success: true });
}
