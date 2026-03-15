// @ts-nocheck
import { auth } from "@/lib/auth";
import { getLiveNotificationsForUser } from "@/lib/live-notifications";

export const runtime = "nodejs";

function encodeSse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Yetkisiz", { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const sendSnapshot = async () => {
        const snapshot = await getLiveNotificationsForUser(session.user.id);
        controller.enqueue(encoder.encode(encodeSse("notifications", snapshot.body)));
      };

      await sendSnapshot();
      const interval = setInterval(() => {
        if (closed) return;
        void sendSnapshot();
      }, 5000);

      const keepAlive = setInterval(() => {
        if (closed) return;
        controller.enqueue(encoder.encode(": ping\n\n"));
      }, 15000);

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        clearInterval(keepAlive);
        controller.close();
      };

      // @ts-ignore
      controller.signal?.addEventListener?.("abort", close);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
