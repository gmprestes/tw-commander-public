(function (w) {
  "use strict";

  const SIGE_SYNC = (() => {
    const KEY = "SIGE_SYNC_EVT";
    const subs = [];

    function send(type, payload = {}) {
      const evt = { type, payload, at: Date.now(), id: Math.random().toString(16).slice(2) };
      localStorage.setItem(KEY, JSON.stringify(evt));
      // dispara também na aba atual
      subs.forEach(fn => fn(evt));
    }

    function on(fn) { subs.push(fn); }

    window.addEventListener("storage", (ev) => {
      if (ev.key !== KEY) return;
      try {
        const evt = JSON.parse(ev.newValue || "null");
        if (evt) subs.forEach(fn => fn(evt));
      } catch { }
    });

    return { send, on };
  })();


  w.SIGE_SYNC = SIGE_SYNC;
})(unsafeWindow || window);
