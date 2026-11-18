// Shared helpers for the spike pages. Plain browser JS, no build step.
const $ = (id) => document.getElementById(id);
const LOG_KEY = "rzp_spike_log";
const UNLOAD_KEY = "rzp_spike_unloaded";

function readStored(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStored(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* storage unavailable: the log just won't survive a reload */
  }
}

const lines = (() => {
  try {
    return JSON.parse(readStored(LOG_KEY) ?? "[]");
  } catch {
    return [];
  }
})();

function paintLog() {
  const el = $("log");
  if (!el) return;
  el.textContent = lines.join("\n");
  el.scrollTop = el.scrollHeight;
}

function log(kind, msg, data) {
  const t = new Date().toLocaleTimeString("en-GB", { hour12: false });
  const tail = data === undefined ? "" : " " + JSON.stringify(data);
  lines.push(`${t}  ${kind.padEnd(14)} ${msg}${tail}`);
  if (lines.length > 300) lines.splice(0, lines.length - 300);
  writeStored(LOG_KEY, JSON.stringify(lines));
  paintLog();
}

async function api(path, body) {
  const res = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok)
    throw Object.assign(new Error(json.error ?? `HTTP ${res.status}`), { detail: json.detail });
  return json;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Failed to load " + src));
    document.body.appendChild(s);
  });
}

/**
 * The question this spike answers is partly "does the customer ever leave the page?", so record popups
 * and top-level navigations. A navigation shows up on the *next* load (the log lives in sessionStorage);
 * it also fires on a manual reload, so only trust it if you did not reload.
 */
function instrument() {
  const prev = readStored(UNLOAD_KEY);
  if (prev) {
    log(
      "!! UNLOADED",
      "page unloaded earlier (a redirect, a reload, or moving between the spike pages) at",
      prev,
    );
    writeStored(UNLOAD_KEY, "");
  }
  const origOpen = window.open;
  window.open = function (url, ...rest) {
    log("window.open", url ? String(url).slice(0, 120) : "(blank popup, navigated afterwards)");
    return origOpen.call(this, url, ...rest);
  };
  window.addEventListener("beforeunload", () => writeStored(UNLOAD_KEY, new Date().toISOString()));
  window.addEventListener("error", (e) => log("js-error", e.message));
  window.addEventListener("unhandledrejection", (e) =>
    log("js-error", String(e.reason?.message ?? e.reason)),
  );
}

async function createSubscription() {
  const s = await api("/api/subscription", {});
  log("subscription", `${s.subscriptionId} status=${s.status} amount=${s.amount}`);
  return s;
}

// Same ids the app uses: take the subscription id from OUR side, not from the Checkout response.
async function verifyPayment(subscriptionId, resp) {
  const r = await api("/api/verify", {
    razorpay_payment_id: resp.razorpay_payment_id,
    razorpay_subscription_id: subscriptionId,
    razorpay_signature: resp.razorpay_signature,
  });
  log(
    "verify",
    `signatureValid=${r.signatureValid} subscription=${r.subscription?.status ?? "?"} payment=${r.payment?.status ?? "?"}/${r.payment?.method ?? "?"}`,
  );
  return r;
}

function show(id, obj) {
  $(id).textContent = JSON.stringify(obj, null, 2);
}

function pickError(err) {
  if (!err) return undefined;
  const { code, description, source, step, reason, field, metadata } = err;
  return { code, description, source, step, reason, field, metadata };
}
