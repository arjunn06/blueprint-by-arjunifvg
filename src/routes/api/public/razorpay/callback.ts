import { createFileRoute } from "@tanstack/react-router";

const MAX_BODY_BYTES = 16 * 1024;

const redirect = (location: string) =>
  new Response(null, { status: 303, headers: { Location: location, "Cache-Control": "no-store" } });

/**
 * Where Razorpay sends the member's browser back after the bank step of the in-page checkout, on phones and
 * in in-app browsers (see src/lib/checkout-mode.ts). A form POST from razorpay.com, so there is no session:
 * the signature and a lookup at Razorpay decide what happens. Details in src/lib/razorpay-callback.server.ts.
 */
export const Route = createFileRoute("/api/public/razorpay/callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { parseCallback, signatureMatches, completeCallback, nextLocation } =
          await import("@/lib/razorpay-callback.server");

        const declared = Number(request.headers.get("content-length") ?? 0);
        if (declared > MAX_BODY_BYTES) return new Response("Payload too large", { status: 413 });
        const text = await request.text();
        if (text.length > MAX_BODY_BYTES) return new Response("Payload too large", { status: 413 });

        const parsed = parseCallback(new URLSearchParams(text));
        if (!parsed.ok) return redirect(nextLocation(parsed.kind, "rejected"));

        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!secret || !signatureMatches(secret, parsed.payload)) {
          console.warn("Razorpay callback: signature did not match", parsed.payload.kind);
          return redirect(nextLocation(parsed.payload.kind, "rejected"));
        }

        let outcome: "activated" | "pending" | "rejected";
        try {
          outcome = await completeCallback(parsed.payload);
        } catch (err) {
          console.error("Razorpay callback error", parsed.payload.kind, err);
          outcome = "pending"; // the payment is real and signed: let the page poll while the webhook lands
        }
        return redirect(nextLocation(parsed.payload.kind, outcome));
      },
    },
  },
});
