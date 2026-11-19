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
        return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-1.5-14.5 0-.2-.6-1.5-2-3-2-2 0-3 3-3 5 0 2 1.5 4 3 4 1.2 0 2.2-.8 2.7-1.8 1.4 3.5 5 6.8 9.8 6.8s8.4-3.3 9.8-6.8c.5 1 1.5 1.8 2.7 1.8 1.5 0 3-2 3-4 0-2-1-5-3-5z"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/></svg>`;
      case 'crown':
        return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>`;
      case 'bars':
        return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>`;
      case 'trader':
      default:
        return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
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
            <div class="avatar-hero-eyebrow">Área da Conta</div>
            <h1 class="avatar-hero-title">Sua identidade <span class="avatar-hero-title-highlight">no mercado.</span></h1>
            <p class="avatar-hero-subtitle">Escolha um avatar que represente o seu estilo de trader. Ele será a sua identidade dentro do Healthy Trend Trader.</p>
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
            <nav class="avatar-categories-nav" aria-label="Categorias de avatares">
              ${Model.CATEGORIES.map(cat => {
                const isActive = cat.id === currentState.category;
                return `
                  <button type="button" class="avatar-category-btn ${isActive ? 'active' : ''}" data-cat-id="${cat.id}">
                    <span class="avatar-category-icon-box">
                      ${renderCategoryIcon(cat.icon)}
                    </span>
                    <span class="avatar-category-text">
                      <span class="avatar-category-name">${cat.name}</span>
                      <span class="avatar-category-sub">${cat.subtitle}</span>
                    </span>
                  </button>
                `;
              }).join('')}
            </nav>

            <!-- GALLERY HEADER -->
            <div class="avatar-gallery-head">
              <h2>${currentCatObj.name}</h2>
              <p>${currentCatObj.description}</p>
            </div>

            <!-- CARDS GRID -->
            <div class="avatar-cards-grid">
              ${pagination.items.map(item => {
                const isSelected = item.id === currentState.characterId;
                return `
                  <div class="avatar-item-card ${isSelected ? 'active' : ''}" data-char-id="${item.id}" role="button" tabindex="0">
                    <span class="avatar-card-badge" title="Selecionado">✓</span>
                    <div class="avatar-portrait-wrap">
                      <img src="${item.avatarUrl}" alt="${item.name}" class="avatar-portrait-img" loading="lazy" />
                    </div>
                    <div class="avatar-card-title">${item.name}</div>
                    <p class="avatar-card-desc">${item.subtitle}</p>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- PAGINATION -->
            <div class="avatar-pagination-bar">
              <button type="button" class="avatar-page-arrow prev" ${!pagination.hasPrev ? 'disabled' : ''} aria-label="Página anterior">
                ‹
              </button>
              <div class="avatar-page-dots-list">
                ${Array.from({ length: pagination.totalPages }).map((_, idx) => {
                  const pNum = idx + 1;
                  const isDotActive = pNum === pagination.page;
                  return `
                    <button type="button" class="avatar-page-dot-item ${isDotActive ? 'active' : ''}" data-page="${pNum}" aria-label="Página ${pNum}"></button>
                  `;
                }).join('')}
              </div>
              <button type="button" class="avatar-page-arrow next" ${!pagination.hasNext ? 'disabled' : ''} aria-label="Próxima página">
                ›
              </button>
            </div>
          </div>

          <!-- RIGHT: SIDEBAR PREVIEW -->
          <aside class="avatar-preview-card">
            <h3 class="avatar-preview-heading">Prévia do seu Avatar</h3>
            
            <div class="avatar-preview-showcase">
              <div class="avatar-preview-circle-stage frame-${currentState.frame}" id="avatarPreviewStage">
                <img src="${currentState.previewUrl || currentState.avatarUrl}" alt="${currentState.name}" class="avatar-preview-main-img" id="avatarPreviewImg" />
              </div>
              <div class="avatar-preview-meta">
                <div class="avatar-preview-character-name">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-1.5-14.5 0-.2-.6-1.5-2-3-2-2 0-3 3-3 5 0 2 1.5 4 3 4 1.2 0 2.2-.8 2.7-1.8 1.4 3.5 5 6.8 9.8 6.8s8.4-3.3 9.8-6.8c.5 1 1.5 1.8 2.7 1.8 1.5 0 3-2 3-4 0-2-1-5-3-5z"/></svg>
                  <span id="avatarPreviewName">${currentState.name}</span>
                </div>
                <p class="avatar-preview-character-subtitle" id="avatarPreviewSubtitle">${currentState.subtitle}</p>
              </div>
            </div>

            <div class="avatar-preview-divider"></div>

            <div class="avatar-customize-section">
              <div class="avatar-customize-title">Personalização adicional</div>

              <!-- COR DE DESTAQUE -->
              <span class="avatar-control-label">Cor de destaque</span>
              <div class="avatar-swatches-row">
                ${Model.HIGHLIGHT_COLORS.map(color => {
                  const isColorActive = color.id === currentState.highlightColor;
                  return `
                    <button type="button" 
                            class="avatar-color-swatch-btn ${isColorActive ? 'active' : ''}" 
                            data-color-id="${color.id}" 
                            style="background-color: ${color.hex};" 
                            title="${color.name}"
                            aria-label="${color.name}">
                      <span class="swatch-check">✓</span>
                    </button>
                  `;
                }).join('')}
              </div>

              <!-- MOLDURA -->
              <span class="avatar-control-label">Moldura</span>
              <div class="avatar-frames-row">
                ${Model.FRAMES.map(frame => {
                  const isFrameActive = frame.id === currentState.frame;
                  return `
                    <button type="button" 
                            class="avatar-frame-choice-btn ${isFrameActive ? 'active' : ''}" 
                            data-frame-id="${frame.id}" 
                            title="${frame.name}"
                            aria-label="${frame.name}">
                      <img src="${frame.iconUrl}" alt="${frame.name}" />
                    </button>
                  `;
                }).join('')}
              </div>

              <!-- BOTÃO DE CONFIRMAÇÃO -->
              <button type="button" class="avatar-save-submit-btn" id="avatarSaveBtn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Salvar Avatar</span>
              </button>
            </div>
          </aside>
        </div>
      </div>
    `;

    bindEvents(root);
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
          window.showToast('Avatar salvo com sucesso! Sua identidade foi atualizada.');
        }
      });
    }
  }

  function updatePreview() {
    const previewStage = document.getElementById('avatarPreviewStage');
    const previewImg = document.getElementById('avatarPreviewImg');
    const previewName = document.getElementById('avatarPreviewName');
    const previewSubtitle = document.getElementById('avatarPreviewSubtitle');

    if (previewImg) {
      previewImg.src = currentState.previewUrl || currentState.avatarUrl;
      previewImg.alt = currentState.name;
    }
    if (previewName) {
      previewName.textContent = currentState.name;
    }
    if (previewSubtitle) {
      previewSubtitle.textContent = currentState.subtitle;
    }
    if (previewStage) {
      previewStage.className = `avatar-preview-circle-stage frame-${currentState.frame}`;
      const colorObj = Model.getHighlightColorById(currentState.highlightColor);
      previewStage.style.setProperty('--avatar-highlight-glow', colorObj.glow);
    }
  }

  // Hook into project's global lifecycle
  window.renderAvatar = renderAvatarPage;
  window.applyAvatarAppearance = applyGlobalAvatar;

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
