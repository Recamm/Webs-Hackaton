import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { pin } = await request.json();
  const correctPin = process.env.CONTROL_PIN;

  // If no PIN is configured, access is open
  if (!correctPin) {
    return NextResponse.json({ success: true, required: false });
  }

  if (pin === correctPin) {
    return NextResponse.json({ success: true, required: true });
  }

  return NextResponse.json({ success: false, required: true }, { status: 401 });
}

export async function GET() {
  const correctPin = process.env.CONTROL_PIN;
  return NextResponse.json({ required: !!correctPin });
}
