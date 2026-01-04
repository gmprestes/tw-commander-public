(function (w) {
  "use strict";

  const $ = w.jQuery || w.$;
  if (!$) return;

  const SIGEHub = w.SIGEHub;
  const AttackLabeler = w.AttackLabeler;
  const SIGE_SYNC = w.SIGE_SYNC;

  if (!SIGEHub || !AttackLabeler) return;

  function updateHomeToggleUI() {
    const s = AttackLabeler.getStatus();
    const on = s.cfg.moduleEnabled ? "1" : "0";
    $("#toggle_attack_labeler").attr("data-on", on);
    $("#toggle_attack_labeler .sige-toggle-status").text(s.cfg.moduleEnabled ? "ON" : "OFF");
  }

  function updateModuleHeaderUI() {
    const s = AttackLabeler.getStatus();
    const enabledText = s.cfg.moduleEnabled ? "ON" : "OFF";
    $("#al-module-enabled").text(enabledText);
    $("#al-leader-status").text(s.isLeader ? "LEADER" : "SPECTATOR");
  }

  // ✅ PANELS
  SIGEHub.registerPanel({
    id: "home",
    name: "Central",
    icon: "🏠",
    isHome: true,
    render() {
      const s = AttackLabeler.getStatus();
      const cfg = s.cfg;

      return `
        <div class="sige-card">
          <div class="sige-title">TW Commander</div>
          <div class="sige-subtitle">Central minimalista • módulos selecionáveis</div>

          <div style="margin-top:14px; display:grid; grid-template-columns:1fr; gap:14px;">
            <div>
              <div class="muted" style="margin-bottom:10px;">Módulos</div>

              <div class="sige-toggle" id="toggle_attack_labeler" data-on="${cfg.moduleEnabled ? "1" : "0"}">
                <div class="sige-switch"></div>
                <div>
                  <div class="sige-toggle-title">Auto etiquetador</div>
                  <div class="muted" style="margin-top:2px;">Etiqueta ataques automaticamente (subtype=attacks)</div>
                </div>
                <div class="sige-toggle-status">${cfg.moduleEnabled ? "ON" : "OFF"}</div>
              </div>

              <div class="muted" style="margin-top:12px;">
                • Toggle = habilita/desabilita o módulo (auto start/stop)<br/>
                • Somente 1 aba executa (leader). Outras ficam em spectator.
              </div>

              <div style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap;">
                <button class="sige-btn secondary btn-open-module">🏷️ Abrir módulo</button>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    bind() {
      $("#toggle_attack_labeler").off("click").on("click", function () {
        const cfg = AttackLabeler.loadCfg();
        cfg.moduleEnabled = !cfg.moduleEnabled;
        AttackLabeler.saveCfg(cfg);

        // ✅ atualiza UI imediatamente (sem depender do go("home"))
        updateHomeToggleUI();

        // ✅ start/stop local (mas startLoop decide leader/follower)
        if (cfg.moduleEnabled) AttackLabeler.startLoop();
        else AttackLabeler.stopLoop(true);

        // ✅ força outras abas a atualizarem UI e comportamento
        SIGE_SYNC.send("AL_CFG_UPDATED", { cfg });

        // re-render home para refletir config
        SIGEHub.go("home", { showBack: false });
      });

      $(".btn-open-module").off("click").on("click", () => {
        SIGEHub.go("attack_labeler", { showBack: true });
      });
    }
  });

  SIGEHub.registerPanel({
    id: "attack_labeler",
    name: "Auto etiquetador",
    icon: "🏷️",
    render() {
      const s = AttackLabeler.getStatus();
      const cfg = s.cfg;

      const intervalSec = Math.round((cfg.intervalMs || 30000) / 1000);

      return `
        <div class="sige-card">
          <div style="display:flex;align-items:center;gap:10px;justify-content:space-between;">
            <div>
              <div class="sige-title">Auto etiquetador</div>
              <div class="sige-subtitle">Roda em qualquer página — somente uma aba executa (leader)</div>
            </div>
            <div class="muted" style="font-weight:950; text-align:right;">
              Module: <b id="al-module-enabled">${cfg.moduleEnabled ? "ON" : "OFF"}</b><br/>
              Mode: <b id="al-leader-status">${s.isLeader ? "LEADER" : "SPECTATOR"}</b>
            </div>
          </div>

          <div style="margin-top:14px; display:grid; grid-template-columns:1fr 1fr; gap:14px;">
            <div>
              <div class="muted" style="margin-bottom:8px;">Configurações</div>

              <label style="font-weight:950;font-size:12px;">Intervalo</label>
              <div class="sige-range-wrap">
                <input type="range" class="cfg-interval-range" min="5" max="120" step="5" value="${intervalSec}">
                <div class="sige-range-pill">
                  <span class="cfg-interval-val">${intervalSec}</span>s
                </div>
              </div>

              <div class="muted" style="margin-top:6px;">
                <span id="interval-save-status" style="opacity:.9"></span>
              </div>

              <div class="muted" style="margin-top:10px;">
                Próxima execução em: <b id="sige-next-run">—</b>
              </div>

              <div style="height:12px;"></div>

              <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button class="sige-btn danger btn-clear-cache">🧹 Limpar cache</button>
                <button class="sige-btn danger btn-clear-logs">🧹 Limpar logs</button>
              </div>

              <div style="margin-top:12px" class="muted">
                • Auto-clean cache: remove IDs que não estão mais na página<br/>
                • Só remove quando chegada já passou + margem (6h)
              </div>
            </div>

            <div>
              <div class="muted" style="margin-bottom:8px;">Status</div>
              <div class="muted" id="al-status-box">
                Module: <b>${cfg.moduleEnabled ? "ON" : "OFF"}</b><br/>
                Running (lock): <b>${s.running ? "YES" : "NO"}</b><br/>
                Cache size: <b>${s.cacheSize}</b><br/>
              </div>

              <div class="muted" style="margin-top:10px;">Logs de ações</div>
              <div id="sige-attack-logs" class="sige-logbox"></div>
            </div>
          </div>
        </div>
      `;
    },

    bind() {
      function refresh() {
        SIGEHub.go("attack_labeler", { showBack: true });
        setTimeout(() => AttackLabeler.renderLogs(), 20);
      }

      AttackLabeler.renderLogs();

      const debouncedSave = AttackLabeler.debounceIntervalSave((sec) => {
        const cfg = AttackLabeler.loadCfg();
        cfg.intervalMs = Math.max(5, Math.min(120, sec)) * 1000;
        AttackLabeler.saveCfg(cfg);

        $("#interval-save-status").text("Salvo ✅");

        if (cfg.moduleEnabled) AttackLabeler.restartLoopIfRunning();

        SIGE_SYNC.send("AL_CFG_UPDATED", { cfg });
        setTimeout(() => $("#interval-save-status").text(""), 1200);
      });

      $(".cfg-interval-range").off("input").on("input", function () {
        const sec = Number($(this).val());
        $(".cfg-interval-val").text(sec);
        $("#interval-save-status").text("Salvando…");
        debouncedSave(sec);
      });

      $(".btn-clear-cache").off("click").on("click", () => {
        AttackLabeler.clearCache();
        refresh();
      });

      $(".btn-clear-logs").off("click").on("click", () => {
        AttackLabeler.clearAllLogs();
        refresh();
      });
    }
  });

  // ✅ Atualiza UI em tempo real quando outra aba muda algo
  SIGE_SYNC.on((msg) => {
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
  });

  // Boot HUB (não abre automático)
  SIGEHub.open();
  SIGEHub.close();

  // Auto-start: se cfg ON, cada aba decide se será leader ou spectator
  (function bootAutoStart() {
    const cfg = AttackLabeler.loadCfg();
    if (cfg.moduleEnabled) AttackLabeler.startLoop();
  })();

  // Release lock ao fechar aba
  window.addEventListener("beforeunload", () => {
    try { AttackLabeler.stopLoop(true); } catch { }
  });

})(unsafeWindow || window);
