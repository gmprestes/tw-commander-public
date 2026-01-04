(function (w) {
  "use strict";

  const $ = w.jQuery || w.$;
  if (!$) return;

  const SIGEUI = w.SIGEUI || {};
  const SIGE_SYNC = w.SIGE_SYNC || { send() { }, on() { } };

  const AttackLabeler = (() => {
    const CFG_KEY = "SIGE_ATTACK_LABELER_CFG_v2";
    const CACHE_KEY = "SIGE_ATTACK_LABELER_CACHE_v2";
    const LOG_KEY = "SIGE_ATTACK_LABELER_LOG_v2";

    const CLEANUP_MARGIN_HOURS = 6;

    // Debounce config
    const INTERVAL_DEBOUNCE_MS = 1200;

    // Singleton Cross-Tab
    const SINGLETON_LOCK_KEY = "SIGE_ATTACK_LABELER_SINGLETON_LOCK_v1";
    const TAB_ID_KEY = "SIGE_ATTACK_LABELER_TAB_ID_v1";
    const SINGLETON_TTL_MS = 15000;       // expira em 15s se aba morrer
    const SINGLETON_HEARTBEAT_MS = 5000;  // renova a cada 5s

    let singletonHeartbeat = null;
    let isLeader = false;

    let running = false;
    let loopTimer = null;
    let countdownTimer = null;
    let nextRunAt = null;

    function now() { return Date.now(); }

    // ======================= SINGLETON HELPERS =======================
    function getTabId() {
      let id = sessionStorage.getItem(TAB_ID_KEY);
      if (!id) {
        id = `tab_${Math.random().toString(16).slice(2)}_${Date.now()}`;
        sessionStorage.setItem(TAB_ID_KEY, id);
      }
      return id;
    }

    function readLock() {
      try { return JSON.parse(localStorage.getItem(SINGLETON_LOCK_KEY) || "null"); }
      catch { return null; }
    }

    function writeLock(lock) {
      localStorage.setItem(SINGLETON_LOCK_KEY, JSON.stringify(lock));
    }

    function isLockValid(lock) {
      return lock && lock.owner && lock.expiresAt && lock.expiresAt > Date.now();
    }

    function tryAcquireLock() {
      const tabId = getTabId();
      const lock = readLock();

      // lock válido de outra aba => não pode
      if (isLockValid(lock) && lock.owner !== tabId) return false;

      // assume / renova
      const newLock = {
        owner: tabId,
        updatedAt: Date.now(),
        expiresAt: Date.now() + SINGLETON_TTL_MS
      };
      writeLock(newLock);

      // re-check
      const check = readLock();
      return check && check.owner === tabId;
    }

    function releaseLock() {
      const tabId = getTabId();
      const lock = readLock();
      if (lock && lock.owner === tabId) localStorage.removeItem(SINGLETON_LOCK_KEY);
    }

    function becomeLeader() {
      isLeader = true;
      SIGE_SYNC.send("AL_LEADER", { leader: getTabId() });
      SIGE_SYNC.send("AL_STATUS_UPDATED", { status: getStatus() });
    }

    function becomeFollower() {
      isLeader = false;
      SIGE_SYNC.send("AL_FOLLOWER", { follower: getTabId() });
      SIGE_SYNC.send("AL_STATUS_UPDATED", { status: getStatus() });
    }

    function startSingletonHeartbeat() {
      stopSingletonHeartbeat();

      const tabId = getTabId();

      singletonHeartbeat = setInterval(() => {
        const lock = readLock();

        // se somos donos -> renova TTL
        if (lock && lock.owner === tabId) {
          lock.updatedAt = Date.now();
          lock.expiresAt = Date.now() + SINGLETON_TTL_MS;
          writeLock(lock);

          if (!isLeader) becomeLeader();
          return;
        }

        // se não somos dono -> tenta assumir (failover)
        const ok = tryAcquireLock();
        if (ok) {
          if (!isLeader) becomeLeader();
        } else {
          if (isLeader) becomeFollower();
          // se não conseguiu, garante que não executa
          //if (loopTimer) // ✅ sempre para timers locais primeiro (mas NÃO mexe em lock)
          stopTimers();
        }
      }, SINGLETON_HEARTBEAT_MS);
    }

    function stopSingletonHeartbeat() {
      if (singletonHeartbeat) clearInterval(singletonHeartbeat);
      singletonHeartbeat = null;
    }

    // Em tempo real, se outra aba assumir lock, nós paramos aqui também
    w.addEventListener("storage", (ev) => {
      if (ev.key !== SINGLETON_LOCK_KEY) return;

      const lock = readLock();
      const tabId = getTabId();

      // perdi o lock: vire follower e pare timers, MAS continue heartbeat
      if (isLeader && (!lock || (lock.owner && lock.owner !== tabId))) {
        becomeFollower();
        stopTimers(); // ✅ só para timers locais
        pushLog("Spectator: outra aba assumiu. Fui para follower.", "info");
        SIGE_SYNC.send("AL_STATUS_UPDATED", { status: getStatus() });
      }
    });


    // ======================= UI helpers =======================
    function fmtCountdown(ms) {
      ms = Math.max(0, ms);
      const s = Math.floor(ms / 1000);
      const mm = Math.floor(s / 60);
      const ss = s % 60;
      if (mm >= 60) {
        const hh = Math.floor(mm / 60);
        const rm = mm % 60;
        return `${String(hh).padStart(2, "0")}:${String(rm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
      }
      return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
    }

    function ts() {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    function loadLogs() {
      try { return JSON.parse(localStorage.getItem(LOG_KEY) || "[]") || []; }
      catch { return []; }
    }

    function pushLog(text, type = "info") {
      const logs = loadLogs();
      logs.unshift({ t: ts(), type, text: String(text || "") });
      while (logs.length > 120) logs.pop();
      localStorage.setItem(LOG_KEY, JSON.stringify(logs));
      renderLogs();

      // broadcast pra atualizar UI em outras abas
      SIGE_SYNC.send("AL_LOGS_UPDATED", {});
    }

    function clearLogs() {
      localStorage.removeItem(LOG_KEY);
      renderLogs();
      SIGE_SYNC.send("AL_LOGS_UPDATED", {});
    }

    function renderLogs() {
      const logs = loadLogs();
      const $box = $("#sige-attack-logs");
      if (!$box.length) return;

      $box.html(logs.map(l => `
        <div class="sige-logline ${l.type}">
          <span class="t">[${l.t}]</span> ${escapeHtml(l.text)}
        </div>
      `).join("") || `<div class="muted">Sem logs ainda…</div>`);
    }

    function escapeHtml(s) {
      return String(s || "").replace(/[&<>"']/g, (m) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[m]);
    }

    function loadCfg() {
      try {
        const cfg = JSON.parse(localStorage.getItem(CFG_KEY) || "null") || {
          moduleEnabled: false,
          intervalMs: 30000,
          maxCache: 50000
        };
        if (!cfg.intervalMs || cfg.intervalMs < 5000) cfg.intervalMs = 30000;
        if (typeof cfg.moduleEnabled !== "boolean") cfg.moduleEnabled = false;
        return cfg;
      } catch {
        return { moduleEnabled: false, intervalMs: 30000, maxCache: 50000 };
      }
    }

    function saveCfg(cfg) {
      localStorage.setItem(CFG_KEY, JSON.stringify(cfg || {}));
      SIGE_SYNC.send("AL_CFG_UPDATED", { cfg: cfg || {} });
    }

    function loadCache() {
      try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") || {}; }
      catch { return {}; }
    }

    function saveCache(cache, maxCache = 50000) {
      try {
        const entries = Object.entries(cache || {});
        if (entries.length > maxCache) {
          entries.sort((a, b) => (a[1]?.seenAt || 0) - (b[1]?.seenAt || 0));
          const removeCount = entries.length - maxCache;
          for (let i = 0; i < removeCount; i++) delete cache[entries[i][0]];
        }
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      } catch { }
    }

    function gameUrl(params) {
      const gd = w.game_data;
      const base = (gd?.player?.sitter > 0) ? `game.php?t=${gd.player.id}` : `game.php`;
      return `${base}${base.includes("?") ? "&" : "?"}${params}`;
    }

    function getCsrf() {
      return w.csrf_token || $('input[name="h"]').val() || '';
    }

    function currentVillageId() {
      const gd = w.game_data;
      const fromGd = gd?.village?.id;
      if (fromGd) return Number(fromGd);
      const m = location.href.match(/village=(\d+)/);
      return m ? Number(m[1]) : null;
    }

    async function fetchPageHtml(page) {
      const villageId = currentVillageId();
      const url = gameUrl(`village=${villageId}&screen=overview_villages&mode=incomings&type=all&subtype=attacks&group=0&page=${page}`);
      pushLog(`GET page=${page}`, "info");
      const res = await fetch(url, { method: "GET", credentials: "include", cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status} ao carregar page=${page}`);
      return res.text();
    }

    function parsePaginationMax(html) {
      const $root = $("<div>").html(html);
      const $pager = $root.find("a.paged-nav-item[href*='page=']");
      if (!$pager.length) return 0;
      let max = 0;
      $pager.each(function () {
        const href = $(this).attr("href") || "";
        const m = href.match(/page=(\d+)/);
        if (m) max = Math.max(max, Number(m[1]));
      });
      return max;
    }

    function parseLandingTimeFromRow($tr) {
      const raw = ($tr.find("td").eq(5).text() || "").trim();
      const m = raw.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}:\d{2})(?::(\d{1,3}))?/);
      if (!m) return null;

      const [dd, mm, yyyy] = m[1].split("/").map(Number);
      const [HH, MM, SS] = m[2].split(":").map(Number);
      const ms = Number((m[3] || "0").padStart(3, "0"));
      const dt = new Date(yyyy, mm - 1, dd, HH, MM, SS, ms);
      if (Number.isNaN(dt.getTime())) return null;
      return dt.getTime();
    }

    function parseCommandIdsAndLanding(html) {
      const $root = $("<div>").html(html);
      const rows = [];

      $root.find("#incomings_table tbody tr").each(function () {
        const $tr = $(this);
        const isAttack = $tr.find('img[src*="command/attack"]').length > 0;
        if (!isAttack) return;

        const $hid = $tr.find('input[name^="command_ids["]');
        if (!$hid.length) return;

        const name = $hid.attr("name") || "";
        const mm = name.match(/command_ids\[(\d+)\]/);
        if (!mm) return;

        const id = mm[1];
        const landingAt = parseLandingTimeFromRow($tr);
        rows.push({ id, landingAt });
      });

      return rows;
    }

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    async function collectAllAttackIdsAndLanding() {
      const first = await fetchPageHtml(0);
      const maxPage = parsePaginationMax(first);

      const rows0 = parseCommandIdsAndLanding(first);
      const all = new Map();
      rows0.forEach(r => all.set(r.id, r.landingAt));

      pushLog(`Página 0 => ${all.size} ataques`, "info");

      if (maxPage > 0) {
        pushLog(`Paginação detectada: 0..${maxPage}`, "info");
        for (let p = 1; p <= maxPage; p++) {
          const html = await fetchPageHtml(p);
          const rows = parseCommandIdsAndLanding(html);
          rows.forEach(r => {
            if (!all.has(r.id)) all.set(r.id, r.landingAt);
          });
          pushLog(`Página ${p} => +${rows.length} (total ${all.size})`, "info");
          await sleep(140);
        }
      }

      return all;
    }

    async function postLabel(ids) {
      if (!ids.length) return { ok: true, count: 0 };

      const villageId = currentVillageId();
      const csrf = getCsrf();
      if (!csrf) throw new Error("CSRF token (h) não encontrado.");

      const url = gameUrl(`village=${villageId}&screen=overview_villages&mode=incomings&action=process&type=all&subtype=attacks`);

      const form = new FormData();
      form.append("label", "Etiqueta");
      form.append("h", csrf);
      ids.forEach(id => {
        form.append(`id_${id}`, "on");
      });
      //console.log(fd.toString());

      pushLog(`POST etiqueta ids=${ids.length}`, "info");

      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        body: form
      });

      if (!res.ok) throw new Error(`HTTP ${res.status} no POST de etiqueta.`);
      return { ok: true, count: ids.length };
    }

    function cleanupCache(cache, idsInPageMap) {
      const marginMs = CLEANUP_MARGIN_HOURS * 3600 * 1000;
      const threshold = now() + marginMs;

      let removed = 0;

      for (const [id, entry] of Object.entries(cache)) {
        const stillOnPage = idsInPageMap.has(id);
        if (stillOnPage) continue;

        const landingAt = entry?.landingAt || 0;
        if (!landingAt) continue;

        if (landingAt < threshold) {
          delete cache[id];
          removed++;
        }
      }

      if (removed > 0) pushLog(`Cache cleanup: removidos ${removed}`, "ok");
      return removed;
    }

    async function runOnce({ silent = false } = {}) {
      const cfg = loadCfg();
      if (!cfg.moduleEnabled) return;

      // ✅ Spectator: somente leader executa
      if (!isLeader) return;

      if (running) {
        pushLog("runOnce ignorado: já está executando (lock)", "info");
        return;
      }

      running = true;
      pushLog("runOnce iniciado", "info");

      try {
        const cache = loadCache();
        const idsMap = await collectAllAttackIdsAndLanding();

        cleanupCache(cache, idsMap);

        const allIds = Array.from(idsMap.keys());
        const newIds = allIds.filter(id => !cache[id]);

        pushLog(`Encontrados ${allIds.length} ataques, novos=${newIds.length}`, "info");

        if (!newIds.length) {
          pushLog("Nenhum novo comando", "ok");
          saveCache(cache, cfg.maxCache || 50000);
          return;
        }

        const resp = await postLabel(newIds);

        if (resp.ok) {
          const tsNow = now();
          newIds.forEach(id => {
            cache[id] = {
              seenAt: tsNow,
              landingAt: idsMap.get(id) || 0
            };
          });

          for (const [id, landingAt] of idsMap.entries()) {
            if (cache[id] && landingAt) cache[id].landingAt = landingAt;
          }

          saveCache(cache, cfg.maxCache || 50000);

          pushLog(`Novos comandos etiquetados ${resp.count}`, "ok");

          // ✅ Só o leader exibe toast
          if (!silent && SIGEUI.SuccessMessage) {
            SIGEUI.SuccessMessage(`${resp.count} novos ataques detectados ✅`);
          }
        }
      } catch (e) {
        console.error(e);
        pushLog(`Erro: ${e.message || e}`, "err");

        // ✅ Só exibe erro (pedido seu)
        if (SIGEUI.ErrorMessage) SIGEUI.ErrorMessage(e.message || "Erro ao etiquetar ataques.");
      } finally {
        running = false;
        renderLogs();
        SIGE_SYNC.send("AL_STATUS_UPDATED", { status: getStatus() });
      }
    }

    function updateNextRunUI() {
      const $el = $("#sige-next-run");
      if (!$el.length) return;

      if (!nextRunAt) {
        $el.text("—");
        return;
      }

      const diff = nextRunAt - now();
      $el.text(diff <= 0 ? "agora" : fmtCountdown(diff));
    }

    function startCountdown() {
      stopCountdown();
      countdownTimer = setInterval(updateNextRunUI, 250);
      updateNextRunUI();
    }

    function stopCountdown() {
      if (countdownTimer) clearInterval(countdownTimer);
      countdownTimer = null;
    }


    function startLoop() {
      const cfg = loadCfg();
      if (!cfg.moduleEnabled) return;

      // ✅ sempre para timers locais primeiro (mas NÃO mexe em lock)
      stopTimers();

      // ✅ tenta virar leader
      const ok = tryAcquireLock();

      if (ok) {
        becomeLeader();
      } else {
        becomeFollower();
      }

      startSingletonHeartbeat();

      // ✅ follower NÃO executa loop, só fica em spectator
      if (!isLeader) {
        SIGE_SYNC.send("AL_STATUS_UPDATED", { status: getStatus() });
        return;
      }

      pushLog("StartLoop: iniciando loop (leader)", "ok");

      // roda agora
      runOnce({ silent: true }).catch(() => { });

      nextRunAt = now() + cfg.intervalMs;
      startCountdown();

      loopTimer = setInterval(() => {
        const c = loadCfg();
        if (!c.moduleEnabled) return;
        if (!isLeader) return;

        nextRunAt = now() + c.intervalMs;
        runOnce({ silent: true }).catch(() => { });
      }, Math.max(5000, Number(cfg.intervalMs || 30000)));

      SIGE_SYNC.send("AL_STATUS_UPDATED", { status: getStatus() });
    }


    function stopTimers() {
      if (loopTimer) clearInterval(loopTimer);
      loopTimer = null;

      nextRunAt = null;
      stopCountdown();

      running = false;
    }


    function stopLoop(silent = false) {
      // ✅ para tudo local primeiro
      stopTimers();

      stopSingletonHeartbeat();
      releaseLock();

      becomeFollower();

      if (!silent || wasLeader)
        pushLog("Loop parado", "info");

      SIGE_SYNC.send("AL_STATUS_UPDATED", { status: getStatus() });
    }

    function restartLoopIfRunning() {
      const cfg = loadCfg();
      if (!cfg.moduleEnabled) return;
      startLoop();
    }

    function clearCache() {
      localStorage.removeItem(CACHE_KEY);
      pushLog("Cache limpo", "ok");
      if (isLeader && SIGEUI.SuccessMessage) SIGEUI.SuccessMessage("Cache limpo ✅");
      SIGE_SYNC.send("AL_STATUS_UPDATED", { status: getStatus() });
    }

    function clearAllLogs() {
      clearLogs();
      if (isLeader && SIGEUI.SuccessMessage) SIGEUI.SuccessMessage("Logs limpos ✅");
    }

    function getStatus() {
      const cfg = loadCfg();
      const cache = loadCache();
      return {
        moduleEnabled: !!cfg.moduleEnabled,
        running,
        cfg,
        cacheSize: Object.keys(cache).length,
        nextRunAt,
        isLeader
      };
    }

    function debounceIntervalSave(cb) {
      let t = null;
      return function (...args) {
        if (t) clearTimeout(t);
        t = setTimeout(() => cb.apply(null, args), INTERVAL_DEBOUNCE_MS);
      };
    }

    // ======================= SYNC: outras abas atualizam UI =======================
    SIGE_SYNC.on((msg) => {
      if (!msg || !msg.type) return;

      if (msg.type === "AL_CFG_UPDATED") {
        // aba recebeu update de cfg: se estiver com módulo ligado, reavalia loop
        const cfg = loadCfg();
        if (cfg.moduleEnabled) {
          startLoop(); // decide leader/follower automaticamente
        } else {
          stopLoop(true);
        }
      }

      if (msg.type === "AL_STATUS_UPDATED") {
        // apenas para UI (main.js vai ouvir também)
      }

      if (msg.type === "AL_LOGS_UPDATED") {
        renderLogs();
      }
    });

    return {
      startLoop,
      stopLoop,
      restartLoopIfRunning,
      runOnce,
      clearCache,
      getStatus,
      loadCfg,
      saveCfg,
      renderLogs,
      pushLog,
      clearAllLogs,
      debounceIntervalSave
    };
  })();

  w.AttackLabeler = AttackLabeler;
})(unsafeWindow || window);
