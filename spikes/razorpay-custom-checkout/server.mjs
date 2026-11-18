// THROWAWAY SPIKE: can Razorpay Custom Checkout (razorpay.js `createPayment`) authorise a *Subscription*?
//
// Test mode only. Nothing here touches Supabase, the app's code, or live keys:
//   - reads RAZORPAY_TEST_* (never RAZORPAY_KEY_ID), and refuses anything but an `rzp_test_` key
//   - listens on 127.0.0.1 only and rejects foreign Host/Origin headers
//   - never logs or returns the secret
//
// Run:  node server.mjs        (from this folder, after creating .env.local — see README.md)
import { createServer } from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
try {
  process.loadEnvFile(join(here, ".env.local"));
} catch {
  /* no file: variables may come from the shell */
}

const KEY_ID = process.env.RAZORPAY_TEST_KEY_ID ?? "";
const KEY_SECRET = process.env.RAZORPAY_TEST_KEY_SECRET ?? "";
const PLAN_ID = process.env.RAZORPAY_TEST_PLAN_ID ?? "";
const PORT = Number(process.env.PORT ?? 8787);

if (!KEY_ID.startsWith("rzp_test_") || !KEY_SECRET) {
  console.error(
    "Refusing to start: set RAZORPAY_TEST_KEY_ID (must start with rzp_test_) and RAZORPAY_TEST_KEY_SECRET.\n" +
      "Put them in spikes/razorpay-custom-checkout/.env.local (git-ignored). See README.md.",
  );
  process.exit(1);
}
if (PLAN_ID && !PLAN_ID.startsWith("plan_")) {
  console.error("RAZORPAY_TEST_PLAN_ID should look like plan_XXXXXXXX, or be left empty.");
  process.exit(1);
}

// Mirrors BLUE_PILL_TOTAL_PAISE in src/lib/pricing.ts (₹499 + 18% GST).
const PLAN_AMOUNT_PAISE = 58882;

const AUTH = "Basic " + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");

class HttpError extends Error {
  constructor(status, message, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

async function rzp(path, init = {}) {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: init.method ?? "GET",
    headers: { Authorization: AUTH, "Content-Type": "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new HttpError(
      502,
      json?.error?.description ?? `Razorpay returned ${res.status}`,
      json?.error,
    );
  }
  return json;
}

let planCache = null;
async function getPlan() {
  if (planCache) return planCache;
  planCache = PLAN_ID
    ? await rzp(`/plans/${PLAN_ID}`)
    : await rzp("/plans", {
        method: "POST",
        body: {
          period: "monthly",
          interval: 1,
          item: { name: "Spike - Blue Pill monthly", amount: PLAN_AMOUNT_PAISE, currency: "INR" },
          notes: { spike: "custom-checkout" },
        },
      });
  return planCache;
}

const pick = (obj, keys) =>
  Object.fromEntries(keys.filter((k) => obj?.[k] !== undefined).map((k) => [k, obj[k]]));
const settled = (r) =>
  r.status === "fulfilled" ? r.value : { error: r.reason?.message ?? "failed" };

function safeEqualHex(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// Single-user spike: remember the subscription we created last, so the redirect (/callback) flow can verify
// against OUR id rather than the one Razorpay posts back.
let lastSubscriptionId = null;

// Same check as verifySubscriptionPayment in src/lib/billing.functions.ts, plus a lookup so the page can show
// what Razorpay recorded (subscription status, payment method).
async function verifyAndLookup(pid, sid, sig) {
  if (!/^pay_\w+$/.test(pid) || !/^sub_\w+$/.test(sid))
    throw new HttpError(400, "Bad payment or subscription id");
  const expected = createHmac("sha256", KEY_SECRET).update(`${pid}|${sid}`).digest("hex");
  if (!safeEqualHex(expected, sig)) throw new HttpError(400, "Signature verification failed");
  const [sub, pay] = await Promise.allSettled([
    rzp(`/subscriptions/${sid}`),
    rzp(`/payments/${pid}`),
  ]);
  const payment = settled(pay);
  return {
    signatureValid: true,
    subscription: pick(settled(sub), [
      "id",
      "status",
      "paid_count",
      "current_start",
      "current_end",
      "charge_at",
      "error",
    ]),
    payment: {
      ...pick(payment, [
        "id",
        "status",
        "method",
        "amount",
        "currency",
        "captured",
        "vpa",
        "error_code",
        "error_description",
        "error",
      ]),
      card: payment.card ? pick(payment.card, ["network", "type", "last4", "issuer"]) : undefined,
    },
  };
}

const okHosts = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);
const hostOk = (req) => okHosts.has(req.headers.host ?? "");
function originOk(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return okHosts.has(new URL(origin).host);
  } catch {
    return false;
  }
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16_384) throw new HttpError(413, "Body too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readJson(req) {
  const text = await readBody(req);
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
}

const readForm = async (req) => new URLSearchParams(await readBody(req));

const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

function send(res, status, body, type = "application/json") {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
}

const STATIC = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/standard": ["standard.html", "text/html; charset=utf-8"],
  "/common.js": ["common.js", "text/javascript; charset=utf-8"],
};

const server = createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url ?? "/", "http://localhost");
    // /callback is the one route a foreign Origin may reach: Razorpay's page POSTs the browser back to it.
    // That is safe because it only acts on a payload whose HMAC signature verifies, and escapes all output.
    if (!hostOk(req) || (pathname !== "/callback" && !originOk(req)))
      throw new HttpError(403, "Forbidden");

    if (req.method === "GET" && STATIC[pathname]) {
      const [file, type] = STATIC[pathname];
      return send(res, 200, await readFile(join(here, file), "utf8"), type);
    }

    if (req.method === "GET" && pathname === "/config") {
      return send(res, 200, { keyId: KEY_ID, planConfigured: Boolean(PLAN_ID) });
    }

    if (req.method === "POST" && pathname === "/api/subscription") {
      const plan = await getPlan();
      const sub = await rzp("/subscriptions", {
        method: "POST",
        body: {
          plan_id: plan.id,
          total_count: 12,
          customer_notify: 0,
          notes: { spike: "custom-checkout" },
        },
      });
      lastSubscriptionId = sub.id;
      return send(res, 200, {
        subscriptionId: sub.id,
        status: sub.status,
        planId: plan.id,
        amount: plan.item.amount,
        currency: plan.item.currency,
      });
    }

    if (req.method === "POST" && pathname === "/api/verify") {
      const b = await readJson(req);
      const result = await verifyAndLookup(
        String(b.razorpay_payment_id ?? ""),
        String(b.razorpay_subscription_id ?? ""),
        String(b.razorpay_signature ?? ""),
      );
      return send(res, 200, result);
    }

    // The `callback_url` (full-page redirect) variant: Razorpay navigates the whole tab here with a form POST.
    if (req.method === "POST" && pathname === "/callback") {
      const form = await readForm(req);
      const pid = form.get("razorpay_payment_id");
      const sig = form.get("razorpay_signature");
      const returnedSid = form.get("razorpay_subscription_id");
      let outcome;
      if (pid && sig) {
        try {
          // Verify against OUR subscription id, never the one in the POST body.
          outcome = {
            ...(await verifyAndLookup(pid, lastSubscriptionId ?? "", sig)),
            postedSubscriptionIdMatchesOurs: returnedSid === lastSubscriptionId,
          };
        } catch (e) {
          outcome = { signatureValid: false, error: e.message };
        }
      } else {
        outcome = {
          paymentError: pick(Object.fromEntries(form), [
            "error[code]",
            "error[description]",
            "error[source]",
            "error[step]",
            "error[reason]",
          ]),
        };
      }
      outcome.postedFieldNames = [...form.keys()];
      const summary = outcome.signatureValid
        ? `signature OK, subscription=${outcome.subscription?.status ?? "?"}, payment=${outcome.payment?.status ?? "?"}/${outcome.payment?.method ?? "?"}`
        : outcome.paymentError
          ? `payment error: ${outcome.paymentError["error[description]"] ?? "unknown"}`
          : `signature check failed: ${outcome.error}`;
      const summaryJs = JSON.stringify(`POST received, ${summary}`).replace(/</g, "\\u003c");
      return send(
        res,
        200,
        `<!doctype html><meta charset="utf-8"><title>Callback received</title>
<body style="font:15px/1.5 system-ui;max-width:760px;margin:24px auto;padding:0 16px">
<h1>Callback received</h1>
<p>Razorpay sent the whole tab back here with a form POST (the redirect flow).</p>
<pre style="background:#8881;padding:10px;border-radius:8px;white-space:pre-wrap">${esc(JSON.stringify(outcome, null, 2))}</pre>
<p><a href="/">&larr; back to the spike</a></p>
<script>try{var k="rzp_spike_log",l=JSON.parse(sessionStorage.getItem(k)||"[]");l.push(new Date().toLocaleTimeString("en-GB",{hour12:false})+"  callback       "+${summaryJs});sessionStorage.setItem(k,JSON.stringify(l))}catch(e){}</script>`,
        "text/html; charset=utf-8",
      );
    }

    if (req.method === "POST" && pathname === "/api/status") {
      const b = await readJson(req);
      const sid = String(b.subscriptionId ?? "");
      if (!/^sub_\w+$/.test(sid)) throw new HttpError(400, "Bad subscription id");
      const sub = await rzp(`/subscriptions/${sid}`);
      return send(
        res,
        200,
        pick(sub, ["id", "status", "paid_count", "current_start", "current_end", "charge_at"]),
      );
    }

    throw new HttpError(404, "Not found");
  } catch (e) {
    send(res, e.status ?? 500, { error: e.message, detail: e.detail });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    `Razorpay custom-checkout spike (TEST MODE, key ${KEY_ID.slice(0, 13)}…) on http://127.0.0.1:${PORT}`,
  );
});
