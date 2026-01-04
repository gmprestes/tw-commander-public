"use strict";

(function (w) {
  "use strict";

  var Toast = function () {
    var root = null;

    function ensureRoot() {
      if (root && document.body.contains(root)) return root;
      root = document.createElement("div");
      root.id = "sige-toast-root";
      document.body.appendChild(root);
      return root;
    }

    function show(message) {
      var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
          _ref$type = _ref.type,
          type = _ref$type === void 0 ? "info" : _ref$type,
          _ref$title = _ref.title,
          title = _ref$title === void 0 ? "" : _ref$title,
          _ref$duration = _ref.duration,
          duration = _ref$duration === void 0 ? 2600 : _ref$duration,
          _ref$icon = _ref.icon,
          icon = _ref$icon === void 0 ? null : _ref$icon,
          _ref$maxToasts = _ref.maxToasts,
          maxToasts = _ref$maxToasts === void 0 ? 4 : _ref$maxToasts;

      ensureRoot();

      while (root.children.length >= maxToasts) {
        root.removeChild(root.lastChild);
      }

      var t = document.createElement("div");
      t.className = "sige-toast ".concat(type);
      var icons = {
        success: "✅",
        error: "❌",
        info: "ℹ️"
      };
      var toastIcon = icon || icons[type] || "🔔";
      var toastTitle = title || (type === "success" ? "OK" : type === "error" ? "Erro" : "Info");
      t.innerHTML = "\n        <div class=\"icon\">".concat(toastIcon, "</div>\n        <div class=\"body\">\n          <div class=\"title\">").concat(toastTitle, "</div>\n          <div class=\"msg\">").concat(String(message || "").replace(/[<>]/g, ""), "</div>\n        </div>\n        <div class=\"close\">\u2716</div>\n        <div class=\"bar\"><div></div></div>\n      ");
      t.querySelector(".bar > div").style.animationDuration = "".concat(duration, "ms");

      var close = function close() {
        t.style.animation = "sigeToastOut .18s ease forwards";
        setTimeout(function () {
          return t.remove();
        }, 180);
      };

      t.querySelector(".close").addEventListener("click", close);
      var timer = setTimeout(close, duration);
      t.addEventListener("mouseenter", function () {
        return clearTimeout(timer);
      });
      root.insertBefore(t, root.firstChild);
      return t;
    }

    return {
      show: show
    };
  }();

  var SIGEUI = {};

  SIGEUI.SuccessMessage = function (t) {
    return Toast.show(t, {
      type: "success",
      title: "OK"
    });
  };

  SIGEUI.ErrorMessage = function (t) {
    return Toast.show(t, {
      type: "error",
      title: "Erro",
      duration: 4200
    });
  };

  SIGEUI.InfoMessage = function (t) {
    return Toast.show(t, {
      type: "info",
      title: "Info"
    });
  };

  SIGEUI.message = function (t) {
    var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "info";
    return Toast.show(t, {
      type: type
    });
  };

  w.Toast = Toast;
  w.SIGEUI = SIGEUI;
})(unsafeWindow || window);