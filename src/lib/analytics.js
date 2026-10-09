var _sessionId;

function getStorageKey(key) {
  return 'silversurface_' + key;
}

function safeGetStorage(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch (e) {
    /* noop */
  }
  return null;
}

function safeSetStorage(key, val) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, val);
    }
  } catch (e) {
    /* noop */
  }
}

function generateSessionId() {
  var rand = Math.floor(Math.random() * 1e12).toString(36);
  var ts = Date.now().toString(36);
  return 'sess_' + ts + '_' + rand;
}

export function getSessionId() {
  if (_sessionId) return _sessionId;
  var stored = safeGetStorage(getStorageKey('session_id'));
  if (stored && typeof stored === 'string' && stored.length > 0) {
    _sessionId = stored;
    return _sessionId;
  }
  _sessionId = generateSessionId();
  safeSetStorage(getStorageKey('session_id'), _sessionId);
  return _sessionId;
}

export function captureUtmParams() {
  if (typeof window === 'undefined') return null;
  var sp = new URLSearchParams(window.location.search);
  var params = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'ttclid', 'gbraid', 'wbraid'];
  var out = {};
  var hasAny = false;
  params.forEach(function (p) {
    var v = sp.get(p);
    if (v) {
      out[p] = v;
      hasAny = true;
    }
  });
  if (!hasAny) {
    var stored = safeGetStorage(getStorageKey('utm'));
    return stored ? JSON.parse(stored) : null;
  }
  safeSetStorage(getStorageKey('utm'), JSON.stringify(out));
  return out;
}

export function getAttributionChannel() {
  var utm = captureUtmParams();
  if (!utm) return 'Organic';
  if (utm.fbclid || (utm.utm_source && /facebook|instagram|meta/i.test(utm.utm_source))) return 'Meta (IG/FB)';
  if (utm.ttclid || (utm.utm_source && /tiktok/i.test(utm.utm_source))) return 'TikTok';
  if (utm.gbraid || utm.wbraid || (utm.utm_source && /google/i.test(utm.utm_source))) return 'Google';
  if (utm.utm_source && /line/i.test(utm.utm_source)) return 'LINE OA';
  if (utm.utm_campaign) return utm.utm_campaign;
  if (utm.utm_source) return utm.utm_source;
  return 'Organic';
}

function buildContentIds(opts, cartItems) {
  if (opts && opts.content_ids && Array.isArray(opts.content_ids)) {
    return opts.content_ids;
  }
  if (opts && opts.product_id) {
    return [String(opts.product_id)];
  }
  if (cartItems && Array.isArray(cartItems)) {
    return cartItems.map(function (ci) { return String(ci.product && ci.product.id ? ci.product.id : ci.id); });
  }
  return [];
}

function buildContentsArray(cartItems) {
  if (!cartItems || !Array.isArray(cartItems)) return undefined;
  return cartItems.map(function (ci) {
    var p = ci.product || ci;
    return {
      id: String(p.id),
      quantity: ci.quantity || 1,
      item_price: p.price || 0,
    };
  });
}

/**
 * Affiliate referral code: `?ref=CODE` on the landing URL wins, otherwise the
 * last code this browser stored. Mirrors the deployed bundle's `getRefCode`.
 */
export function getRefCode() {
  if (typeof window === 'undefined') return null;
  try {
    var sp = new URLSearchParams(window.location.search);
    var ref = sp.get('ref');
    if (ref && /^[A-Za-z0-9-]{2,32}$/.test(ref)) {
      safeSetStorage(getStorageKey('ref'), ref);
      return ref;
    }
    return safeGetStorage(getStorageKey('ref'));
  } catch (e) {
    return null;
  }
}

export function trackEvent(eventName, options) {
  var opts = options || {};
  var sessionId = getSessionId();
  var channel = opts.channel || getAttributionChannel();
  var value = typeof opts.value === 'number' ? opts.value : 0;
  var currency = 'THB';
  var cartItems = opts.cart_items || null;
  var contentIds = buildContentIds(opts, cartItems);
  var contents = buildContentsArray(cartItems);
  var productCount = Array.isArray(cartItems)
    ? cartItems.reduce(function (a, ci) { return a + (ci.quantity || 1); }, 0)
    : (opts.product_id ? 1 : 0);

  var payload = {
    session_id: sessionId,
    event_name: eventName,
    channel: channel,
    value: value,
    content_ids: contentIds.length > 0 ? JSON.stringify(contentIds) : null,
    currency: currency,
    order_id: opts.order_id || null,
    product_count: productCount,
    page_path: typeof window !== 'undefined' ? window.location.pathname : null,
  };

  if (typeof window !== 'undefined') {
    var eventParams = {
      content_ids: contentIds,
      content_type: 'product',
      content_name: opts.content_name || undefined,
      currency: currency,
      value: value,
      num_items: productCount > 0 ? productCount : undefined,
    };
    if (opts.order_id) eventParams.order_id = opts.order_id;
    if (contents) eventParams.contents = contents;

    if (window.cometly && typeof window.cometly === 'function') {
      try {
        window.cometly('track', eventName, eventParams);
      } catch (e) {
        console.warn('Cometly track failed:', e);
      }
    }

    if (window.fbq && typeof window.fbq === 'function') {
      try {
        var fbqParams = Object.assign({}, eventParams);
        if (fbqParams.content_ids && fbqParams.content_ids.length === 0) delete fbqParams.content_ids;
        window.fbq('track', eventName, fbqParams);
      } catch (e) {
        console.warn('FBQ track failed:', e);
      }
    }

    if (window.ttq && typeof window.ttq === 'function' && typeof window.ttq.track === 'function') {
      try {
        var ttqParams = {
          content_id: (opts.product_id && String(opts.product_id)) || (contentIds[0] ? contentIds[0] : undefined),
          content_type: 'product',
          content_name: opts.content_name || undefined,
          currency: currency,
          value: value,
        };
        if (opts.order_id) ttqParams.order_id = opts.order_id;
        if (productCount > 0) ttqParams.quantity = productCount;
        window.ttq.track(eventName, ttqParams);
      } catch (e) {
        console.warn('TikTok ttq track failed:', e);
      }
    }

    if (window.lintrk && typeof window.lintrk === 'function') {
      try {
        var lineParams = {
          currency: currency,
          value: value,
        };
        if (opts.order_id) lineParams.order_id = opts.order_id;
        if (productCount > 0) lineParams.num_items = productCount;
        window.lintrk('track', eventName, lineParams);
      } catch (e) {
        console.warn('LINE lintrk track failed:', e);
      }
    }

    if (window.gtag && typeof window.gtag === 'function') {
      try {
        var gtagName = eventName === 'ViewContent' ? 'view_item'
          : eventName === 'AddToCart' ? 'add_to_cart'
          : eventName === 'InitiateCheckout' ? 'begin_checkout'
          : eventName === 'Checkout' ? 'begin_checkout'
          : eventName === 'Purchase' ? 'purchase'
          : eventName === 'PageView' ? 'page_view'
          : eventName.toLowerCase();
        var gtagParams = Object.assign({
          currency: currency,
          value: value,
        }, contents ? { items: contents.map(function (c) {
          return Object.assign({
            item_id: c.id,
            quantity: c.quantity,
            price: c.item_price,
            item_name: opts.content_name || undefined,
          });
        }) } : {});
        if (opts.content_name) gtagParams.item_name = opts.content_name;
        if (contentIds && contentIds.length > 0) gtagParams.item_id = contentIds[0];
        if (opts.order_id) gtagParams.transaction_id = opts.order_id;
        if (productCount > 0) gtagParams.num_items = productCount;
        window.gtag('event', gtagName, gtagParams);
      } catch (e) {
        console.warn('GA4 gtag track failed:', e);
      }
    }
  }

  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: typeof navigator !== 'undefined' && navigator.sendBeacon ? false : true,
  }).catch(function (e) {
    console.warn('Analytics tracking offline:', e);
  });
}

export function trackPageView(path) {
  var opts = {};
  if (path) opts.page_path = path;
  trackEvent('PageView', opts);
}

export function trackViewContent(product, qty) {
  var quantity = typeof qty === 'number' && qty > 0 ? qty : 1;
  var price = (product.price * quantity);
  trackEvent('ViewContent', {
    product_id: product.id,
    content_name: product.name,
    value: price,
  });
}

export function trackAddToCart(product, swatchName, qty) {
  var quantity = typeof qty === 'number' && qty > 0 ? qty : 1;
  var price = (product.price * quantity);
  // NOTE (audit fix #3): this used to hard-code `channel: 'PDP'`, which is a
  // page name, not an acquisition channel — it polluted the Sales Attribution
  // table with fake "channels". The page is already recorded via page_path.
  trackEvent('AddToCart', {
    product_id: product.id,
    content_name: product.name,
    value: price,
  });
}

export function trackInitiateCheckout(cartItems, subtotal) {
  trackEvent('Checkout', {
    cart_items: cartItems,
    value: typeof subtotal === 'number' ? subtotal : 0,
  });
}

export function trackPurchase(orderTotal, orderId, cartItems) {
  trackEvent('Purchase', {
    value: orderTotal,
    order_id: orderId || null,
    cart_items: cartItems || null,
  });
}
