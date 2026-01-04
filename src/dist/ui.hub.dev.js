"use strict";

(function (w) {
  "use strict";

  var $ = w.jQuery || w.$;
  if (!$) return;

  var SIGEHub = function () {
    var panels = new Map();
    var current = null;

    function ensureDOM() {
      if (document.getElementById("sigehub-overlay")) return;
      var root = document.getElementById("sigehub-root");

      if (!root) {
        root = document.createElement("div");
        root.id = "sigehub-root";
        document.body.appendChild(root);
      }

      root.innerHTML = "\n        <div id=\"sigehub-overlay\">\n          <div id=\"sigehub-modal\">\n            <button class=\"sigehub-xclose\" title=\"Fechar\">\u2716</button>\n            <div id=\"sigehub-sidebar\">\n              <div id=\"sigehub-brand\">\n                <span>TW Commander</span>\n                <span class=\"badge\">TW</span>\n              </div>\n              <div id=\"sigehub-menu\"></div>\n              <div id=\"sigehub-footer\">\n                Central unificada \u2022 gmprestes<br/>\n                <span style=\"opacity:.8\">Clique fora ou ESC pra fechar</span>\n              </div>\n            </div>\n            <div id=\"sigehub-content\">\n              <div id=\"sigehub-topbar\">\n                <span class=\"title\">\u2014</span>\n                <span class=\"spacer\"></span>\n                <button class=\"sigehub-back\" style=\"display:none;\">\u2190 Voltar</button>\n                <button class=\"sigehub-xclose\">\u2716</button>\n              </div>\n              <div id=\"sigehub-panel\"></div>\n            </div>\n          </div>\n        </div>\n      ";

      if (!document.getElementById("sigehub-float")) {
        var floatBtn = document.createElement("div");
        floatBtn.id = "sigehub-float";
        floatBtn.title = "Abrir TW Commander";
        floatBtn.textContent = "GM";
        var $target = $('#questlog_new').length ? $('#questlog_new') : $('body');
        $target.append(floatBtn);
      }

      $(".sigehub-xclose").on("click", function () {
        return close();
      });
      $("#sigehub-overlay").on("mousedown", function (e) {
        if (e.target && e.target.id === "sigehub-overlay") close();
      });
      $(document).on("keydown.sigehub", function (e) {
        if (e.key === "Escape") close();
      });
      $("#sigehub-float").on("click", function () {
        return open();
      });
      $("#sigehub-menu").on("click", ".sigehub-menuitem", function () {
        var id = $(this).data("panel");
        go(id);
      });
      $(".sigehub-back").on("click", function () {
        return go("home");
      });
      GM_registerMenuCommand("Abrir TW Commander", function () {
        return open();
      });
    }

    function registerPanel(_ref) {
      var id = _ref.id,
          name = _ref.name,
          _ref$icon = _ref.icon,
          icon = _ref$icon === void 0 ? "⚙️" : _ref$icon,
          _ref$isHome = _ref.isHome,
          isHome = _ref$isHome === void 0 ? false : _ref$isHome,
          render = _ref.render,
          bind = _ref.bind;
      panels.set(id, {
        id: id,
        name: name,
        icon: icon,
        isHome: isHome,
        render: render,
        bind: bind
      });
      refreshMenu();
    }

    function refreshMenu() {
      if (!$("#sigehub-menu").length) return;
      var sorted = Array.from(panels.values()).sort(function (a, b) {
        if (a.isHome) return -1;
        if (b.isHome) return 1;
        return a.name.localeCompare(b.name);
      });
      $("#sigehub-menu").html(sorted.map(function (p) {
        return "\n        <div class=\"sigehub-menuitem\" data-panel=\"".concat(p.id, "\">\n          <span style=\"width:22px;text-align:center\">").concat(p.icon, "</span>\n          <span>").concat(p.name, "</span>\n        </div>\n      ");
      }).join(""));
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

    function go(panelId) {
      var _ref2 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
          _ref2$showBack = _ref2.showBack,
          showBack = _ref2$showBack === void 0 ? true : _ref2$showBack;

      var p = panels.get(panelId);
      if (!p) return;
      current = panelId;
      $("#sigehub-menu .sigehub-menuitem").removeClass("active");
      $("#sigehub-menu .sigehub-menuitem[data-panel=\"".concat(panelId, "\"]")).addClass("active");
      $("#sigehub-topbar .title").text(p.name);

      if (panelId === "home") {
        $(".sigehub-back").hide();
        $(".sigehub-xclose").css("display", "flex");
      } else {
        $(".sigehub-xclose").hide();
        $(".sigehub-back").toggle(!!showBack);
      }

      var html = p.render();
      $("#sigehub-panel").html(html);

      if (typeof p.bind === "function") {
        try {
          p.bind();
        } catch (e) {
          console.error("[SIGEHub] bind error:", e);
        }
      }
    }

    return {
      registerPanel: registerPanel,
      open: open,
      close: close,
      go: go
    };
  }();

  w.SIGEHub = SIGEHub;
})(unsafeWindow || window);