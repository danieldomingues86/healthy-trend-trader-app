(() => {
  const storage = window.healthyTrendWorkspace?.storage;
  if (!storage) return;
  let authenticatedUser = null;
  const read = (key, fallback) => {
    try { const raw = storage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch { return fallback; }
  };
  const write = (key, value) => storage.setItem(key, JSON.stringify(value));

  function hydrateWorkspaceViews() {
    const habits = read(HABIT_STORAGE, null);
    if (habits?.habits) habitState = { ...habitState, ...habits, ignoredDays: habits.ignoredDays || {} };
    else habitState = { habits: habitSeed.map((item) => ({ ...item })), records: {}, ignoredDays: {} };

    traderProfileState = { active: 'risk', results: {}, ...read(TRADER_PROFILE_STORAGE, {}) };
    mentalAudioState = { tab: 'scenario', mood: 'all', selected: 'premarket', favorites: [], history: [], ...read(MENTAL_AUDIO_STORAGE, {}) };
    traderWisdomState = { query: '', theme: 'all', favorites: [], ...read(TRADER_WISDOM_STORAGE, {}) };

    const profile = read(PROFILE_STORAGE, null);
    profileState = profile
      ? { ...profileDefaults, ...profile }
      : { ...profileDefaults, name: authenticatedUser?.displayName || '', email: authenticatedUser?.email || '' };
    const avatar = read(AVATAR_STORAGE, null);
    if (avatar) avatarState = { ...avatarDefaults, ...avatar };
    const subscription = read(SUBSCRIPTION_STORAGE, null);
    subscriptionState = subscription ? { ...subscriptionDefaults, ...subscription } : { ...subscriptionDefaults };
    const focus = read(MARKET_FOCUS_STORAGE, null);
    if (focus) marketFocusConfig = { ...marketFocusDefaults, ...focus };

    const legacyJournal = read(JOURNAL_BOOK_STORAGE, null);
    if (Array.isArray(legacyJournal)) journalBookEntries = legacyJournal;

    applyAvatarAppearance();
    // Rebuild the menu once the profile stored for this account is available.
    // This also replaces the temporary header avatar rendered before hydration.
    window.setupAccountMenu?.();
    renderHabitTracker();
    renderTraderProfile();
    renderMentalAudioLibrary();
    renderTraderWisdom();
    renderJournalBook();
    renderMarketFocusGuard();
    renderProfile();
    renderAvatar();
    applySubscriptionAccess();
  }

  saveHabitState = () => write(HABIT_STORAGE, habitState);
  saveTraderProfileState = () => write(TRADER_PROFILE_STORAGE, traderProfileState);
  saveMentalAudioState = () => write(MENTAL_AUDIO_STORAGE, { favorites: mentalAudioState.favorites, history: mentalAudioState.history });
  saveTraderWisdomState = () => write(TRADER_WISDOM_STORAGE, { favorites: traderWisdomState.favorites });
  saveJournalBook = () => write(JOURNAL_BOOK_STORAGE, journalBookEntries);
  saveSubscription = () => write(SUBSCRIPTION_STORAGE, subscriptionState);
  saveMarketFocus = () => { write(MARKET_FOCUS_STORAGE, marketFocusConfig); renderMarketFocusGuard(); setupMarketFocusSettings(); };
  saveWhatsAppSupport = () => { write(WHATSAPP_SUPPORT_STORAGE, whatsAppSupportEnabled); setupWhatsAppSupport(); setupWhatsAppSupportSettings(); };
  applyNavigationLayout = ((original) => function (layout) {
    original(layout);
    write(NAVIGATION_LAYOUT_STORAGE, navigationLayout);
  })(applyNavigationLayout);

  saveProfile = function (event) {
    event.preventDefault();
    const form = event.currentTarget;
    const activeLanguage = window.appLanguage;
    const selectedLanguage = form.profileLanguage.value;
    const languageChanged = selectedLanguage !== activeLanguage;
    profileState = {
      ...profileState,
      name: form.profileName.value.trim().slice(0, 70) || authenticatedUser?.displayName || '',
      email: form.profileEmail.value.trim().slice(0, 120) || authenticatedUser?.email || '',
      language: languageChanged ? selectedLanguage : activeLanguage,
      timezone: form.profileTimezone.value,
      currency: form.profileCurrency.value
    };
    write(PROFILE_STORAGE, profileState);
    setupAccountMenu();
    if (languageChanged && typeof applyLanguage === 'function') applyLanguage(profileState.language);
    else renderProfile();
    showToast(profileText('Meus dados foram salvos na sua conta.', 'Your details were saved to your account.'));
  };

  saveAvatar = function (event) {
    event.preventDefault();
    const form = event.currentTarget;
    const initials = form.avatarInitials.value.toUpperCase().replace(/[^A-ZÀ-Ý0-9]/g, '').slice(0, 3);
    avatarState = { ...avatarState, initials, colour: form.avatarColour.value || avatarDefaults.colour };
    write(AVATAR_STORAGE, avatarState);
    applyAvatarAppearance();
    setupAccountMenu();
    renderProfile();
    renderAvatar();
    showToast(avatarText('Avatar atualizado na sua conta.', 'Avatar updated in your account.'));
  };

  window.addEventListener('healthyTrend:authenticated', (event) => {
    authenticatedUser = event.detail?.user || null;
  });
  window.addEventListener('healthyTrend:workspaceLoaded', hydrateWorkspaceViews);
})();
