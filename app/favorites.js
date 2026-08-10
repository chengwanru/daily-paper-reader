(function (root) {
  const STORAGE_KEY = 'dpr_favorite_papers_v1';
  const CHANGE_EVENT = 'dpr-favorites-changed';

  const normalizeText = (value) => String(value || '').trim();

  const normalizePaperId = (value) => {
    let text = normalizeText(value);
    if (!text) return '';
    if (text.startsWith('#/')) text = text.slice(2);
    if (text.startsWith('#') && !text.startsWith('#/')) text = text.slice(1);
    text = text.replace(/\.md$/i, '').replace(/^\/+/, '').replace(/\/+$/, '');
    return text;
  };

  const normalizeHref = (paperId) => {
    const id = normalizePaperId(paperId);
    return id ? `#/${id}` : '';
  };

  const loadAll = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  };

  const saveAll = (map) => {
    const safe = map && typeof map === 'object' ? map : {};
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    } catch (e) {
      console.warn('[DPR Favorites] 写入 localStorage 失败：', e);
    }
    try {
      document.dispatchEvent(
        new CustomEvent(CHANGE_EVENT, {
          detail: { count: Object.keys(safe).length },
        }),
      );
    } catch {
      // ignore
    }
  };

  const listFavorites = () => {
    const map = loadAll();
    return Object.keys(map)
      .map((id) => {
        const item = map[id];
        if (!item || typeof item !== 'object') {
          return {
            id,
            href: normalizeHref(id),
            title: id,
            titleZh: '',
            addedAt: 0,
          };
        }
        return {
          id,
          href: normalizeHref(item.href || id),
          title: normalizeText(item.title) || id,
          titleZh: normalizeText(item.titleZh),
          addedAt: Number(item.addedAt) || 0,
        };
      })
      .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  };

  const isFavorite = (paperId) => {
    const id = normalizePaperId(paperId);
    if (!id) return false;
    const map = loadAll();
    return !!map[id];
  };

  const collectPageMeta = (paperId) => {
    const id = normalizePaperId(paperId);
    const titleZh =
      normalizeText(
        (document.querySelector('.paper-title-zh') || {}).textContent,
      ) ||
      normalizeText(
        (document.querySelector('h1.paper-title-zh') || {}).textContent,
      );
    const titleEn =
      normalizeText(
        (document.querySelector('.paper-title-en') || {}).textContent,
      ) ||
      normalizeText(
        (document.querySelector('h2.paper-title-en') || {}).textContent,
      ) ||
      normalizeText(document.title).replace(/\s*[·|].*$/, '');
    return {
      id,
      href: normalizeHref(id),
      title: titleEn || titleZh || id,
      titleZh: titleZh,
      addedAt: Date.now(),
    };
  };

  const addFavorite = (paperId, meta) => {
    const id = normalizePaperId(paperId);
    if (!id) return { ok: false, reason: 'missing-id' };
    const map = loadAll();
    const pageMeta = meta && typeof meta === 'object' ? meta : collectPageMeta(id);
    const existed = !!map[id];
    map[id] = {
      href: normalizeHref(pageMeta.href || id),
      title: normalizeText(pageMeta.title) || id,
      titleZh: normalizeText(pageMeta.titleZh),
      addedAt: existed && map[id].addedAt ? map[id].addedAt : Date.now(),
    };
    saveAll(map);
    return { ok: true, existed, item: map[id] };
  };

  const removeFavorite = (paperId) => {
    const id = normalizePaperId(paperId);
    if (!id) return false;
    const map = loadAll();
    if (!map[id]) return false;
    delete map[id];
    saveAll(map);
    return true;
  };

  const toggleFavorite = (paperId, meta) => {
    if (isFavorite(paperId)) {
      removeFavorite(paperId);
      return { ok: true, favorited: false };
    }
    const result = addFavorite(paperId, meta);
    return { ok: result.ok, favorited: true, existed: result.existed };
  };

  let toastTimer = null;
  const showToast = (message, kind) => {
    let el = document.getElementById('dpr-favorites-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'dpr-favorites-toast';
      el.className = 'dpr-favorites-toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.toggle('is-error', kind === 'error');
    el.classList.add('is-visible');
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      el.classList.remove('is-visible');
    }, 1800);
  };

  const favoriteCurrentPaper = (paperId) => {
    const id = normalizePaperId(paperId);
    if (!id) {
      showToast('当前不是论文页，无法收藏', 'error');
      return { ok: false };
    }
    const result = addFavorite(id);
    if (!result.ok) {
      showToast('收藏失败', 'error');
      return result;
    }
    showToast(result.existed ? '已在收藏夹中' : '已加入收藏夹');
    return result;
  };

  // 收藏夹改在侧栏内展示；这里只负责切换侧栏视图。
  const openFavoritesPanel = () => {
    try {
      if (window.DPRSidebar && typeof window.DPRSidebar.openFavoritesPanel === 'function') {
        return !!window.DPRSidebar.openFavoritesPanel();
      }
    } catch {
      // ignore
    }
    try {
      document.dispatchEvent(new CustomEvent('dpr-open-favorites'));
      return true;
    } catch {
      return false;
    }
  };

  const closeFavoritesPanel = () => {
    try {
      if (window.DPRSidebar && typeof window.DPRSidebar.closeFavoritesPanel === 'function') {
        return !!window.DPRSidebar.closeFavoritesPanel();
      }
    } catch {
      // ignore
    }
    return false;
  };

  // 连续三击空格检测（单次/双次仍交给调用方执行原空格行为）
  const createTripleSpaceDetector = (options) => {
    const windowMs = Math.max(100, Number((options && options.windowMs) || 700));
    const nowFn =
      options && typeof options.now === 'function' ? options.now : () => Date.now();
    let count = 0;
    let lastTs = 0;
    return {
      onSpace() {
        const now = Number(nowFn()) || 0;
        if (!lastTs || now - lastTs > windowMs) {
          count = 1;
        } else {
          count += 1;
        }
        lastTs = now;
        if (count >= 3) {
          count = 0;
          lastTs = 0;
          return 'triple';
        }
        return 'single';
      },
      reset() {
        count = 0;
        lastTs = 0;
      },
    };
  };

  const api = {
    STORAGE_KEY,
    CHANGE_EVENT,
    normalizePaperId,
    normalizeHref,
    loadAll,
    listFavorites,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    collectPageMeta,
    favoriteCurrentPaper,
    openFavoritesPanel,
    closeFavoritesPanel,
    showToast,
    createTripleSpaceDetector,
  };

  root.DPRFavorites = api;
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
