(function () {
  if (window.__debugUI) return;

  if (!window.__ENV__ || !window.__ENV__.DEV) {
    // not in dev mode
    return;
  }

  var STORAGE_KEY = 'dev-tools-pos-v1';

  function t(key, fallback, vars) {
    var i18n = window.i18n;
    if (i18n && i18n.t) return i18n.t(key, vars);
    return fallback;
  }

  function loadPos() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var p = JSON.parse(raw);
      if (!p) return null;
      if (typeof p.left !== 'number' || typeof p.top !== 'number') return null;
      return p;
    } catch (e) {
      return null;
    }
  }

  function savePos(left, top) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ left: left, top: top }));
    } catch (e) {}
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function ensureHost() {
    var host = document.getElementById('dev-tools');
    if (host) return host;

    host = document.createElement('div');
    host.id = 'dev-tools';
    host.style.position = 'fixed';
    host.style.zIndex = '2147483647';
    host.style.display = 'flex';
    host.style.flexDirection = 'column';
    host.style.gap = '8px';
    host.style.padding = '10px';
    host.style.borderRadius = '10px';
    host.style.boxShadow = '0 6px 20px rgba(0,0,0,0.35)';
    host.style.background = 'rgba(20,20,20,0.75)';
    host.style.backdropFilter = 'blur(6px)';
    host.style.color = '#fff';
    host.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    host.style.fontSize = '12px';
    host.style.minWidth = '180px';
    host.style.userSelect = 'none';

    // default position (matches your old right/top-ish feel)
    host.style.left = '';
    host.style.right = '10px';
    host.style.top = '35%';

    // restore saved position (switch to left/top)
    var saved = loadPos();
    if (saved) {
      host.style.right = '';
      host.style.left = saved.left + 'px';
      host.style.top = saved.top + 'px';
    }

    // header row (drag handle + controls)
    var header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.gap = '8px';

    var handle = document.createElement('div');
    handle.textContent = t('debug.tools.title', 'DEV TOOLS');
    handle.style.fontWeight = '700';
    handle.style.letterSpacing = '0.08em';
    handle.style.opacity = '0.9';
    handle.style.cursor = 'grab';
    handle.style.padding = '6px 8px';
    handle.style.borderRadius = '8px';
    handle.style.background = 'rgba(255,255,255,0.08)';
    handle.title = t('debug.tools.drag', 'Drag me');

    var controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.gap = '6px';

    function smallBtn(label, onClick) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.border = 'none';
      b.style.borderRadius = '8px';
      b.style.padding = '6px 10px';
      b.style.cursor = 'pointer';
      b.style.background = 'rgba(255,255,255,0.12)';
      b.style.color = '#fff';
      b.style.fontSize = '12px';
      b.style.opacity = '0.9';
      b.addEventListener('mouseenter', function () { b.style.opacity = '1'; });
      b.addEventListener('mouseleave', function () { b.style.opacity = '0.9'; });
      if (onClick) b.addEventListener('click', onClick);
      return b;
    }

    var row = document.createElement('div');
    row.id = 'dev-tools-row';
    row.style.display = 'flex';
    row.style.flexDirection = 'column';
    row.style.gap = '8px';

    var collapsed = false;
    var hideLabel = t('debug.tools.hide', 'Hide');
    var showLabel = t('debug.tools.show', 'Show');
    var toggle = smallBtn(hideLabel, function () {
      collapsed = !collapsed;
      row.style.display = collapsed ? 'none' : 'flex';
      toggle.textContent = collapsed ? showLabel : hideLabel;
    });

    var reset = smallBtn(t('debug.tools.reset', 'Reset'), function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      host.style.left = '';
      host.style.right = '10px';
      host.style.top = '35%';
    });

    controls.appendChild(toggle);
    controls.appendChild(reset);

    header.appendChild(handle);
    header.appendChild(controls);

    host.appendChild(header);
    host.appendChild(row);
    document.body.appendChild(host);

    // --- Drag logic (mouse + touch/pointer) ---
    var dragging = false;
    var startX = 0, startY = 0;
    var startLeft = 0, startTop = 0;

    function getLeftTop() {
      var rect = host.getBoundingClientRect();
      return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    }

    function onDown(e) {
      // only start drag from the handle
      dragging = true;
      handle.style.cursor = 'grabbing';

      var pt = (e.touches && e.touches[0]) ? e.touches[0] : e;
      startX = pt.clientX;
      startY = pt.clientY;

      var pos = getLeftTop();
      startLeft = pos.left;
      startTop = pos.top;

      // switch to left/top positioning for dragging
      host.style.right = '';
      host.style.left = startLeft + 'px';
      host.style.top = startTop + 'px';

      // prevent text selection / scrolling while dragging
      if (e.preventDefault) e.preventDefault();
    }

    function onMove(e) {
      if (!dragging) return;
      var pt = (e.touches && e.touches[0]) ? e.touches[0] : e;

      var dx = pt.clientX - startX;
      var dy = pt.clientY - startY;

      var rect = host.getBoundingClientRect();
      var newLeft = startLeft + dx;
      var newTop = startTop + dy;

      // clamp to viewport (keep at least 20px visible)
      var minVisible = 20;
      var maxLeft = window.innerWidth - minVisible;
      var maxTop = window.innerHeight - minVisible;

      newLeft = clamp(newLeft, minVisible - rect.width, maxLeft);
      newTop = clamp(newTop, minVisible - rect.height, maxTop);

      host.style.left = newLeft + 'px';
      host.style.top = newTop + 'px';
    }

    function onUp() {
      if (!dragging) return;
      dragging = false;
      handle.style.cursor = 'grab';

      var pos = getLeftTop();
      savePos(pos.left, pos.top);
    }

    // Mouse
    handle.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    // Touch
    handle.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);

    return host;
  }

  function makeButton(label, onClick, opts) {
    opts = opts || {};
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;

    btn.style.border = 'none';
    btn.style.borderRadius = '10px';
    btn.style.padding = '10px 12px';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '13px';
    btn.style.color = '#fff';
    btn.style.background = opts.background || '#2196F3';
    btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.25)';
    btn.style.opacity = '0.9';

    btn.addEventListener('mouseenter', function () { btn.style.opacity = '1'; });
    btn.addEventListener('mouseleave', function () { btn.style.opacity = '0.9'; });
    if (onClick) btn.addEventListener('click', onClick);

    return btn;
  }

  function addButton(label, onClick, opts) {
    var host = ensureHost();
    var row = host.querySelector('#dev-tools-row');
    var btn = makeButton(label, onClick, opts);
    row.appendChild(btn);
    return btn;
  }

  window.__debugUI = { ensureHost: ensureHost, addButton: addButton, makeButton: makeButton };
})();

