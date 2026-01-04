(function (w) {
  "use strict";

  const SIGE_SYNC = (() => {
    const CHANNEL = "SIGE_TW_COMMANDER_SYNC_v1";
    const FALLBACK_KEY = "__SIGE_TW_COMMANDER_SYNC_FALLBACK__";
    const bc = ("BroadcastChannel" in w) ? new BroadcastChannel(CHANNEL) : null;

    function send(type, payload = {}) {
      const msg = { type, payload, ts: Date.now() };
      if (bc) bc.postMessage(msg);
      else localStorage.setItem(FALLBACK_KEY, JSON.stringify(msg));
    }

    function on(handler) {
      if (bc) {
        bc.onmessage = (ev) => ev?.data && handler(ev.data);
      } else {
        w.addEventListener("storage", (e) => {
          if (e.key !== FALLBACK_KEY || !e.newValue) return;
          try { handler(JSON.parse(e.newValue)); } catch { }
        });
      }
    }

    return { send, on };
  })();

  w.SIGE_SYNC = SIGE_SYNC;
})(unsafeWindow || window);
