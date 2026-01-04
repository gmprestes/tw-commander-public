(function (w) {
  "use strict";

  const $ = w.jQuery || w.$;
  if (!$) return;

  const SIGEHub = (() => {
    const panels = new Map();
    let current = null;

    function ensureDOM() {
      if (document.getElementById("sigehub-overlay")) return;

      let root = document.getElementById("sigehub-root");
      if (!root) {
        root = document.createElement("div");
        root.id = "sigehub-root";
        document.body.appendChild(root);
      }

      root.innerHTML = `
        <div id="sigehub-overlay">
          <div id="sigehub-modal">
            <button class="sigehub-xclose" title="Fechar">✖</button>
            <div id="sigehub-sidebar">
              <div id="sigehub-brand">
                <span>TW Commander</span>
                <span class="badge">TW</span>
              </div>
              <div id="sigehub-menu"></div>
              <div id="sigehub-footer">
                Central unificada • gmprestes<br/>
                <span style="opacity:.8">Clique fora ou ESC pra fechar</span>
              </div>
            </div>
            <div id="sigehub-content">
              <div id="sigehub-topbar">
                <span class="title">—</span>
                <span class="spacer"></span>
                <button class="sigehub-back" style="display:none;">← Voltar</button>
                <button class="sigehub-xclose">✖</button>
              </div>
              <div id="sigehub-panel"></div>
            </div>
          </div>
        </div>
      `;

      if (!document.getElementById("sigehub-float")) {
        const floatBtn = document.createElement("div");
        floatBtn.id = "sigehub-float";
        floatBtn.title = "Abrir TW Commander";
        floatBtn.textContent = "GM";
        const $target = $('#questlog_new').length ? $('#questlog_new') : $('body');
        $target.append(floatBtn);
      }

      $(".sigehub-xclose").on("click", () => close());

      $("#sigehub-overlay").on("mousedown", (e) => {
        if (e.target && e.target.id === "sigehub-overlay") close();
      });

      $(document).on("keydown.sigehub", (e) => {
        if (e.key === "Escape") close();
      });

      $("#sigehub-float").on("click", () => open());

      $("#sigehub-menu").on("click", ".sigehub-menuitem", function () {
        const id = $(this).data("panel");
        go(id);
      });

      $(".sigehub-back").on("click", () => go("home"));

      GM_registerMenuCommand("Abrir TW Commander", () => open());
    }

    function registerPanel({ id, name, icon = "⚙️", isHome = false, render, bind }) {
      panels.set(id, { id, name, icon, isHome, render, bind });
      refreshMenu();
    }

    function refreshMenu() {
      if (!$("#sigehub-menu").length) return;

      const sorted = Array.from(panels.values()).sort((a, b) => {
        if (a.isHome) return -1;
        if (b.isHome) return 1;
        return a.name.localeCompare(b.name);
      });

      $("#sigehub-menu").html(sorted.map(p => `
        <div class="sigehub-menuitem" data-panel="${p.id}">
          <span style="width:22px;text-align:center">${p.icon}</span>
          <span>${p.name}</span>
        </div>
      `).join(""));
    }

    function open() {
      ensureDOM();
      document.body.classList.add("sigehub-open");
      $("#sigehub-overlay").css("display", "flex");
      if (!current) go("home");
    }

    function close() {
      $("#sigehub-overlay").hide();
      document.body.classList.remove("sigehub-open");
    }

    function go(panelId, { showBack = true } = {}) {
      const p = panels.get(panelId);
      if (!p) return;

      current = panelId;

      $("#sigehub-menu .sigehub-menuitem").removeClass("active");
      $(`#sigehub-menu .sigehub-menuitem[data-panel="${panelId}"]`).addClass("active");

      $("#sigehub-topbar .title").text(p.name);

      if (panelId === "home") {
        $(".sigehub-back").hide();
        $(".sigehub-xclose").css("display", "flex");
      } else {
        $(".sigehub-xclose").hide();
        $(".sigehub-back").toggle(!!showBack);
      }

      const html = p.render();
      $("#sigehub-panel").html(html);
      if (typeof p.bind === "function") {
        try { p.bind(); } catch (e) { console.error("[SIGEHub] bind error:", e); }
      }
    }

    return { registerPanel, open, close, go };
  })();

  w.SIGEHub = SIGEHub;
})(unsafeWindow || window);
