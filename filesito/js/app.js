
document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAZIONE CENTRALE ---
    window.config = {
        elements: ["Pyro", "Geo", "Cryo", "Dendro", "Hydro", "Anemo", "Electro"],
        roles: ["Healer", "Support", "Main DPS", "Sub DPS", "Shielder"],
        stats: ["HP", "Atk", "Def", "Energy Recharge (%)", "Elemental Mastery", "Crit Rate (%)", "Crit Damage (%)"],
        signatureOptions: ["Best in the slot", "Buona", "4 Stelle"],
        talentOptions: ["Sì", "Vicino", "No"]
    };

    window.roleColors = {
        'Main DPS': '#d32f2f', 'Sub DPS': '#f57c00', 'Support': '#1976d2', 'Healer': '#388e3c', 'Shielder': '#7b1fa2',
    };

    // --- STATO APPLICAZIONE (GLOBALE) ---
    window.sourceCharacterData = [];
    window.characterLibrary = [];
    window.elementsData = [];
    window.currentCharacterData = null;
    window.dataLoaded = false;
    window.currentUser = null;
    window.isAdmin = false;
    window.grimoireBackground = null;

    // --- ELEMENTI DOM ---
    const views = document.querySelectorAll('.view');
    const navLogoutBtn = document.getElementById('nav-logout');
    const navUserManagementLink = document.getElementById('nav-user-management');

    // --- ROUTER E GESTIONE VISTE ---
    window.showView = (viewId) => {
        const body = document.body;
        views.forEach(view => view.classList.remove('active'));
        const activeView = document.getElementById(viewId);
        if (activeView) {
            activeView.classList.add('active');
        }

        body.classList.remove('body-has-background', 'grimoire-background');
        document.documentElement.style.removeProperty('--gallery-background');
        document.documentElement.style.removeProperty('--grimoire-background');

        if (viewId === 'grimoire-view' || viewId === 'character-detail-view') {
            if(typeof applyGrimoireBackground === 'function') applyGrimoireBackground();
        } else {
            if(typeof updateAppearanceUI === 'function') updateAppearanceUI(); 
        }
    };

    const handleRouteChange = async () => {
        await checkSession();
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }

        const hash = window.location.hash || '#';

        if (!dataLoaded && currentUser) {
            try {
                const response = await fetch('php/api.php?action=get_all_characters');
                sourceCharacterData = await response.json();
                dataLoaded = true;
            } catch (error) {
                showErrorAlert("Impossibile caricare i dati dei personaggi.");
                return;
            }
        }

        if (hash.startsWith('#character/')) {
            const charName = decodeURIComponent(hash.substring(11));
            const charData = sourceCharacterData.find(c => c.profile.name === charName);
            if (charData && typeof loadDashboard === 'function') {
                loadDashboard(charData);
            } else {
                location.hash = '#';
            }
        } else if (hash.startsWith('#edit-character/')) {
            const charName = decodeURIComponent(hash.substring(16));
            const charData = sourceCharacterData.find(c => c.profile.name === charName);
            if (charData && typeof loadCharacterEditPage === 'function') {
                loadCharacterEditPage(charData);
            } else {
                location.hash = '#';
            }
        } else if (hash.startsWith('#grimoire-character/')) {
            const charName = decodeURIComponent(hash.substring(20));
            if(typeof loadCharacterDetailPage === 'function') loadCharacterDetailPage(charName);
        } else {
            const routeMap = {
                '#': 'gallery-view',
                '#grimoire': 'grimoire-view',
                '#new-character': 'character-creation-view',
                '#new-build': 'build-logger-view',
                '#manage-builds': 'build-management-view',
                '#user-management': 'user-management-view',
                '#settings': 'settings-view',
            };
            const viewId = routeMap[hash] || 'gallery-view';
            showView(viewId);

            if (viewId === 'gallery-view' && typeof applyFiltersAndSorting === 'function') applyFiltersAndSorting();
            if (viewId === 'grimoire-view' && typeof loadGrimoirePage === 'function') loadGrimoirePage();
            if (viewId === 'character-creation-view' && typeof resetCharacterForm === 'function') resetCharacterForm();
            if (viewId === 'build-logger-view' && typeof loadCharactersForBuildLogger === 'function') loadCharactersForBuildLogger();
            if (viewId === 'build-management-view' && typeof loadBuildManagement === 'function') loadBuildManagement();
            if (viewId === 'user-management-view' && typeof loadUserManagement === 'function') loadUserManagement();
            if (viewId === 'settings-view' && typeof loadSettingsPage === 'function') loadSettingsPage();
        }
    };

    // --- AUTHENTICATION FUNCTIONS ---
    const checkSession = async () => {
        try {
            const response = await fetch('php/api.php?action=check_session');
            const result = await response.json();
            if (result.status === 'success') {
                currentUser = { 
                    username: result.username, 
                    role: result.role, 
                    avatar: result.avatar, 
                    background: result.background,
                    card_opacity: (result.opacity === 'yes' ? 'on' : 'off'),
                    grimoire_view: result.grimoire_view || 'splash'
                };
                isAdmin = (result.role === 'admin');
            } else {
                currentUser = null;
                isAdmin = false;
            }
            if(typeof updateLoginUI === 'function') updateLoginUI();
        } catch (error) {
            console.error('Errore durante il controllo della sessione:', error);
            currentUser = null;
            isAdmin = false;
            if(typeof updateLoginUI === 'function') updateLoginUI();
        }
    };

    const loadUserManagement = async () => {
        if (!currentUser || currentUser.role !== 'admin') {
            showErrorAlert('Accesso negato. Solo gli amministratori possono gestire gli utenti.');
            location.hash = '#';
            return;
        }
        if (typeof loadUsers === 'function') {
            await loadUsers();
        } else {
            showErrorAlert('Funzionalità di gestione utenti non disponibile.');
        }
    };

    // --- EVENT LISTENERS ---
    if (navLogoutBtn) {
        navLogoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const response = await fetch('php/api.php?action=logout');
                const result = await response.json();
                if (result.status === 'success') {
                    showToast('Logout effettuato con successo.');
                    currentUser = null;
                    isAdmin = false;
                    dataLoaded = false;
                    window.location.href = 'login.html';
                } else {
                    showErrorAlert(result.message);
                }
            } catch (error) {
                showErrorAlert('Errore durante il logout.');
            }
        });
    }

    if (navUserManagementLink) {
        navUserManagementLink.addEventListener('click', (e) => {
            e.preventDefault();
            location.hash = '#user-management';
        });
    }
    
    const backToTopButton = document.getElementById('back-to-top');
    if (backToTopButton) {
        backToTopButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // --- INIZIALIZZAZIONE ---
    const init = async () => {
        try {
            const [charLibResponse, elementsResponse, settingsResponse] = await Promise.all([
                fetch('data/characters_list.json?v=' + new Date().getTime()),
                fetch('php/api.php?action=get_elements'),
                fetch('php/api.php?action=get_settings')
            ]);

            if (!charLibResponse.ok) throw new Error('Failed to load characters_list.json');
            characterLibrary = await charLibResponse.json();

            if (elementsResponse.ok) {
                elementsData = await elementsResponse.json();
            } else {
                console.error('Could not load elements data.');
            }

            if (settingsResponse.ok) {
                const settings = await settingsResponse.json();
                grimoireBackground = settings.grimoire_background || null;
            } else {
                console.error('Could not load settings data.');
            }

            if(typeof initCharacterLibrarySelect === 'function') initCharacterLibrarySelect();
        } catch (error) {
            console.error('Failed to load essential library data:', error);
            showErrorAlert('Impossibile caricare dati essenziali (personaggi/elementi/impostazioni). Alcune funzionalità potrebbero non essere disponibili.');
        }

        if(typeof initCharacterCreationForm === 'function') initCharacterCreationForm();
        if(typeof initGalleryControls === 'function') initGalleryControls();
        if(typeof initGrimoireControls === 'function') initGrimoireControls();
        window.addEventListener('hashchange', handleRouteChange);
        await handleRouteChange();
        if(typeof initTheme === 'function') initTheme();
        if(typeof initGallerySettings === 'function') initGallerySettings();
        if(typeof updateLoginUI === 'function') updateLoginUI();
        console.log('App initialization complete.');
        console.log('window.calculateBuildScore is type:', typeof window.calculateBuildScore);
    };

    document.querySelector('main').addEventListener('click', (e) => {
        const helpBtn = e.target.closest('.help-btn');
        if (helpBtn) {
            const helpText = helpBtn.dataset.helpText || 'Nessun aiuto disponibile per questa sezione.';
            Swal.fire({
                icon: 'info',
                title: 'Aiuto',
                html: helpText,
                confirmButtonText: 'Capito!'
            });
        }
    });

    init();
});
