import { getState, addClient, removeClient, TimerState } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const initialData = `data: ${JSON.stringify(getState())}\n\n`;
      controller.enqueue(encoder.encode(initialData));

      const sendUpdate = (state: TimerState) => {
        try {
          const data = `data: ${JSON.stringify(state)}\n\n`;
          controller.enqueue(encoder.encode(data));
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
