import { NextRequest, NextResponse } from "next/server";
import { getState, setState, startTimer, pauseTimer, resetTimer, updateStyle } from "@/lib/store";
import { TimerState, TimerStyle } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getState());
}

export async function PUT(request: NextRequest) {
  const body = await request.json();

  // Handle specific actions
  if (body.action) {
    switch (body.action) {
      case "start":
        startTimer();
        break;
      case "pause":
        pauseTimer();
        break;
      case "reset":
        resetTimer();
        break;
      case "updateStyle":
        updateStyle(body.style as TimerStyle);
        break;
      default:
        // Full state update
        setState(body.state as TimerState);
    }
    return NextResponse.json({ success: true, state: getState() });
  }

  // Full state replacement
  setState(body as TimerState);
  return NextResponse.json({ success: true, state: getState() });
}
