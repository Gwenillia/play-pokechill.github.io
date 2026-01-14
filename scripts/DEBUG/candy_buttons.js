(function () {
  if (window.__candyButtonsInjected) return;
  window.__candyButtonsInjected = true;

  function findByText(text){
    const needle = (text || '').toLowerCase();
    const els = document.querySelectorAll('*');
    for(const el of els){
      const t = ((el.textContent || el.value || el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('alt') || el.getAttribute('data-action')) || '').trim().toLowerCase();
      if(t === needle) return el;
    }
    for(const el of els){
      const t = ((el.textContent || el.value || el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('alt') || el.getAttribute('data-action')) || '').trim().toLowerCase();
      if(t && t.includes(needle)) return el;
    }
    return null;
  }

  function triggerClick(el){
    if(!el) return;
    try{ el.click(); return; }catch(e){}
    const ev = new MouseEvent('click', {bubbles:true,cancelable:true,view:window});
    el.dispatchEvent(ev);
  }

  // Ensure debug UI exists
  if (!window.__debugUI) {
    console.warn('debug_ui.js not loaded; candy buttons will not render');
    return;
  }

  const candyBtn = window.__debugUI.addButton('Candytime XL', () => {
    if (item && item.timeCandyXL && typeof item.timeCandyXL.effect === 'function') {
      try { item.timeCandyXL.effect(); return; } catch (e) { console.error(e); }
    }
    const target = findByText('Candytime XL');
    if (target) triggerClick(target);
    else alert('Candytime XL action not available on this page.');
  }, { background: '#ff4081' });

  const plus5Btn = window.__debugUI.addButton('+5 Candy', () => {
    if (item && item.timeCandyXL) {
      try {
        item.timeCandyXL.got = (item.timeCandyXL.got || 0) + 5;
        if (typeof window.save === 'function') window.save();
        else if (typeof window.saveGame === 'function') window.saveGame();
        return;
      } catch (e) { console.error(e); }
    }
    const target = findByText('+5') || findByText('Plus 5') || findByText('+ 5');
    if (target) triggerClick(target);
    else alert('+5 action not available on this page.');
  }, { background: '#ff4081' });

  document.addEventListener('keydown', function(e){
    if(e.shiftKey && e.key === 'C') candyBtn.click();
    if(e.shiftKey && e.key === '5') plus5Btn.click();
  });
})();

