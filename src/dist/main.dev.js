"use strict";

(function (w) {
  "use strict";

  var $ = w.jQuery || w.$;
  if (!$) return;
  var SIGEHub = w.SIGEHub;
  var AttackLabeler = w.AttackLabeler;
  var SIGE_SYNC = w.SIGE_SYNC;
  if (!SIGEHub || !AttackLabeler) return;

  function updateHomeToggleUI() {
    var s = AttackLabeler.getStatus();
    var on = s.cfg.moduleEnabled ? "1" : "0";
    $("#toggle_attack_labeler").attr("data-on", on);
    $("#toggle_attack_labeler .sige-toggle-status").text(s.cfg.moduleEnabled ? "ON" : "OFF");
  }

  function updateModuleHeaderUI() {
    var s = AttackLabeler.getStatus();
    var enabledText = s.cfg.moduleEnabled ? "ON" : "OFF";
    $("#al-module-enabled").text(enabledText);
    $("#al-leader-status").text(s.isLeader ? "LEADER" : "SPECTATOR");
  } // ✅ PANELS


  SIGEHub.registerPanel({
    id: "home",
    name: "Central",
    icon: "🏠",
    isHome: true,
    render: function render() {
      var s = AttackLabeler.getStatus();
      var cfg = s.cfg;
      return "\n        <div class=\"sige-card\">\n          <div class=\"sige-title\">TW Commander</div>\n          <div class=\"sige-subtitle\">Central minimalista \u2022 m\xF3dulos selecion\xE1veis</div>\n\n          <div style=\"margin-top:14px; display:grid; grid-template-columns:1fr; gap:14px;\">\n            <div>\n              <div class=\"muted\" style=\"margin-bottom:10px;\">M\xF3dulos</div>\n\n              <div class=\"sige-toggle\" id=\"toggle_attack_labeler\" data-on=\"".concat(cfg.moduleEnabled ? "1" : "0", "\">\n                <div class=\"sige-switch\"></div>\n                <div>\n                  <div class=\"sige-toggle-title\">Auto etiquetador</div>\n                  <div class=\"muted\" style=\"margin-top:2px;\">Etiqueta ataques automaticamente (subtype=attacks)</div>\n                </div>\n                <div class=\"sige-toggle-status\">").concat(cfg.moduleEnabled ? "ON" : "OFF", "</div>\n              </div>\n\n              <div class=\"muted\" style=\"margin-top:12px;\">\n                \u2022 Toggle = habilita/desabilita o m\xF3dulo (auto start/stop)<br/>\n                \u2022 Somente 1 aba executa (leader). Outras ficam em spectator.\n              </div>\n\n              <div style=\"margin-top:14px; display:flex; gap:10px; flex-wrap:wrap;\">\n                <button class=\"sige-btn secondary btn-open-module\">\uD83C\uDFF7\uFE0F Abrir m\xF3dulo</button>\n              </div>\n            </div>\n          </div>\n        </div>\n      ");
    },
    bind: function bind() {
      $("#toggle_attack_labeler").off("click").on("click", function () {
        var cfg = AttackLabeler.loadCfg();
        cfg.moduleEnabled = !cfg.moduleEnabled;
        AttackLabeler.saveCfg(cfg); // ✅ atualiza UI imediatamente (sem depender do go("home"))

        updateHomeToggleUI(); // ✅ start/stop local (mas startLoop decide leader/follower)

        if (cfg.moduleEnabled) AttackLabeler.startLoop();else AttackLabeler.stopLoop(true); // ✅ força outras abas a atualizarem UI e comportamento

        SIGE_SYNC.send("AL_CFG_UPDATED", {
          cfg: cfg
        }); // re-render home para refletir config

        SIGEHub.go("home", {
          showBack: false
        });
      });
      $(".btn-open-module").off("click").on("click", function () {
        SIGEHub.go("attack_labeler", {
          showBack: true
        });
      });
    }
  });
  SIGEHub.registerPanel({
    id: "attack_labeler",
    name: "Auto etiquetador",
    icon: "🏷️",
    render: function render() {
      var s = AttackLabeler.getStatus();
      var cfg = s.cfg;
      var intervalSec = Math.round((cfg.intervalMs || 30000) / 1000);
      return "\n        <div class=\"sige-card\">\n          <div style=\"display:flex;align-items:center;gap:10px;justify-content:space-between;\">\n            <div>\n              <div class=\"sige-title\">Auto etiquetador</div>\n              <div class=\"sige-subtitle\">Roda em qualquer p\xE1gina \u2014 somente uma aba executa (leader)</div>\n            </div>\n            <div class=\"muted\" style=\"font-weight:950; text-align:right;\">\n              Module: <b id=\"al-module-enabled\">".concat(cfg.moduleEnabled ? "ON" : "OFF", "</b><br/>\n              Mode: <b id=\"al-leader-status\">").concat(s.isLeader ? "LEADER" : "SPECTATOR", "</b>\n            </div>\n          </div>\n\n          <div style=\"margin-top:14px; display:grid; grid-template-columns:1fr 1fr; gap:14px;\">\n            <div>\n              <div class=\"muted\" style=\"margin-bottom:8px;\">Configura\xE7\xF5es</div>\n\n              <label style=\"font-weight:950;font-size:12px;\">Intervalo</label>\n              <div class=\"sige-range-wrap\">\n                <input type=\"range\" class=\"cfg-interval-range\" min=\"5\" max=\"120\" step=\"5\" value=\"").concat(intervalSec, "\">\n                <div class=\"sige-range-pill\">\n                  <span class=\"cfg-interval-val\">").concat(intervalSec, "</span>s\n                </div>\n              </div>\n\n              <div class=\"muted\" style=\"margin-top:6px;\">\n                <span id=\"interval-save-status\" style=\"opacity:.9\"></span>\n              </div>\n\n              <div class=\"muted\" style=\"margin-top:10px;\">\n                Pr\xF3xima execu\xE7\xE3o em: <b id=\"sige-next-run\">\u2014</b>\n              </div>\n\n              <div style=\"height:12px;\"></div>\n\n              <div style=\"display:flex;gap:10px;flex-wrap:wrap;\">\n                <button class=\"sige-btn danger btn-clear-cache\">\uD83E\uDDF9 Limpar cache</button>\n                <button class=\"sige-btn danger btn-clear-logs\">\uD83E\uDDF9 Limpar logs</button>\n              </div>\n\n              <div style=\"margin-top:12px\" class=\"muted\">\n                \u2022 Auto-clean cache: remove IDs que n\xE3o est\xE3o mais na p\xE1gina<br/>\n                \u2022 S\xF3 remove quando chegada j\xE1 passou + margem (6h)\n              </div>\n            </div>\n\n            <div>\n              <div class=\"muted\" style=\"margin-bottom:8px;\">Status</div>\n              <div class=\"muted\" id=\"al-status-box\">\n                Module: <b>").concat(cfg.moduleEnabled ? "ON" : "OFF", "</b><br/>\n                Running (lock): <b>").concat(s.running ? "YES" : "NO", "</b><br/>\n                Cache size: <b>").concat(s.cacheSize, "</b><br/>\n              </div>\n\n              <div class=\"muted\" style=\"margin-top:10px;\">Logs de a\xE7\xF5es</div>\n              <div id=\"sige-attack-logs\" class=\"sige-logbox\"></div>\n            </div>\n          </div>\n        </div>\n      ");
    },
    bind: function bind() {
      function refresh() {
        SIGEHub.go("attack_labeler", {
          showBack: true
        });
        setTimeout(function () {
          return AttackLabeler.renderLogs();
        }, 20);
      }

      AttackLabeler.renderLogs();
      var debouncedSave = AttackLabeler.debounceIntervalSave(function (sec) {
        var cfg = AttackLabeler.loadCfg();
        cfg.intervalMs = Math.max(5, Math.min(120, sec)) * 1000;
        AttackLabeler.saveCfg(cfg);
        $("#interval-save-status").text("Salvo ✅");
        if (cfg.moduleEnabled) AttackLabeler.restartLoopIfRunning();
        SIGE_SYNC.send("AL_CFG_UPDATED", {
          cfg: cfg
        });
        setTimeout(function () {
          return $("#interval-save-status").text("");
        }, 1200);
      });
      $(".cfg-interval-range").off("input").on("input", function () {
        var sec = Number($(this).val());
        $(".cfg-interval-val").text(sec);
        $("#interval-save-status").text("Salvando…");
        debouncedSave(sec);
      });
      $(".btn-clear-cache").off("click").on("click", function () {
        AttackLabeler.clearCache();
        refresh();
      });
      $(".btn-clear-logs").off("click").on("click", function () {
        AttackLabeler.clearAllLogs();
        refresh();
      });
    }
  }); // ✅ Atualiza UI em tempo real quando outra aba muda algo

  SIGE_SYNC.on(function (msg) {
    if (!msg || !msg.type) return;

    if (msg.type === "AL_CFG_UPDATED") {
      // atualiza toggle se estiver na home
      updateHomeToggleUI();
      updateModuleHeaderUI();
    }

    if (msg.type === "AL_STATUS_UPDATED") {
      updateHomeToggleUI();
      updateModuleHeaderUI();
    }

    if (msg.type === "AL_LOGS_UPDATED") {
      AttackLabeler.renderLogs();
    }
  }); // Boot HUB (não abre automático)

  SIGEHub.open();
  SIGEHub.close(); // Auto-start: se cfg ON, cada aba decide se será leader ou spectator

  (function bootAutoStart() {
    var cfg = AttackLabeler.loadCfg();
    if (cfg.moduleEnabled) AttackLabeler.startLoop();
  })(); // Release lock ao fechar aba


  window.addEventListener("beforeunload", function () {
    try {
      AttackLabeler.stopLoop(true);
    } catch (_unused) {}
  });
})(unsafeWindow || window);