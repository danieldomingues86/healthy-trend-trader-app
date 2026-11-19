(function () {
  'use strict';

  const Model = window.HealthyTrendAvatarModel;
  if (!Model) {
    console.warn('HealthyTrendAvatarModel not found');
    return;
  }

  let currentState = loadSavedState();
  let currentPage = 1;
  const PAGE_SIZE = 8;

  function loadSavedState() {
    try {
      const savedV2 = localStorage.getItem(Model.STORAGE_KEY_V2);
      if (savedV2) {
        return Model.normalizeAvatarState(JSON.parse(savedV2));
      }
      const savedV1 = localStorage.getItem(Model.STORAGE_KEY_V1);
      if (savedV1) {
        return Model.fromLegacyStorageFormat(JSON.parse(savedV1));
      }
    } catch (e) {
      console.warn('Failed to load avatar state', e);
    }
    return Model.getDefaultAvatarState();
  }

  function t(pt, en) {
    const isEn = (typeof window !== 'undefined' && window.appLanguage === 'en-US');
    return isEn ? (en || pt) : pt;
  }

  function saveCurrentState() {
    try {
      localStorage.setItem(Model.STORAGE_KEY_V2, JSON.stringify(currentState));
      localStorage.setItem(Model.STORAGE_KEY_V1, JSON.stringify(Model.toLegacyStorageFormat(currentState)));
      window.healthyTrendWorkspace?.storage.setItem(Model.STORAGE_KEY_V2, JSON.stringify(currentState));
      window.healthyTrendWorkspace?.storage.setItem(Model.STORAGE_KEY_V1, JSON.stringify(Model.toLegacyStorageFormat(currentState)));
    } catch (e) {
      console.warn('Failed to save avatar state', e);
    }
    applyGlobalAvatar();
  }

  function applyGlobalAvatar() {
    document.documentElement.style.setProperty('--avatar-highlight-color', currentState.colour || '#10b981');
    const colorObj = Model.getHighlightColorById(currentState.highlightColor);
    document.documentElement.style.setProperty('--avatar-highlight-glow', colorObj.glow);

    // Update topbar trigger
    const trigger = document.getElementById('accountTrigger');
    if (trigger && currentState.avatarUrl) {
      trigger.innerHTML = `<img src="${currentState.avatarUrl}" alt="${currentState.name}" class="topbar-avatar-img" />`;
      trigger.title = `${currentState.name} · Menu da conta`;
    }

    // Update profile view if visible
    const profileAvatar = document.querySelector('.profile-avatar');
    if (profileAvatar && currentState.avatarUrl) {
      profileAvatar.innerHTML = `<img src="${currentState.avatarUrl}" alt="${currentState.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`;
    }
  }

  function renderCategoryIcon(icon) {
    switch (icon) {
      case 'bull':
        return `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 7C5.5 4.5 8 4 9.5 5.5C9.5 7.5 8.5 9.5 6.5 10.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 7C22.5 4.5 20 4 18.5 5.5C18.5 7.5 19.5 9.5 21.5 10.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.5 7.5C9.5 6.5 18.5 6.5 20.5 7.5C21.8 12.5 18.5 21 15.5 22.5C14.5 23 13.5 23 12.5 22.5C9.5 21 6.2 12.5 7.5 7.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M11 17.5C12 18 16 18 17 17.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="11.5" cy="13.5" r="1.2" fill="currentColor"/><circle cx="16.5" cy="13.5" r="1.2" fill="currentColor"/></svg>`;
      case 'symbols':
      case 'bars':
        return `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><line x1="7" y1="4" x2="7" y2="24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="4.5" y="9.5" width="5" height="9.5" rx="1" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1.6"/><line x1="14" y1="2.5" x2="14" y2="25.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="11.5" y="5.5" width="5" height="13.5" rx="1" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="1.6"/><line x1="21" y1="5" x2="21" y2="23" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="18.5" y="8.5" width="5" height="8.5" rx="1" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1.6"/></svg>`;
      case 'identity':
      case 'trader':
      default:
        return `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="14" cy="9.5" r="4.5" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.2"/><path d="M5.5 23C5.5 18.5 9.2 16 14 16C18.8 16 22.5 18.5 22.5 23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
    }
  }

  function renderPreviewCategoryIcon(category) {
    switch (category) {
      case 'symbols':
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><line x1="6" y1="3" x2="6" y2="21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="4" y="8" width="4" height="8" rx="0.8" fill="currentColor"/><line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="10" y="5" width="4" height="11" rx="0.8" fill="currentColor"/><line x1="18" y1="4" x2="18" y2="20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="16" y="8" width="4" height="7" rx="0.8" fill="currentColor"/></svg>`;
      case 'identity':
      case 'traders':
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="7.5" r="4" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.2"/><path d="M4.5 19.5C4.5 15.8 8 14 12 14C16 14 19.5 15.8 19.5 19.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
      case 'animals':
      default:
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6C5 4 7 3.8 8 5C8 6.5 7.2 8 5.8 8.8"/><path d="M20 6C19 4 17 3.8 16 5C16 6.5 16.8 8 18.2 8.8"/><path d="M6.5 6.5C8 5.6 16 5.6 17.5 6.5C18.5 10.5 15.8 17.5 13.2 18.8C12.4 19.2 11.6 19.2 10.8 18.8C8.2 17.5 5.5 10.5 6.5 6.5Z"/><circle cx="10" cy="11.5" r="0.8" fill="currentColor"/><circle cx="14" cy="11.5" r="0.8" fill="currentColor"/></svg>`;
    }
  }

  function renderAvatarPage() {
    const root = document.getElementById('avatar');
    if (!root) return;

    const currentCatObj = Model.getCategoryById(currentState.category);
    const categoryCatalog = Model.CATALOG[currentState.category] || Model.MARKET_ANIMALS;
    const pagination = Model.paginate(categoryCatalog, currentPage, PAGE_SIZE);

    root.innerHTML = `
      <div class="avatar-customizer-shell">
        <!-- 1. HERO BANNER -->
        <section class="avatar-hero-banner">
          <div class="avatar-hero-copy">
            <div class="avatar-hero-eyebrow">${t('Área da Conta', 'Account Area')}</div>
            <h1 class="avatar-hero-title">${t('Sua identidade', 'Your identity')} <span class="avatar-hero-title-highlight">${t('no mercado.', 'in the market.')}</span></h1>
            <p class="avatar-hero-subtitle">${t('Escolha um avatar que represente o seu estilo de trader. Ele será a sua identidade dentro do Healthy Trend Trader.', 'Choose an avatar that represents your trading style. It will be your identity within Healthy Trend Trader.')}</p>
          </div>
          <div class="avatar-hero-graphic">
            <img src="assets/avatars/hero-bull-banner.png" alt="Touro de Ouro 3D" />
          </div>
        </section>

        <!-- 2. WORKSPACE GRID -->
        <div class="avatar-workspace-grid">
          <!-- LEFT: CATEGORIES + GALLERY -->
          <div class="avatar-gallery-section">
            <!-- CATEGORIES -->
            <nav class="avatar-categories-nav" aria-label="${t('Categorias de avatares', 'Avatar categories')}">
              ${Model.CATEGORIES.map(cat => {
                const isActive = cat.id === currentState.category;
                return `
                  <button type="button" class="avatar-category-btn ${isActive ? 'active' : ''}" data-cat-id="${cat.id}">
                    <span class="avatar-category-icon-box">
                      ${renderCategoryIcon(cat.icon)}
                    </span>
                    <span class="avatar-category-text">
                      <span class="avatar-category-name">${t(cat.name, cat.nameEn)}</span>
                      <span class="avatar-category-sub">${t(cat.subtitle, cat.subtitleEn)}</span>
                    </span>
                  </button>
                `;
              }).join('')}
            </nav>

            <!-- GALLERY HEADER -->
            <div class="avatar-gallery-head">
              <h2>${t(currentCatObj.name, currentCatObj.nameEn)}</h2>
              <p>${t(currentCatObj.description, currentCatObj.descriptionEn)}</p>
            </div>

            <!-- CARDS GRID -->
            <div class="avatar-cards-grid">
              ${pagination.items.map(item => {
                const isSelected = item.id === currentState.characterId;
                return `
                  <div class="avatar-item-card ${isSelected ? 'active' : ''}" data-char-id="${item.id}" role="button" tabindex="0">
                    <span class="avatar-card-badge" title="${t('Selecionado', 'Selected')}">✓</span>
                    <div class="avatar-portrait-wrap">
                      <img src="${item.avatarUrl}" alt="${t(item.name, item.nameEn)}" class="avatar-portrait-img" loading="lazy" />
                    </div>
                    <div class="avatar-card-title">${t(item.name, item.nameEn)}</div>
                    <p class="avatar-card-desc">${t(item.subtitle, item.subtitleEn)}</p>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- PAGINATION -->
            <div class="avatar-pagination-bar">
              <button type="button" class="avatar-page-arrow prev" ${!pagination.hasPrev ? 'disabled' : ''} aria-label="${t('Página anterior', 'Previous page')}">
                ‹
              </button>
              <div class="avatar-page-dots-list">
                ${Array.from({ length: pagination.totalPages }).map((_, idx) => {
                  const pNum = idx + 1;
                  const isDotActive = pNum === pagination.page;
                  return `
                    <button type="button" class="avatar-page-dot-item ${isDotActive ? 'active' : ''}" data-page="${pNum}" aria-label="${t('Página', 'Page')} ${pNum}"></button>
                  `;
                }).join('')}
              </div>
              <button type="button" class="avatar-page-arrow next" ${!pagination.hasNext ? 'disabled' : ''} aria-label="${t('Próxima página', 'Next page')}">
                ›
              </button>
            </div>
          </div>

          <!-- RIGHT: SIDEBAR PREVIEW -->
          <aside class="avatar-preview-card">
            <h3 class="avatar-preview-heading">${t('Prévia do seu Avatar', 'Preview of your Avatar')}</h3>
            
            <div class="avatar-preview-showcase">
              <div class="avatar-preview-circle-stage frame-${currentState.frame}" id="avatarPreviewStage">
                <img src="${currentState.previewUrl || currentState.avatarUrl}" alt="${t(currentState.name, currentState.nameEn)}" class="avatar-preview-main-img" id="avatarPreviewImg" />
              </div>
              <div class="avatar-preview-meta">
                <div class="avatar-preview-character-name">
                  <span class="avatar-preview-cat-icon" id="avatarPreviewCatIcon">
                    ${renderPreviewCategoryIcon(currentState.category)}
                  </span>
                  <span id="avatarPreviewName">${t(currentState.name, currentState.nameEn)}</span>
                </div>
                <p class="avatar-preview-character-subtitle" id="avatarPreviewSubtitle">${t(currentState.subtitle, currentState.subtitleEn)}</p>
              </div>
            </div>

            <div class="avatar-preview-divider"></div>

            <div class="avatar-customize-section">
              <div class="avatar-customize-title">${t('Personalização adicional', 'Additional Customization')}</div>

              <!-- COR DE DESTAQUE -->
              <span class="avatar-control-label">${t('Cor de destaque', 'Highlight Color')}</span>
              <div class="avatar-swatches-row">
                ${Model.HIGHLIGHT_COLORS.map(color => {
                  const isColorActive = color.id === currentState.highlightColor;
                  const localizedColorName = t(color.name, color.nameEn);
                  return `
                    <button type="button" 
                            class="avatar-color-swatch-btn ${isColorActive ? 'active' : ''}" 
                            data-color-id="${color.id}" 
                            style="background-color: ${color.hex};" 
                            title="${localizedColorName}"
                            aria-label="${localizedColorName}">
                      <span class="swatch-check">✓</span>
                    </button>
                  `;
                }).join('')}
              </div>

              <!-- MOLDURA -->
              <span class="avatar-control-label">${t('Moldura', 'Frame')}</span>
              <div class="avatar-frames-row">
                ${Model.FRAMES.map(frame => {
                  const isFrameActive = frame.id === currentState.frame;
                  const localizedFrameName = t(frame.name, frame.nameEn);
                  return `
                    <button type="button" 
                            class="avatar-frame-choice-btn ${isFrameActive ? 'active' : ''}" 
                            data-frame-id="${frame.id}" 
                            title="${localizedFrameName}"
                            aria-label="${localizedFrameName}">
                      <img src="${frame.iconUrl}" alt="${localizedFrameName}" />
                    </button>
                  `;
                }).join('')}
              </div>

              <!-- BOTÃO DE CONFIRMAÇÃO -->
              <button type="button" class="avatar-save-submit-btn" id="avatarSaveBtn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                <span>${t('Salvar Avatar', 'Save Avatar')}</span>
              </button>
            </div>
          </aside>
        </div>
      </div>
    `;

    bindEvents(root);
    if (typeof window.completeLocalization === 'function') {
      window.completeLocalization();
    }
  }

  function bindEvents(root) {
    // Category click
    root.querySelectorAll('.avatar-category-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const catId = btn.dataset.catId;
        if (catId && catId !== currentState.category) {
          currentState = Model.selectCategory(currentState, catId);
          currentPage = 1;
          renderAvatarPage();
        }
      });
    });

    // Character click
    root.querySelectorAll('.avatar-item-card').forEach(card => {
      card.addEventListener('click', () => {
        const charId = card.dataset.charId;
        if (charId) {
          currentState = Model.selectCharacter(currentState, charId);
          updatePreview();
          root.querySelectorAll('.avatar-item-card').forEach(c => {
            c.classList.toggle('active', c.dataset.charId === charId);
          });
        }
      });
    });

    // Color swatch click
    root.querySelectorAll('.avatar-color-swatch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const colorId = btn.dataset.colorId;
        if (colorId) {
          currentState = Model.selectColor(currentState, colorId);
          updatePreview();
          root.querySelectorAll('.avatar-color-swatch-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.colorId === colorId);
          });
        }
      });
    });

    // Frame choice click
    root.querySelectorAll('.avatar-frame-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const frameId = btn.dataset.frameId;
        if (frameId) {
          currentState = Model.selectFrame(currentState, frameId);
          updatePreview();
          root.querySelectorAll('.avatar-frame-choice-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.frameId === frameId);
          });
        }
      });
    });

    // Pagination buttons
    const prevBtn = root.querySelector('.avatar-page-arrow.prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          renderAvatarPage();
        }
      });
    }

    const nextBtn = root.querySelector('.avatar-page-arrow.next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const categoryCatalog = Model.CATALOG[currentState.category] || Model.MARKET_ANIMALS;
        const totalPages = Math.ceil(categoryCatalog.length / PAGE_SIZE);
        if (currentPage < totalPages) {
          currentPage++;
          renderAvatarPage();
        }
      });
    }

    root.querySelectorAll('.avatar-page-dot-item').forEach(dot => {
      dot.addEventListener('click', () => {
        const target = parseInt(dot.dataset.page, 10);
        if (target && target !== currentPage) {
          currentPage = target;
          renderAvatarPage();
        }
      });
    });

    // Save button click
    const saveBtn = root.querySelector('#avatarSaveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        saveCurrentState();
        if (typeof window.showToast === 'function') {
          window.showToast(t('Avatar salvo com sucesso! Sua identidade foi atualizada.', 'Avatar saved successfully! Your identity has been updated.'));
        }
      });
    }
  }

  function updatePreview() {
    const previewStage = document.getElementById('avatarPreviewStage');
    const previewImg = document.getElementById('avatarPreviewImg');
    const previewName = document.getElementById('avatarPreviewName');
    const previewSubtitle = document.getElementById('avatarPreviewSubtitle');
    const previewCatIcon = document.getElementById('avatarPreviewCatIcon');

    if (previewImg) {
      previewImg.src = currentState.previewUrl || currentState.avatarUrl;
      previewImg.alt = t(currentState.name, currentState.nameEn);
    }
    if (previewCatIcon) {
      previewCatIcon.innerHTML = renderPreviewCategoryIcon(currentState.category);
    }
    if (previewName) {
      previewName.textContent = t(currentState.name, currentState.nameEn);
    }
    if (previewSubtitle) {
      previewSubtitle.textContent = t(currentState.subtitle, currentState.subtitleEn);
    }
    if (previewStage) {
      previewStage.className = `avatar-preview-circle-stage frame-${currentState.frame}`;
      const colorObj = Model.getHighlightColorById(currentState.highlightColor);
      previewStage.style.setProperty('--avatar-highlight-glow', colorObj.glow);
    }
    if (typeof window.completeLocalization === 'function') {
      window.completeLocalization();
    }
  }

  // Hook into project's global lifecycle
  window.renderAvatar = renderAvatarPage;
  window.renderAvatarCustomizer = renderAvatarPage;
  window.applyAvatarAppearance = applyGlobalAvatar;

  // Re-render avatar page if language changes
  const origApplyLanguage = window.applyLanguage;
  if (typeof origApplyLanguage === 'function') {
    window.applyLanguage = function (...args) {
      const res = origApplyLanguage.apply(this, args);
      try {
        const root = document.getElementById('avatar');
        if (root && root.classList.contains('active')) {
          renderAvatarPage();
        }
      } catch (_) {}
      return res;
    };
  }

  // Initialize on load if root exists
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      applyGlobalAvatar();
      renderAvatarPage();
    });
  } else {
    applyGlobalAvatar();
    renderAvatarPage();
  }

  // Also reapply whenever account menu is built
  const origSetupAccountMenu = window.setupAccountMenu;
  if (typeof origSetupAccountMenu === 'function') {
    window.setupAccountMenu = function () {
      origSetupAccountMenu.apply(this, arguments);
      applyGlobalAvatar();
    };
  }

  window.addEventListener('healthyTrend:workspaceLoaded', () => {
    currentState = loadSavedState();
    applyGlobalAvatar();
    renderAvatarPage();
  });
})();
