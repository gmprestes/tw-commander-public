(function (w) {
  "use strict";

  const Toast = (() => {
    let root = null;

    function ensureRoot() {
      if (root && document.body.contains(root)) return root;
      root = document.createElement("div");
      root.id = "sige-toast-root";
      document.body.appendChild(root);
      return root;
    }

    function show(message, {
      type = "info",
      title = "",
      duration = 2600,
      icon = null,
      maxToasts = 4
    } = {}) {
      ensureRoot();
      while (root.children.length >= maxToasts) root.removeChild(root.lastChild);

      const t = document.createElement("div");
      t.className = `sige-toast ${type}`;

      const icons = { success: "✅", error: "❌", info: "ℹ️" };
      const toastIcon = icon || icons[type] || "🔔";
      const toastTitle = title || (type === "success" ? "OK" : type === "error" ? "Erro" : "Info");

      t.innerHTML = `
        <div class="icon">${toastIcon}</div>
        <div class="body">
          <div class="title">${toastTitle}</div>
          <div class="msg">${String(message || "").replace(/[<>]/g, "")}</div>
        </div>
        <div class="close">✖</div>
        <div class="bar"><div></div></div>
      `;

      t.querySelector(".bar > div").style.animationDuration = `${duration}ms`;

      const close = () => {
        t.style.animation = "sigeToastOut .18s ease forwards";
        setTimeout(() => t.remove(), 180);
      };

      t.querySelector(".close").addEventListener("click", close);

      const timer = setTimeout(close, duration);
      t.addEventListener("mouseenter", () => clearTimeout(timer));

      root.insertBefore(t, root.firstChild);
      return t;
    }

    return { show };
  })();

  const SIGEUI = {};
  SIGEUI.SuccessMessage = (t) => Toast.show(t, { type: "success", title: "OK" });
  SIGEUI.ErrorMessage = (t) => Toast.show(t, { type: "error", title: "Erro", duration: 4200 });
  SIGEUI.InfoMessage = (t) => Toast.show(t, { type: "info", title: "Info" });
  SIGEUI.message = (t, type = "info") => Toast.show(t, { type });

  w.Toast = Toast;
  w.SIGEUI = SIGEUI;
})(unsafeWindow || window);
