
// --- FUNZIONI DI UTILITY ---
const createSafeId = (str) => {
    if (typeof str !== 'string') return '';
    return str.toLowerCase().replace(/ /g, '-').replace(/[%()]/g, '').replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
};

const showToast = (title, icon = 'success') => {
    Swal.fire({ toast: true, position: 'top-end', icon, title, showConfirmButton: false, timer: 1500, timerProgressBar: true, didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); } });
};

const showErrorAlert = (message) => {
    Swal.fire({ icon: 'error', title: 'Oops...', text: message });
};

const populateSelect = (selectId, options, firstOptionText) => {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '';
    if (firstOptionText) {
        const firstOpt = document.createElement('option');
        firstOpt.value = '';
        firstOpt.textContent = firstOptionText;
        select.appendChild(firstOpt);
    }
    options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = typeof option === 'object' ? option.value : option;
        opt.textContent = typeof option === 'object' ? option.name : option;
        select.appendChild(opt);
    });
};

// --- USER INTERFACE & THEME FUNCTIONS ---
const updateLoginUI = () => {
    const navLoginLink = document.getElementById('nav-login-link');
    const navUserMenu = document.getElementById('nav-user-menu');
    const currentUsernameSpan = document.getElementById('current-username');
    const navUserAvatar = document.getElementById('nav-user-avatar');
    const navUserManagementLink = document.getElementById('nav-user-management');

    if (currentUser) {
        navLoginLink.classList.add('d-none');
        navUserMenu.classList.remove('d-none');
        currentUsernameSpan.textContent = currentUser.username;
        navUserAvatar.src = currentUser.avatar || 'uploads/default_avatar.png';
        navUserAvatar.style.display = 'inline-block';

        if (currentUser.role === 'admin' || currentUser.role === 'moderator') {
            navUserManagementLink.parentElement.style.display = 'block';
        } else {
            navUserManagementLink.parentElement.style.display = 'none';
        }
    } else {
        navLoginLink.classList.remove('d-none');
        navUserMenu.classList.add('d-none');
    }
};

function applyTheme(theme) {
    const themeToggle = document.getElementById('theme-toggle-checkbox');
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        if(themeToggle) themeToggle.checked = true;
        const darkThemeRadio = document.getElementById('theme-dark');
        if(darkThemeRadio) darkThemeRadio.checked = true;
    } else {
        document.body.classList.remove('dark-mode');
        if(themeToggle) themeToggle.checked = false;
        const lightThemeRadio = document.getElementById('theme-light');
        if(lightThemeRadio) lightThemeRadio.checked = true;
    }
}

function updateAppearanceUI() {
    if (!currentUser) return;

    const currentTheme = localStorage.getItem('theme') || 'light';
    applyTheme(currentTheme);

    const galleryBackgroundElement = document.documentElement;
    const bodyElement = document.body;

    const enableBackgroundSwitch = document.getElementById('enable-background-switch');
    const backgroundSelectorContainer = document.getElementById('background-selector-container');
    const backgroundSelectorGrid = document.getElementById('background-selector-grid');
    const galleryEnableBackgroundSwitch = document.getElementById('gallery-enable-background-switch');
    const galleryBackgroundOptions = document.getElementById('gallery-background-options');
    const galleryBackgroundSelectorGrid = document.getElementById('gallery-background-selector-grid');

    if (currentUser.background && currentUser.background !== 'disattivato') {
        galleryBackgroundElement.style.setProperty('--gallery-background', `url(data/backgrounds/${currentUser.background})`);
        bodyElement.classList.add('body-has-background');

        if (enableBackgroundSwitch) enableBackgroundSwitch.checked = true;
        if (backgroundSelectorContainer) backgroundSelectorContainer.classList.remove('hidden');
        if (galleryEnableBackgroundSwitch) galleryEnableBackgroundSwitch.checked = true;
        if (galleryBackgroundOptions) galleryBackgroundOptions.style.display = 'block';

        [backgroundSelectorGrid, galleryBackgroundSelectorGrid].forEach(grid => {
            if (grid) {
                grid.querySelectorAll('.img-thumbnail').forEach(img => {
                    if (img.closest('.background-item').dataset.bg === currentUser.background) {
                        img.classList.add('selected');
                    } else {
                        img.classList.remove('selected');
                    }
                });
            }
        });
    } else {
        bodyElement.classList.remove('body-has-background');
        galleryBackgroundElement.style.removeProperty('--gallery-background');

        if (enableBackgroundSwitch) enableBackgroundSwitch.checked = false;
        if (backgroundSelectorContainer) backgroundSelectorContainer.classList.add('hidden');
        if (galleryEnableBackgroundSwitch) galleryEnableBackgroundSwitch.checked = false;
        if (galleryBackgroundOptions) galleryBackgroundOptions.style.display = 'none';

        [backgroundSelectorGrid, galleryBackgroundSelectorGrid].forEach(grid => {
            if (grid) {
                grid.querySelectorAll('.img-thumbnail').forEach(img => img.classList.remove('selected'));
            }
        });
    }

    const enableCardOpacitySwitch = document.getElementById('enable-card-opacity-switch');
    const cardOpacitySliderContainer = document.getElementById('card-opacity-slider-container');
    const galleryEnableCardOpacitySwitch = document.getElementById('gallery-enable-card-opacity-switch');
    const galleryCardOpacitySliderContainer = document.getElementById('gallery-card-opacity-slider-container');

    if (currentUser.background && currentUser.background !== 'disattivato') {
        if (enableCardOpacitySwitch) enableCardOpacitySwitch.disabled = false;
        if (galleryEnableCardOpacitySwitch) galleryEnableCardOpacitySwitch.disabled = false;

        if (currentUser.card_opacity === 'on') {
            bodyElement.classList.add('card-opacity-on');
            if (enableCardOpacitySwitch) enableCardOpacitySwitch.checked = true;
            if (cardOpacitySliderContainer) cardOpacitySliderContainer.style.display = 'block';
            if (galleryEnableCardOpacitySwitch) galleryEnableCardOpacitySwitch.checked = true;
            if (galleryCardOpacitySliderContainer) galleryCardOpacitySliderContainer.style.display = 'block';
        } else {
            bodyElement.classList.remove('card-opacity-on');
            if (enableCardOpacitySwitch) enableCardOpacitySwitch.checked = false;
            if (cardOpacitySliderContainer) cardOpacitySliderContainer.style.display = 'none';
            if (galleryEnableCardOpacitySwitch) galleryEnableCardOpacitySwitch.checked = false;
            if (galleryCardOpacitySliderContainer) galleryCardOpacitySliderContainer.style.display = 'none';
        }
    } else {
        bodyElement.classList.remove('card-opacity-on');
        if (enableCardOpacitySwitch) { enableCardOpacitySwitch.checked = false; enableCardOpacitySwitch.disabled = true; }
        if (cardOpacitySliderContainer) cardOpacitySliderContainer.style.display = 'none';
        if (galleryEnableCardOpacitySwitch) { galleryEnableCardOpacitySwitch.checked = false; galleryEnableCardOpacitySwitch.disabled = true; }
        if (galleryCardOpacitySliderContainer) galleryCardOpacitySliderContainer.style.display = 'none';
    }
}

function initTheme() {
    const themeToggle = document.getElementById('theme-toggle-checkbox');
    updateAppearanceUI();

    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            const newTheme = themeToggle.checked ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });
    }

    const themeRadios = document.querySelectorAll('input[name="theme-radios"]');
    themeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const newTheme = e.target.value;
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });
    });
}

const getStatusColorClass = (type, value, rarity = '4-star') => {
    switch (type) {
        case 'constellation':
            if (rarity === '5-star') {
                if (value >= 6) return 'rarity-5-c6'; if (value === 5) return 'rarity-5-c5'; if (value === 4) return 'rarity-5-c4'; if (value === 3) return 'rarity-5-c3'; if (value === 2) return 'rarity-5-c2'; if (value === 1) return 'rarity-5-c1'; return 'rarity-5-c0';
            } else { if (value >= 6) return 'text-success'; if (value >= 2) return 'text-warning'; return 'text-danger'; }
        case 'signature_weapon':
            if (value === 'Best in the slot') return 'text-success';
            if (value === 'Buona') return 'text-info';
            if (value === '4 Stelle') return 'text-danger';
            return '';
        case 'talents':
            if (value === 'Sì') return 'text-success'; if (value === 'Vicino') return 'text-warning'; return 'text-danger';
        default: return '';
    }
};

const getStatColorForIdeal = (statName, statValue) => {
    if (!currentCharacterData || !currentCharacterData.profile.ideal_stats) return '';
    const idealValue = currentCharacterData.profile.ideal_stats[statName];
    if (idealValue === undefined || idealValue === null || statValue === 'N/D') return '';
    const actual = parseFloat(statValue), ideal = parseFloat(idealValue);
    if (isNaN(actual) || isNaN(ideal) || ideal === 0) return '';
    const percentage = (actual / ideal);
    if (percentage >= 0.95) return 'text-success'; if (percentage >= 0.90) return 'text-warning'; if (percentage >= 0.80) return 'text-orange'; return 'text-danger';
};
