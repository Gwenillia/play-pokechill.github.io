(() => {
  const STORAGE_KEY = "pokechillLanguage";
  const data = window.i18nData || {};
  const generated = window.i18nGenerated || {};

  Object.keys(generated).forEach((lang) => {
    data[lang] = data[lang] || { ui: {}, names: {}, info: {} };
    data[lang].names = { ...(data[lang].names || {}), ...(generated[lang]?.names || {}) };
    data[lang].info = { ...(data[lang].info || {}), ...(generated[lang]?.info || {}) };
  });

  const defaultLang = data.fr ? "fr" : (data.en ? "en" : Object.keys(data)[0]);
  let currentLang = localStorage.getItem(STORAGE_KEY) || defaultLang;

  const interpolate = (text, vars = {}) =>
    Object.keys(vars).reduce(
      (result, key) => result.replaceAll(`{${key}}`, vars[key]),
      text
    );

  const normalizeLang = (lang) => (data[lang] ? lang : defaultLang);

  const t = (key, vars) => {
    const lang = normalizeLang(currentLang);
    const value = data[lang]?.ui?.[key] ?? data.en?.ui?.[key] ?? key;
    return interpolate(String(value), vars);
  };

  const tId = (type, id) => {
    if (!id) return undefined;
    const lang = normalizeLang(currentLang);
    const key = String(id);
    return data[lang]?.names?.[type]?.[key]
      ?? data.en?.names?.[type]?.[key];
  };

  const tInfo = (type, id, vars, fallback) => {
    if (!id) return typeof fallback === "function" ? fallback() : "";
    const lang = normalizeLang(currentLang);
    const key = String(id);
    const raw = data[lang]?.info?.[type]?.[key]
      ?? data.en?.info?.[type]?.[key];
    if (raw) return interpolate(String(raw), vars);
    if (typeof fallback === "function") return fallback();
    return "";
  };

  const applyTranslations = (root = document) => {
    if (!root?.querySelectorAll) return;
    root.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    root.querySelectorAll("[data-i18n-html]").forEach((el) => {
      el.innerHTML = t(el.dataset.i18nHtml);
    });
    root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
  };

  const setLanguage = (lang) => {
    currentLang = normalizeLang(lang);
    localStorage.setItem(STORAGE_KEY, currentLang);
    document.documentElement.lang = currentLang;
    applyTranslations();
    window.dispatchEvent(new CustomEvent("i18n:change", { detail: currentLang }));
  };

  const getLanguage = () => currentLang;

  const wrapInfoMap = (source, type) => {
    if (!source) return;
    Object.keys(source).forEach((id) => {
      const entry = source[id];
      if (!entry || typeof entry.info !== "function") return;
      const original = entry.info.bind(entry);
      entry.info = () => tInfo(type, id, {}, original);
    });
  };

  const reportMissing = (lang) => {
    if (!lang || !data[lang]) return;
    const missing = {};
    const missingInfo = {};
    const check = (source, type) => {
      if (!source) return;
      const keys = Object.keys(source);
      const names = data[lang]?.names?.[type] || {};
      const missingKeys = keys.filter((key) => !names[key]);
      if (missingKeys.length) missing[type] = missingKeys;
    };

    const checkInfo = (source, type) => {
      if (!source) return;
      const info = data[lang]?.info?.[type] || {};
      const keys = Object.keys(source).filter((key) => typeof source[key]?.info === "function");
      const missingKeys = keys.filter((key) => !info[key]);
      if (missingKeys.length) missingInfo[type] = missingKeys;
    };

    check(window.pkmn, "pkmn");
    check(window.item, "item");
    check(window.move, "move");
    check(window.ability, "ability");

    checkInfo(window.item, "item");
    checkInfo(window.move, "move");
    checkInfo(window.ability, "ability");

    if (Object.keys(missing).length) {
      window.i18nMissing = missing;
      console.warn("Missing translations:", missing);
    }

    if (Object.keys(missingInfo).length) {
      window.i18nMissingInfo = missingInfo;
      console.warn("Missing translation info:", missingInfo);
    }
  };

  window.i18n = {
    t,
    tId,
    tInfo,
    setLanguage,
    getLanguage,
    applyTranslations,
    reportMissing
  };

  if (defaultLang) {
    document.documentElement.lang = currentLang;
  }

  wrapInfoMap(window.item, "item");
  wrapInfoMap(window.move, "move");
  wrapInfoMap(window.ability, "ability");

  applyTranslations();
  reportMissing("fr");
})();
