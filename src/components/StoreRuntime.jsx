import { useEffect } from 'react';
import { useCatalog } from '../context/CatalogContext';

/**
 * Per-store runtime configuration.
 *
 * Build-time env can only ever hold ONE store's pixel ids, so each store keeps
 * its own ids in the database and they are applied here at runtime:
 *
 *   - brand colour  -> CSS variable `--store-brand`
 *   - Meta / TikTok / LINE pixels -> loaded with THIS store's id (once per id)
 *
 * Events are already forwarded to window.fbq / ttq / lintrk by lib/analytics.js,
 * so as soon as an SDK is loaded with the store's id, its events flow.
 */

const PLACEHOLDER = /XXXXXXXX|1234567890|123456789|^C12345/i;

function usableId(id) {
  return typeof id === 'string' && id.length > 4 && !PLACEHOLDER.test(id);
}

function loadMeta(id) {
  if (!usableId(id) || typeof window === 'undefined') return;
  if (window.__dspMetaPixel === id) return;
  window.__dspMetaPixel = id;

  if (typeof window.fbq !== 'function') {
    /* eslint-disable */
    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
  }

  // The stub only queues calls; the SDK itself has to be fetched. index.html
  // creates the stub unconditionally (so early fbq() calls are captured) but
  // only loads the SDK when a BUILD-TIME id is configured — which is never true
  // for a per-store id, so the script is injected here when it is missing.
  if (!document.querySelector('script[src*="fbevents.js"]')) {
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    const first = document.getElementsByTagName('script')[0];
    first.parentNode.insertBefore(script, first);
  }

  window.fbq('init', id);
  window.fbq('track', 'PageView');
}

function loadTikTok(id) {
  if (!usableId(id) || typeof window === 'undefined') return;
  if (window.__dspTikTokPixel === id) return;
  window.__dspTikTokPixel = id;

  if (!window.ttq) {
    /* eslint-disable */
    (function (w, d, t) {
      w.TiktokAnalyticsObject = t;
      var ttq = (w[t] = w[t] || []);
      ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
      ttq.setAndDefer = function (obj, method) {
        obj[method] = function () { obj.push([method].concat(Array.prototype.slice.call(arguments, 0))); };
      };
      for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.load = function (pixelId, options) {
        var url = 'https://analytics.tiktok.com/i18n/pixel/events.js';
        ttq._i = ttq._i || {};
        ttq._i[pixelId] = [];
        ttq._i[pixelId]._u = url;
        ttq._t = ttq._t || {};
        ttq._t[pixelId] = +new Date();
        ttq._o = ttq._o || {};
        ttq._o[pixelId] = options || {};
        var script = d.createElement('script');
        script.type = 'text/javascript';
        script.async = true;
        script.src = url + '?sdkid=' + pixelId + '&lib=' + t;
        var first = d.getElementsByTagName('script')[0];
        first.parentNode.insertBefore(script, first);
      };
    })(window, document, 'ttq');
    /* eslint-enable */
  }

  window.ttq.load(id);
  window.ttq.page();
}

function loadLine(id) {
  if (!usableId(id) || typeof window === 'undefined') return;
  if (window.__dspLinePixel === id) return;
  window.__dspLinePixel = id;

  if (typeof window.lintrk !== 'function') {
    window.lintrk = function (a, b) {
      (window.lintrk.q = window.lintrk.q || []).push([a, b]);
    };
    window.lintrk.q = window.lintrk.q || [];
    // NOTE: the queue is enough to record events for the LINE Tag; the LINE
    // tag script itself is only needed when LINE Ads reporting is switched on.
  }

  window.lintrk('init', id);
  window.lintrk('track', 'PageView');
}

export default function StoreRuntime() {
  const { store } = useCatalog();

  // Brand colour -> CSS variable (removed again when the store has none, so the
  // default metallic theme stays for the platform's own pages).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const color = store && store.brand_color;
    if (color && /^#[0-9a-f]{6}$/i.test(color)) {
      document.documentElement.style.setProperty('--store-brand', color);
    } else {
      document.documentElement.style.removeProperty('--store-brand');
    }
  }, [store && store.brand_color]);

  useEffect(() => {
    if (!store || store.resolved === false) return;
    const pixels = store.pixels || {};
    loadMeta(pixels.meta);
    loadTikTok(pixels.tiktok);
    loadLine(pixels.line);
  }, [
    store && store.slug,
    store && store.pixels && store.pixels.meta,
    store && store.pixels && store.pixels.tiktok,
    store && store.pixels && store.pixels.line,
  ]);

  return null;
}
