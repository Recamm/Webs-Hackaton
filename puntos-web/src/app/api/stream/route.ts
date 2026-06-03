import { getState, addClient, removeClient, GameState } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial state
      const initialData = `data: ${JSON.stringify(getState())}\n\n`;
      controller.enqueue(encoder.encode(initialData));

      // Register for updates
      const sendUpdate = (state: GameState) => {
        try {
          const data = `data: ${JSON.stringify(state)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch {
          removeClient(sendUpdate);
        }
      };

      addClient(sendUpdate);

      // Cleanup on close - we keep a reference to remove later
      // The client disconnect will be handled by the catch above
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
