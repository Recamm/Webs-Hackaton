import { getState, addClient, removeClient, GameState } from "@/lib/scores-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const initialData = `data: ${JSON.stringify(getState())}\n\n`;
      controller.enqueue(encoder.encode(initialData));
      const sendUpdate = (state: GameState) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(state)}\n\n`));
        } catch {
          removeClient(sendUpdate);
        }
      };
      addClient(sendUpdate);
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
