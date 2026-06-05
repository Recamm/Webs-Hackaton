import { NextRequest, NextResponse } from "next/server";
import { getScenes, saveScene, loadScene, deleteScene } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getScenes());
}

export async function POST(request: NextRequest) {
  const { action, id, name } = await request.json();

  switch (action) {
    case "save": {
      if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
      const scene = saveScene(name);
      return NextResponse.json({ success: true, scene });
    }
    case "load": {
      if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
      const loaded = loadScene(id);
      if (!loaded) return NextResponse.json({ error: "Scene not found" }, { status: 404 });
      return NextResponse.json({ success: true });
    }
    case "delete": {
      if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
      const deleted = deleteScene(id);
      if (!deleted) return NextResponse.json({ error: "Scene not found" }, { status: 404 });
      return NextResponse.json({ success: true });
    }
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}
