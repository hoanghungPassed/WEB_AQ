import Pusher from "pusher";

// Server-side Pusher instance
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

const originalTrigger = pusher.trigger.bind(pusher);

// Cast to any to bypass strict type signature matching on method override
(pusher as any).trigger = function (
  channel: string | string[],
  event: string,
  data: any,
  socketIdOrParams?: any
): Promise<any> {
  return originalTrigger(channel, event, data, socketIdOrParams).catch(async (error: any) => {
    console.error(`[Pusher Error] Failed to trigger "${event}" on "${channel}":`, error);
    try {
      // Key Safety Lock: Dynamic Import to avoid circular dependencies and Edge crashes
      const LogModule = await import("@/models/Log");
      const Log = (LogModule as any).default || LogModule.Log;

      await Log.create({
        userId: "system",
        role: "SYSTEM",
        action: `Pusher Outage: Failed to trigger "${event}" on "${channel}". Error: ${error.message || error}`,
        type: "ERROR",
        timestamp: new Date()
      });
    } catch (dbLogErr) {
      console.error("Failed to write Pusher outage to DB Log:", dbLogErr);
    }
  });
};

export const pusherServer = pusher;
