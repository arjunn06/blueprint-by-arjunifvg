// Run: node --test tests/in-app-browser.test.ts   (Node 22.18+)
// Covers isEmbeddedBrowser in src/lib/in-app-browser.ts: where the Google sign-in button is hidden.
import test from "node:test";
import assert from "node:assert/strict";
import { isEmbeddedBrowser } from "../src/lib/in-app-browser.ts";

const UA = {
  instagramIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21E219 Instagram 330.0.0.20.113 (iPhone14,5; iOS 17_4; en_US; en-US; scale=3.00; 1170x2532; 584501251)",
  facebookIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/450.0.0.38.108;FBBV/580000000;FBDV/iPhone14,5]",
  facebookAndroid:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/440.0.0.0.0;]",
  bareAndroidWebView:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36",
  unknownIosWebView:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  safariIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  chromeIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0.6312.52 Mobile/15E148 Safari/604.1",
  chromeAndroid:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36",
  chromeDesktop:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  safariDesktop:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
};

test("Instagram, Facebook and bare web views are embedded browsers", () => {
  assert.equal(isEmbeddedBrowser(UA.instagramIos), true);
  assert.equal(isEmbeddedBrowser(UA.facebookIos), true);
  assert.equal(isEmbeddedBrowser(UA.facebookAndroid), true);
  assert.equal(isEmbeddedBrowser(UA.bareAndroidWebView), true);
});

test("an iOS user agent without the Safari token is a web view", () => {
  assert.equal(isEmbeddedBrowser(UA.unknownIosWebView), true);
});

test("real browsers are not embedded", () => {
  assert.equal(isEmbeddedBrowser(UA.safariIos), false);
  assert.equal(isEmbeddedBrowser(UA.chromeIos), false);
  assert.equal(isEmbeddedBrowser(UA.chromeAndroid), false);
  assert.equal(isEmbeddedBrowser(UA.chromeDesktop), false);
  assert.equal(isEmbeddedBrowser(UA.safariDesktop), false);
});

test("an empty user agent is not treated as embedded", () => {
  assert.equal(isEmbeddedBrowser(""), false);
});
