(function () {
  "use strict";

  GM_addStyle(`
    :root{
      --sige-bg: #0b1220;
      --sige-border: rgba(255,255,255,.10);
      --sige-text: rgba(255,255,255,.92);
      --sige-muted: rgba(255,255,255,.65);
      --sige-accent: #3b82f6;
      --sige-accent2:#2563eb;
      --sige-danger: #ef4444;
      --sige-ok: #22c55e;
      --sige-shadow: 0 14px 60px rgba(0,0,0,.55);
    }

    #sigehub-root{ position:fixed; inset:0; z-index:2147483647; pointer-events:none; isolation:isolate; }
    #sigehub-overlay{ position:fixed; inset:0; background:rgba(0,0,0,.65); display:none; align-items:center; justify-content:center; pointer-events:auto; }
    body.sigehub-open{ overflow:hidden !important; }

    #sigehub-modal{
      width:min(1200px,97vw); height:min(820px,94vh);
      border-radius:16px; overflow:hidden; display:flex;
      background:var(--sige-bg); box-shadow:var(--sige-shadow);
      border:1px solid var(--sige-border);
      position:relative;
    }

    #sigehub-sidebar{
      width:260px;
      background:linear-gradient(180deg,#0a1020,#050814);
      border-right:1px solid var(--sige-border);
      display:flex; flex-direction:column; color:var(--sige-text);
    }

    #sigehub-brand{
      padding:14px; font-weight:950; letter-spacing:.6px;
      display:flex; align-items:center; justify-content:space-between;
      border-bottom:1px solid var(--sige-border); font-size:14px;
    }

    #sigehub-brand .badge{
      background:rgba(59,130,246,.15);
      border:1px solid rgba(59,130,246,.35);
      padding:5px 10px; border-radius:999px;
      font-size:12px; font-weight:950;
      color:rgba(255,255,255,.95);
    }

    #sigehub-menu{ padding:12px; display:flex; flex-direction:column; gap:10px; overflow:auto; }
    .sigehub-menuitem{
      background:rgba(255,255,255,.05);
      border:1px solid rgba(255,255,255,.08);
      color:var(--sige-text);
      padding:12px; border-radius:14px;
      cursor:pointer; display:flex; align-items:center; gap:10px;
      font-weight:950; transition:all .15s ease;
    }
    .sigehub-menuitem:hover{ background:rgba(255,255,255,.08); transform:translateY(-1px); border-color:rgba(255,255,255,.14); }
    .sigehub-menuitem.active{ background:rgba(59,130,246,.20); border-color:rgba(59,130,246,.5); }

    #sigehub-footer{
      margin-top:auto; padding:12px 14px;
      font-size:12px; color:rgba(255,255,255,.70);
      border-top:1px solid var(--sige-border);
      background:rgba(0,0,0,.25);
    }

    #sigehub-content{
      flex:1; display:flex; flex-direction:column; overflow:hidden;
      background:radial-gradient(1200px 700px at 30% 0%, rgba(59,130,246,.12), transparent 60%),
                 var(--sige-bg);
    }

    #sigehub-topbar{
      display:flex; align-items:center; gap:10px;
      padding:12px 14px; border-bottom:1px solid var(--sige-border);
      background:rgba(0,0,0,.25); backdrop-filter: blur(10px);
      color:var(--sige-text);
    }

    #sigehub-topbar .title{ font-weight:950; font-size:14px; letter-spacing:.4px; }
    #sigehub-topbar button{
      border:1px solid rgba(255,255,255,.10);
      cursor:pointer; background:rgba(255,255,255,.06);
      padding:8px 12px; border-radius:12px;
      font-weight:950; color:var(--sige-text);
    }
    #sigehub-topbar button:hover{ background:rgba(255,255,255,.10); border-color:rgba(255,255,255,.18); }

    /* 🔥 X no canto superior direito só na HOME */
    .sigehub-xclose{
      position:absolute;
      top:6px;
      right:14px;
      width:30px;
      height:30px;
      border-radius:12px;
      border:1px solid rgba(255,255,255,.12);
      background:rgba(255,255,255,.06);
      color:rgba(255,255,255,.95);
      font-weight:950;
      cursor:pointer;
      display:none;
      align-items:center;
      justify-content:center;
      z-index:10;
    }
    .sigehub-xclose:hover{
      background:rgba(255,255,255,.10);
      border-color:rgba(255,255,255,.18);
    }

    #sigehub-panel{ flex:1; overflow:auto; padding:16px; }

    #sigehub-float{
      width:40px; height:40px;
      background:linear-gradient(135deg,var(--sige-accent),#1e40af);
      color:#fff; border-radius:16px;
      display:flex; align-items:center; justify-content:center;
      font-weight:950; cursor:pointer;
      box-shadow:0 14px 34px rgba(59,130,246,.35);
      user-select:none;
      border:1px solid rgba(255,255,255,.10);
    }
    #sigehub-float:hover{ transform:scale(1.06); }

    .sige-card{
      background:rgba(0,0,0,.25);
      border:1px solid var(--sige-border);
      border-radius:18px;
      padding:16px;
      box-shadow:0 10px 28px rgba(0,0,0,.35);
      color:var(--sige-text);
    }

    .sige-title{ font-weight:950; font-size:18px; }
    .sige-subtitle{ color:var(--sige-muted); font-weight:850; font-size:12px; margin-top:2px; }

    .sige-btn{
      border:1px solid rgba(255,255,255,.12);
      cursor:pointer;
      border-radius:14px;
      padding:10px 12px;
      font-weight:950;
      display:inline-flex;
      align-items:center;
      gap:8px;
      background:linear-gradient(135deg,var(--sige-accent),var(--sige-accent2));
      color:#fff;
    }
    .sige-btn.secondary{
      background:rgba(255,255,255,.07);
      color:var(--sige-text);
      border-color:rgba(255,255,255,.12);
    }
    .sige-btn.danger{
      background:linear-gradient(135deg,#ef4444,#b91c1c);
      border-color:rgba(239,68,68,.35);
    }

    .muted{ color:var(--sige-muted); font-weight:850; font-size:12px; line-height:1.35; }

    /* slider */
    .sige-range-wrap{
      display:flex;
      gap:12px;
      align-items:center;
      margin-top:8px;
    }
    .sige-range-wrap input[type="range"]{
      width:100%;
      cursor:pointer;
      accent-color: var(--sige-accent);
    }
    .sige-range-pill{
      min-width:110px;
      text-align:center;
      padding:8px 10px;
      border-radius:999px;
      font-weight:950;
      border:1px solid rgba(255,255,255,.14);
      background:rgba(0,0,0,.28);
      color:rgba(255,255,255,.92);
    }

    /* mini log */
    .sige-logbox{
      margin-top:12px;
      border:1px solid rgba(255,255,255,.12);
      background:rgba(0,0,0,.25);
      border-radius:14px;
      padding:10px;
      max-height:220px;
      overflow:auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size:11px;
      line-height:1.4;
      color:rgba(255,255,255,.92);
    }
    .sige-logline{ opacity:.95; }
    .sige-logline .t{ opacity:.65; }
    .sige-logline.err{ color:rgba(255,170,170,.95); }
    .sige-logline.ok{ color:rgba(170,255,200,.95); }
    .sige-logline.info{ color:rgba(170,210,255,.95); }

    /* BIG TOGGLE */
    .sige-toggle{
      display:flex;
      align-items:center;
      gap:12px;
      padding:14px;
      border-radius:16px;
      border:1px solid rgba(255,255,255,.12);
      background:rgba(255,255,255,.05);
      cursor:pointer;
      transition:all .15s ease;
      user-select:none;
    }
    .sige-toggle:hover{
      background:rgba(255,255,255,.08);
      border-color:rgba(255,255,255,.18);
      transform: translateY(-1px);
    }
    .sige-switch{
      width:64px;
      height:34px;
      border-radius:999px;
      border:1px solid rgba(255,255,255,.15);
      background:rgba(0,0,0,.35);
      position:relative;
      flex-shrink:0;
      box-shadow: inset 0 0 0 1px rgba(0,0,0,.25);
    }
    .sige-switch::after{
      content:"";
      width:26px;
      height:26px;
      border-radius:999px;
      background:rgba(255,255,255,.92);
      position:absolute;
      top:3px;
      left:4px;
      transition:all .18s ease;
      box-shadow:0 10px 24px rgba(0,0,0,.45);
    }
    .sige-toggle[data-on="1"] .sige-switch{
      background:rgba(34,197,94,.18);
      border-color:rgba(34,197,94,.35);
    }
    .sige-toggle[data-on="1"] .sige-switch::after{ left:34px; background:rgba(220,255,235,.98); }

    .sige-toggle-title{ font-weight:950; font-size:14px; color:rgba(255,255,255,.95); }
    .sige-toggle-status{
      margin-left:auto;
      font-weight:950;
      padding:6px 10px;
      border-radius:999px;
      font-size:12px;
      border:1px solid rgba(255,255,255,.12);
      background:rgba(0,0,0,.25);
    }
    .sige-toggle[data-on="1"] .sige-toggle-status{
      color:rgba(210,255,230,.95);
      border-color:rgba(34,197,94,.35);
      background:rgba(34,197,94,.12);
    }
    .sige-toggle[data-on="0"] .sige-toggle-status{
      color:rgba(255,200,200,.95);
      border-color:rgba(239,68,68,.35);
      background:rgba(239,68,68,.10);
    }

    /* ======================= SIGE TOAST ======================= */
    #sige-toast-root{
      position: fixed;
      top: 18px;
      right: 18px;
      z-index: 2147483647 !important;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
      width: 380px;
      max-width: calc(100vw - 36px);
    }
    .sige-toast{
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(15, 23, 42, .92);
      backdrop-filter: blur(10px);
      box-shadow: 0 18px 70px rgba(0,0,0,.55);
      color: rgba(255,255,255,.95);
      font-weight: 900;
      overflow: hidden;
      transform: translateX(30px);
      opacity: 0;
      animation: sigeToastIn .22s ease forwards;
      position: relative;
    }
    .sige-toast .icon{
      width: 26px; height: 26px; border-radius: 10px;
      display:flex; align-items:center; justify-content:center;
      font-size: 16px; flex-shrink: 0;
    }
    .sige-toast .title{ font-size: 13px; font-weight: 950; margin-bottom: 2px; }
    .sige-toast .msg{ font-size: 12px; line-height: 1.35; font-weight: 850; opacity: .92; word-break: break-word; }
    .sige-toast .close{
      cursor: pointer; user-select: none; font-size: 14px;
      opacity: .7; padding: 2px 6px; border-radius: 10px;
      border: 1px solid rgba(255,255,255,.10);
      background: rgba(255,255,255,.05);
    }
    .sige-toast .close:hover{ opacity: 1; background: rgba(255,255,255,.10); }
    .sige-toast .bar{ position:absolute; bottom:0; left:0; height:3px; width:100%; opacity:.9; }
    .sige-toast .bar > div{ height:100%; width:100%; transform-origin:left; animation: sigeToastBar linear forwards; }
    .sige-toast.success .icon{ background: rgba(34,197,94,.18); border:1px solid rgba(34,197,94,.35); }
    .sige-toast.success .bar{ background: rgba(34,197,94,.15); }
    .sige-toast.success .bar > div{ background: rgba(34,197,94,.75); }
    .sige-toast.error .icon{ background: rgba(239,68,68,.18); border:1px solid rgba(239,68,68,.35); }
    .sige-toast.error .bar{ background: rgba(239,68,68,.15); }
    .sige-toast.error .bar > div{ background: rgba(239,68,68,.80); }
    .sige-toast.info .icon{ background: rgba(59,130,246,.18); border:1px solid rgba(59,130,246,.35); }
    .sige-toast.info .bar{ background: rgba(59,130,246,.15); }
    .sige-toast.info .bar > div{ background: rgba(59,130,246,.80); }
    @keyframes sigeToastIn{ from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes sigeToastOut{ from { transform: translateX(0); opacity: 1; } to { transform: translateX(30px); opacity: 0; } }
    @keyframes sigeToastBar{ from { transform: scaleX(1); } to { transform: scaleX(0); } }
  `);
})();
