(function () {
  if (window.__maxIVInjected) return;
  window.__maxIVInjected = true;

  function getPkmnName() {
    var el = document.getElementById('pkmn-editor-name');
    if (!el) return '';
    return (el.textContent || el.innerText || '').trim();
  }

  function maxIVCurrentPkmn() {
    var id =
      (typeof currentEditedPkmn !== 'undefined' && currentEditedPkmn !== null)
        ? currentEditedPkmn
        : null;

    if (!id) {
      var sprite = document.getElementById('pkmn-editor-sprite');
      if (sprite && sprite.src) {
        var mm = sprite.src.match(/\/(?:shiny\/)?([^\/]+)\.png$/);
        if (mm) id = mm[1];
      }
    }

    if (!id) return console.error('No current Pokémon id found');
    if (!pkmn || !pkmn[id]) return console.error('pkmn not found', id);

    var maxIV = 6;
    pkmn[id].ivs = pkmn[id].ivs || {};
    ['hp', 'atk', 'def', 'satk', 'sdef', 'spe'].forEach(function (k) {
      pkmn[id].ivs[k] = maxIV;
    });

    pkmn[id].caught = Math.max(1, pkmn[id].caught || 0);

    try {
      if (typeof updatePokedex === 'function') updatePokedex();
      if (typeof saveGame === 'function') saveGame();
    } catch (e) {
      console.error(e);
    }

    console.log(id + ' : IVs set to max');
  }

  if (!window.__debugUI) {
    console.warn('debug_ui.js not loaded; max IV button will not render');
    return;
  }

  var btn = window.__debugUI.addButton('Max IV', function () {
    maxIVCurrentPkmn();
  }, { background: '#2196F3' });

  function updateLabel() {
    var name = getPkmnName();
    btn.textContent = name ? ('Max IV: ' + name) : 'Max IV';
  }

  // keep label synced when editor changes
  document.addEventListener('DOMContentLoaded', function () {
    var elObserver = null;
    var docObserver = null;

    function observeEl() {
      var el = document.getElementById('pkmn-editor-name');
      if (!el) return false;

      if (elObserver) elObserver.disconnect();
      elObserver = new MutationObserver(function () { updateLabel(); });
      elObserver.observe(el, { characterData: true, childList: true, subtree: true });

      updateLabel();
      return true;
    }

    if (!observeEl()) {
      docObserver = new MutationObserver(function () {
        if (observeEl()) {
          if (docObserver) { docObserver.disconnect(); docObserver = null; }
        }
      });
      docObserver.observe(document.body, { childList: true, subtree: true });
    }

    setInterval(updateLabel, 1000);
  });
})();

