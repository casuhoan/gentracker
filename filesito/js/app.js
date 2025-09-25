document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAZIONE CENTRALE ---
    const config = {
        elements: ["Pyro", "Geo", "Cryo", "Dendro", "Hydro", "Anemo", "Electro"],
        roles: ["Healer", "Support", "Main DPS", "Sub DPS", "Shielder"],
        stats: ["HP", "Atk", "Def", "Energy Recharge (%)", "Elemental Mastery", "Crit Rate (%)", "Crit Damage (%)"],
        signatureOptions: ["Sì", "Buona", "No"],
        talentOptions: ["Sì", "Vicino", "No"]
    };

    const roleColors = {
        'Main DPS': '#d32f2f', 'Sub DPS': '#f57c00', 'Support': '#1976d2', 'Healer': '#388e3c', 'Shielder': '#7b1fa2',
    };

    // --- STATO APPLICAZIONE ---
    let sourceCharacterData = [];
    let characterLibrary = [];
    let currentCharacterData = null;
    let dataLoaded = false;
    let currentUser = null;
    let isAdmin = false;
    let isNavigatingToEdit = false; // Flag to handle character edit navigation

    // --- ELEMENTI DOM ---
    const views = document.querySelectorAll('.view');
    const characterForm = document.getElementById('character-form');
    const buildForm = document.getElementById('build-form');
    const editBuildForm = document.getElementById('edit-build-form');
    const settingsForm = document.getElementById('settings-form');
    const charSelect = document.getElementById('char-select');
    const manageCharSelect = document.getElementById('manage-char-select');
    const buildListContainer = document.getElementById('build-list-container');
    const navLoginLink = document.getElementById('nav-login-link');
    const navUserMenu = document.getElementById('nav-user-menu');
    const currentUsernameSpan = document.getElementById('current-username');
    const navLogoutBtn = document.getElementById('nav-logout');
    const navUserManagementLink = document.getElementById('nav-user-management');
    const navUserAvatar = document.getElementById('nav-user-avatar');
    const themeToggle = document.getElementById('theme-toggle-checkbox');
    // Nuovi elementi
    const characterLibrarySelect = document.getElementById('character-library-select');
    const useDefaultImageBtn = document.getElementById('use-default-image-btn');
    const defaultImagePathInput = document.getElementById('default_image_path');
    const syncLibraryBtn = document.getElementById('v-pills-sync-tab');


    // --- FUNZIONI DI UTILITY ---
    const createSafeId = (str) => {
        if (typeof str !== 'string') return '';
        return str.toLowerCase().replace(/ /g, '-').replace(/[%()]/g, '').replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
    };

    const showToast = (title, icon = 'success') => {
        Swal.fire({ toast: true, position: 'top-end', icon, title, showConfirmButton: false, timer: 3000, timerProgressBar: true, didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); } });
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
        if (currentUser) {
            navLoginLink.classList.add('d-none');
            navUserMenu.classList.remove('d-none');
            currentUsernameSpan.textContent = currentUser.username;
            navUserAvatar.src = currentUser.avatar || 'uploads/default_avatar.png';
            navUserAvatar.style.display = 'inline-block';

            if (currentUser.role === 'admin') {
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

    function initTheme() {
        const currentTheme = localStorage.getItem('theme') || 'light';
        applyTheme(currentTheme);

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

    const loadUserManagement = async () => {
        if (!currentUser || currentUser.role !== 'admin') {
            showErrorAlert('Accesso negato. Solo gli amministratori possono gestire gli utenti.');
            location.hash = '#'; // Redirect to gallery
            return;
        }
        if (typeof loadUsers === 'function') {
            await loadUsers();
        } else {
            showErrorAlert('Funzionalità di gestione utenti non disponibile.');
        }
    };

    const getStatusColorClass = (type, value, rarity = '4-star') => {
        switch (type) {
            case 'constellation':
                if (rarity === '5-star') {
                    if (value >= 6) return 'rarity-5-c6'; if (value === 5) return 'rarity-5-c5'; if (value === 4) return 'rarity-5-c4'; if (value === 3) return 'rarity-5-c3'; if (value === 2) return 'rarity-5-c2'; if (value === 1) return 'rarity-5-c1'; return 'rarity-5-c0';
                } else { if (value >= 6) return 'text-success'; if (value >= 2) return 'text-warning'; return 'text-danger'; }
            case 'signature_weapon':
                if (value === 'Sì') return 'text-success'; if (value === 'Buona') return 'text-info'; return 'text-danger';
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

    // --- ROUTER E GESTIONE VISTE ---
    const showView = (viewId) => {
        views.forEach(view => view.classList.remove('active'));
        const activeView = document.getElementById(viewId);
        if (activeView) activeView.classList.add('active');
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
            if (charData) {
                loadDashboard(charData);
            } else {
                location.hash = '#';
            }
        } else {
            const routeMap = {
                '#': 'gallery-view',
                '#new-character': 'character-creation-view',
                '#new-build': 'build-logger-view',
                '#manage-builds': 'build-management-view',
                '#user-management': 'user-management-view',
                '#settings': 'settings-view',
                '#add-library-character': 'library-character-creation-view',
            };
            const viewId = routeMap[hash] || 'gallery-view';
            showView(viewId);

            if (viewId === 'gallery-view') applyFiltersAndSorting();
            if (viewId === 'character-creation-view') {
                if (isNavigatingToEdit) {
                    isNavigatingToEdit = false;
                } else {
                    resetCharacterForm();
                }
            }
            if (viewId === 'build-logger-view') loadCharactersForBuildLogger();
            if (viewId === 'build-management-view') loadBuildManagement();
            if (viewId === 'user-management-view') loadUserManagement();
            if (viewId === 'settings-view') loadSettingsPage();
        }
    };

    // --- AUTHENTICATION FUNCTIONS ---
    const checkSession = async () => {
        try {
            const response = await fetch('php/api.php?action=check_session');
            const result = await response.json();
            if (result.status === 'success') {
                currentUser = { username: result.username, role: result.role, avatar: result.avatar };
                isAdmin = (result.role === 'admin');
            } else {
                currentUser = null;
                isAdmin = false;
            }
            updateLoginUI();
        } catch (error) {
            console.error('Errore durante il controllo della sessione:', error);
            currentUser = null;
            isAdmin = false;
            updateLoginUI();
        }
    };

    // --- SEZIONE: GALLERIA ---
    const initGalleryControls = () => {
        const elementFiltersContainer = document.getElementById('element-filters');
        if (!elementFiltersContainer) return;
        elementFiltersContainer.innerHTML = '';
        config.elements.forEach(element => {
            const elId = `filter-${createSafeId(element)}`;
            elementFiltersContainer.innerHTML += `<div class="form-check"><input class="form-check-input" type="checkbox" value="${element}" id="${elId}"><label class="form-check-label" for="${elId}">${element}</label></div>`;
        });
        document.getElementById('name-filter').addEventListener('input', applyFiltersAndSorting);
        document.getElementById('sort-select').addEventListener('change', applyFiltersAndSorting);
        elementFiltersContainer.addEventListener('change', applyFiltersAndSorting);
    };

    const applyFiltersAndSorting = () => {
        let filteredCharacters = [...sourceCharacterData];
        const nameFilterInput = document.getElementById('name-filter');
        if (nameFilterInput) {
            const nameFilter = nameFilterInput.value.toLowerCase();
            if (nameFilter) {
                filteredCharacters = filteredCharacters.filter(char => char.profile.name.toLowerCase().includes(nameFilter));
            }
        }
        const selectedElements = Array.from(document.querySelectorAll('#element-filters input:checked')).map(cb => cb.value);
        if (selectedElements.length > 0) {
            filteredCharacters = filteredCharacters.filter(char => selectedElements.includes(char.profile.element));
        }
        filteredCharacters.forEach(char => {
            const { ideal_stats = {}, tracked_stats = [], latest_build_stats = {} } = char.profile;
            if (tracked_stats.length === 0 || Object.keys(ideal_stats).length === 0) { char.buildScore = 0; return; }
            let totalRatio = 0, scoredStatsCount = 0;
            tracked_stats.forEach(statName => {
                const ideal = parseFloat(ideal_stats[statName]), actual = parseFloat(latest_build_stats[statName]);
                if (!isNaN(ideal) && ideal > 0 && !isNaN(actual)) { totalRatio += Math.min(actual / ideal, 1.1); scoredStatsCount++; }
            });
            char.buildScore = (scoredStatsCount > 0) ? (totalRatio / scoredStatsCount) * 100 : 0;
        });
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            const sortValue = sortSelect.value;
            const sortFunctions = {
                'nameAsc': (a, b) => a.profile.name.localeCompare(b.profile.name),
                'nameDesc': (a, b) => b.profile.name.localeCompare(a.profile.name),
                'constAsc': (a, b) => (a.profile.latest_constellation || 0) - (b.profile.latest_constellation || 0) || a.profile.name.localeCompare(b.profile.name),
                'constDesc': (a, b) => (b.profile.latest_constellation || 0) - (a.profile.latest_constellation || 0) || a.profile.name.localeCompare(b.profile.name),
                'rarityAsc': (a, b) => (a.profile.rarity === '4-star' ? 4 : 5) - (b.profile.rarity === '4-star' ? 4 : 5) || a.profile.name.localeCompare(b.profile.name),
                'rarityDesc': (a, b) => (b.profile.rarity === '4-star' ? 4 : 5) - (a.profile.rarity === '4-star' ? 4 : 5) || a.profile.name.localeCompare(b.profile.name),
                'buildAsc': (a, b) => a.buildScore - b.buildScore || a.profile.name.localeCompare(b.profile.name),
                'buildDesc': (a, b) => b.buildScore - a.buildScore || a.profile.name.localeCompare(b.profile.name),
            };
            if (sortFunctions[sortValue]) filteredCharacters.sort(sortFunctions[sortValue]);
        }
        renderGallery(filteredCharacters);
    };

    const renderGallery = (characters) => {
        const galleryGrid = document.getElementById('gallery-grid');
        if (!galleryGrid) return;
        galleryGrid.innerHTML = '';
        if (characters.length === 0) {
            galleryGrid.innerHTML = `
                <div class="col-12 d-flex flex-column justify-content-center align-items-center" style="min-height: 300px;">
                    <p class="text-center w-100">Nessun personaggio trovato.</p>
                </div>
            `;
            return;
        }
        characters.forEach(charData => {
            const char = charData.profile;
            let formattedDate = 'N/D';
            if (char.acquisition_date && char.acquisition_date !== '0001-01-01') {
                const date = new Date(char.acquisition_date);
                formattedDate = date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
            }
            let rolesHtml = '';
            if (char.role && char.role.length) {
                rolesHtml = '<div class="card-roles">';
                char.role.forEach(role => { rolesHtml += `<span class="role-tag" style="background-color: ${roleColors[role] || '#6c757d'}">${role}</span>`; });
                rolesHtml += '</div>';
            }
            let hoverStatsHtml = `<div class="card-hover-stats"><h5>Ultima Build (Score: ${charData.buildScore.toFixed(1)}%)</h5>`;
            if (char.latest_build_stats && Object.keys(char.latest_build_stats).length > 0) {
                hoverStatsHtml += '<ul class="list-unstyled text-start">';
                for (const [stat, value] of Object.entries(char.latest_build_stats)) { hoverStatsHtml += `<li><strong>${stat}:</strong> ${value}</li>`; }
                hoverStatsHtml += '</ul>';
            } else { hoverStatsHtml += '<p class="text-center small">Nessuna build registrata.</p>'; }
            hoverStatsHtml += '</div>';
            const constellationColorClass = getStatusColorClass('constellation', char.latest_constellation, char.rarity);
            galleryGrid.innerHTML += `
                <div class="col">
                    <div class="card h-100 text-center gallery-card">
                        ${hoverStatsHtml}
                        <div class="card-constellation ${constellationColorClass}">C${char.latest_constellation || 0}</div>
                        <img src="${char.splashart || 'uploads/default_avatar.png'}" class="card-img-top" alt="${char.name}" style="height: 250px; object-fit: contain;">
                        <div class="card-body"><h5 class="card-title">${char.name}</h5>${rolesHtml}</div>
                        <div class="card-acquisition-date">${formattedDate}</div>
                        <a href="#character/${encodeURIComponent(char.name)}" class="stretched-link"></a>
                    </div>
                </div>`;
        });
    };

    // --- SEZIONE: DASHBOARD ---
    const loadDashboard = (charData) => {
        currentCharacterData = charData;
        document.getElementById('dashboard-title').textContent = 
`Confronto Build: ${charData.profile.name}`;
        const buildOptions = charData.builds.map((build, index) => ({ name: `Build del ${build.date} (Build #${charData.builds.length - index})`, value: index }));
        populateSelect('compare-select-1', buildOptions);
        populateSelect('compare-select-2', buildOptions);
        if (buildOptions.length > 0) {
            document.getElementById('compare-select-2').value = 0;
            document.getElementById('compare-select-1').value = buildOptions.length > 1 ? 1 : 0;
        }
        displayBuild(2, 0);
        displayBuild(1, buildOptions.length > 1 ? 1 : -1);
        displayIdealStats();
        showView('dashboard-view');
    };

    const displayBuild = (displayId, buildIndex) => {
        const container = document.getElementById(`build-display-${displayId}`);
        if (buildIndex < 0 || !currentCharacterData.builds[buildIndex]) { container.innerHTML = '<p class="text-muted">Nessuna build selezionata.</p>'; return; }
        const build = currentCharacterData.builds[buildIndex];
        const rarity = currentCharacterData.profile.rarity;
        let html = '<ul class="list-group list-group-flush">';
        for (const stat of currentCharacterData.profile.tracked_stats) {
            const value = build.stats[stat] || 'N/D';
            html += `<li class="list-group-item d-flex justify-content-between align-items-center">${stat} <strong class="${getStatColorForIdeal(stat, value)}">${value}</strong></li>`;
        }
        html += '</ul><hr class="my-3">';
        html += '<ul class="list-group list-group-flush">';
        html += `<li class="list-group-item d-flex justify-content-between align-items-center">Costellazione <strong class="${getStatusColorClass('constellation', build.constellation, rarity)}">${build.constellation}</strong></li>`;
        html += `<li class="list-group-item d-flex justify-content-between align-items-center">Signature <strong class="${getStatusColorClass('signature_weapon', build.signature_weapon)}">${build.signature_weapon}</strong></li>`;
        html += `<li class="list-group-item d-flex justify-content-between align-items-center">Talenti <strong class="${getStatusColorClass('talents', build.talents)}">${build.talents}</strong></li>`;
        html += '</ul>';
        container.innerHTML = html;
    };

    const displayIdealStats = () => {
        const container = document.getElementById('ideal-stats-display');
        const idealStats = currentCharacterData.profile.ideal_stats;
        if (Object.keys(idealStats).length === 0) { container.innerHTML = '<p class="text-muted">Nessuna statistica ideale impostata.</p>'; return; }
        let html = '<ul class="list-group list-group-flush">';
        for (const [stat, value] of Object.entries(idealStats)) { html += `<li class="list-group-item d-flex justify-content-between align-items-center">${stat} <strong>${value}</strong></li>`; }
        html += '</ul>';
        container.innerHTML = html;
    };

    // --- ALTRE SEZIONI (Creazione, Build, Gestione) ---
    const populateCharacterFormForEdit = (charData) => {
        if (!characterForm) return;
        const profile = charData.profile;
        characterForm.reset();
        document.getElementById('character-form-title').textContent = `Modifica ${profile.name}`;
        document.getElementById('original_name').value = profile.name;
        document.getElementById('name').value = profile.name;

        const previewContainer = document.getElementById('character-preview-container');
        const previewImage = document.getElementById('character-preview-image');
        if (profile.splashart && profile.splashart !== '') {
            previewImage.src = profile.splashart;
            previewContainer.classList.remove('empty');
        } else {
            previewImage.src = '';
            previewContainer.classList.add('empty');
        }
        
        if (characterLibrarySelect) {
            characterLibrarySelect.disabled = true;
        }

        document.getElementById('element').value = profile.element;
        document.getElementById('acquisition_date').value = profile.acquisition_date;
        document.getElementById('constellation').value = profile.constellation;
        document.getElementById('signature_weapon').value = profile.signature_weapon;
        document.getElementById('talents').value = profile.talents;
        const rarityRadio = document.querySelector(`input[name="rarity"][value="${profile.rarity || '5-star'}"]`);
        if (rarityRadio) rarityRadio.checked = true;
        document.querySelectorAll('#role-checkboxes input[type=checkbox]').forEach(cb => cb.checked = false);
        profile.role.forEach(roleValue => {
            const checkbox = document.querySelector(`#role-checkboxes input[value="${roleValue}"]`);
            if (checkbox) checkbox.checked = true;
        });
        document.querySelectorAll('#stats-checkboxes input[type=checkbox]').forEach(cb => cb.checked = false);
        profile.tracked_stats.forEach(statValue => {
            const checkbox = document.querySelector(`#stats-checkboxes input[value="${statValue}"]`);
            if (checkbox) checkbox.checked = true;
        });
        document.getElementById('ideal-stats-inputs').innerHTML = ''; // Clear and repopulate
        profile.tracked_stats.forEach(stat => {
            const statId = createSafeId(stat);
            const idealValue = profile.ideal_stats[stat] || '';
            document.getElementById('ideal-stats-inputs').innerHTML += `
                <div class="col-md-4 mb-3">
                    <label for="ideal-${statId}" class="form-label">Ideal ${stat}</label>
                    <input type="number" step="0.1" class="form-control" id="ideal-${statId}" name="ideal_stats[${stat}]" value="${idealValue}">
                </div>`;
        });
        characterForm.querySelector('button[type="submit"]').textContent = 'Salva Modifiche';
        document.getElementById('delete-character-btn').style.display = 'inline-block';
    };

    const resetCharacterForm = () => {
        if (!characterForm) return;
        characterForm.reset();

        const previewContainer = document.getElementById('character-preview-container');
        const previewImage = document.getElementById('character-preview-image');
        previewImage.src = '';
        if (previewContainer) previewContainer.classList.add('empty');

        document.getElementById('original_name').value = '';
        document.getElementById('character-form-title').textContent = 'Crea Personaggio';
        document.getElementById('ideal-stats-inputs').innerHTML = '';
        document.querySelectorAll('#stats-checkboxes input[type=checkbox]').forEach(cb => cb.checked = false);
        characterForm.querySelector('button[type="submit"]').textContent = 'Salva Personaggio';
        document.getElementById('delete-character-btn').style.display = 'none';
        if (characterLibrarySelect) {
            characterLibrarySelect.disabled = false;
            characterLibrarySelect.selectedIndex = 0;
        }
        if (defaultImagePathInput) {
            defaultImagePathInput.value = '';
        }
    };

    const initCharacterCreationForm = () => {
        const statsCheckboxesContainer = document.getElementById('stats-checkboxes');
        if (!statsCheckboxesContainer) return;
        statsCheckboxesContainer.innerHTML = '';
        config.stats.forEach(stat => {
            const statId = createSafeId(stat);
            statsCheckboxesContainer.innerHTML += `<div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="track-${statId}" name="tracked_stats[]" value="${stat}"><label class="form-check-label" for="track-${statId}">${stat}</label></div>`;
        });
        const roleCheckboxesContainer = document.getElementById('role-checkboxes');
        if (!roleCheckboxesContainer) return;
        roleCheckboxesContainer.innerHTML = '';
        config.roles.forEach(role => {
            const roleId = `role-${createSafeId(role)}`;
            roleCheckboxesContainer.innerHTML += `<div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="${roleId}" name="role[]" value="${role}"><label class="form-check-label" for="${roleId}">${role}</label></div>`;
        });
        populateSelect('element', config.elements);
        populateSelect('signature_weapon', config.signatureOptions);
        populateSelect('talents', config.talentOptions);
    };

    const initCharacterLibrarySelect = () => {
        if (!characterLibrarySelect || characterLibrary.length === 0) return;
        const options = characterLibrary.map(char => ({ name: char.nome, value: char.nome }));
        populateSelect('character-library-select', options, 'Scegli un personaggio...');
    };

    const loadCharactersForBuildLogger = () => {
        const charOptions = sourceCharacterData.map(c => ({ name: c.profile.name, value: c.profile.name }));
        populateSelect('char-select', charOptions, 'Scegli un personaggio...');
        populateSelect('build_signature_weapon', config.signatureOptions);
        populateSelect('build_talents', config.talentOptions);
        document.getElementById('build-stats-inputs').innerHTML = '';
    };

    const loadBuildManagement = () => {
        const charOptions = sourceCharacterData.map(c => ({ name: c.profile.name, value: c.profile.name }));
        populateSelect('manage-char-select', charOptions, 'Scegli un personaggio...');
        buildListContainer.innerHTML = '';
    };

    const loadSettingsPage = () => {
        if (!currentUser || !settingsForm) return;
        document.getElementById('settings-original-username').value = currentUser.username;
        document.getElementById('settings-username').value = currentUser.username;
        document.getElementById('settings-avatar-preview').src = currentUser.avatar || 'uploads/default_avatar.png';
        document.getElementById('settings-password').value = '';
        document.getElementById('settings-password-confirm').value = '';
        
        const currentTheme = localStorage.getItem('theme') || 'light';
        const themeRadio = document.getElementById(`theme-${currentTheme}`);
        if(themeRadio) themeRadio.checked = true;

        if (isAdmin) {
            if(syncLibraryBtn) syncLibraryBtn.classList.remove('d-none');
            const addLibCharBtn = document.getElementById('v-pills-add-lib-char-tab');
            if(addLibCharBtn) addLibCharBtn.classList.remove('d-none');
        }
    };

    // --- EVENT LISTENERS ---
    if (document.getElementById('back-to-gallery-btn')) {
        document.getElementById('back-to-gallery-btn').addEventListener('click', (e) => { e.preventDefault(); location.hash = '#'; });
    }
    
    if (document.getElementById('edit-character-btn')) {
        document.getElementById('edit-character-btn').addEventListener('click', (e) => {
            e.preventDefault();
            if (currentCharacterData) {
                isNavigatingToEdit = true; // Set flag before changing hash
                populateCharacterFormForEdit(currentCharacterData);
                location.hash = '#new-character';
            }
        });
    }

    if (document.getElementById('delete-character-btn')) {
        document.getElementById('delete-character-btn').addEventListener('click', (e) => {
            e.preventDefault();
            const characterName = document.getElementById('original_name').value;
            if (characterName) {
                handleDeleteCharacter(characterName);
            }
        });
    }

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

    if (charSelect) {
        charSelect.addEventListener('change', () => {
            const charName = charSelect.value;
            const buildStatsInputs = document.getElementById('build-stats-inputs');
            if (!charName) { buildStatsInputs.innerHTML = ''; return; }
            const charData = sourceCharacterData.find(c => c.profile.name === charName);
            if (!charData) return;
            buildStatsInputs.innerHTML = '';
            charData.profile.tracked_stats.forEach(stat => {
                const statId = createSafeId(stat);
                buildStatsInputs.innerHTML += `<div class="col-md-4 mb-3"><label for="build-${statId}" class="form-label">${stat}</label><input type="number" step="0.1" class="form-control" id="build-${statId}" name="stats[${stat}]"></div>`;
            });
        });
    }

    if (manageCharSelect) {
        manageCharSelect.addEventListener('change', () => {
            const charName = manageCharSelect.value;
            if (!charName) { buildListContainer.innerHTML = ''; return; }
            currentCharacterData = sourceCharacterData.find(c => c.profile.name === charName);
            renderBuildList(currentCharacterData);
        });
    }

    if (characterLibrarySelect) {
        characterLibrarySelect.addEventListener('change', () => {
            const selectedCharName = characterLibrarySelect.value;
            const nameInput = document.getElementById('name');
            const previewContainer = document.getElementById('character-preview-container');
            const previewImage = document.getElementById('character-preview-image');

            if (selectedCharName) {
                const characterFromLibrary = characterLibrary.find(c => c.nome === selectedCharName);
                if (characterFromLibrary) {
                    const imagePath = `data/${characterFromLibrary.immagine}`;
                    if (nameInput) nameInput.value = selectedCharName;
                    if (previewImage) previewImage.src = imagePath;
                    if (previewContainer) previewContainer.classList.remove('empty');
                    
                    if (defaultImagePathInput) defaultImagePathInput.value = imagePath;
                }
            } else {
                if (nameInput) nameInput.value = '';
                if (previewImage) previewImage.src = '';
                if (previewContainer) previewContainer.classList.add('empty');
                if (defaultImagePathInput) defaultImagePathInput.value = '';
            }
        });
    }

    if (useDefaultImageBtn) {
        useDefaultImageBtn.addEventListener('click', () => {
            const selectedCharName = characterLibrarySelect.value;
            if (!selectedCharName) {
                showErrorAlert('Seleziona prima un personaggio dalla libreria.');
                return;
            }
            const characterFromLibrary = characterLibrary.find(c => c.nome === selectedCharName);
            if (characterFromLibrary) {
                const imagePath = `data/${characterFromLibrary.immagine}`;
                if (defaultImagePathInput) defaultImagePathInput.value = imagePath;
                
                const previewImage = document.getElementById('character-preview-image');
                const previewContainer = document.getElementById('character-preview-container');
                if (previewImage) previewImage.src = imagePath;
                if (previewContainer) previewContainer.classList.remove('empty');

                showToast(`Immagine di default per ${selectedCharName} selezionata.`);
                
                const splashartInput = document.getElementById('splashart');
                if(splashartInput) splashartInput.value = '';
            }
        });
    }

    const splashartInput = document.getElementById('splashart');
    if (splashartInput) {
        splashartInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const previewImage = document.getElementById('character-preview-image');
                    const previewContainer = document.getElementById('character-preview-container');
                    if (previewImage) previewImage.src = event.target.result;
                    if (previewContainer) previewContainer.classList.remove('empty');
                    
                    if (defaultImagePathInput) defaultImagePathInput.value = '';
                }
                reader.readAsDataURL(file);
            }
        });
    }
    
    if (syncLibraryBtn) {
        syncLibraryBtn.addEventListener('click', (e) => {
            e.preventDefault();
            Swal.fire({
                title: 'Sincronizzare la libreria?',
                text: "Questa azione copierà i file dalla cartella 'librarydata' alla cartella 'data' sul server. Sei sicuro?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sì, sincronizza!',
                cancelButtonText: 'Annulla'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        const formData = new FormData();
                        formData.append('action', 'sync_library');
                        const response = await fetch('php/api.php', { method: 'POST', body: formData });
                        const res = await response.json();
                        if (res.status === 'success') {
                            showToast('Sincronizzazione completata con successo.');
                        } else {
                            showErrorAlert(res.message || 'Errore durante la sincronizzazione.');
                        }
                    } catch (error) {
                        showErrorAlert('Errore di comunicazione con il server.');
                    }
                }
            });
        });
    }

    const renderBuildList = (charData) => {
        if (!buildListContainer) return;
        buildListContainer.innerHTML = '';
        if (!charData || !charData.builds || charData.builds.length === 0) { 
            buildListContainer.innerHTML = '<p class="text-muted">Nessuna build registrata.</p>'; 
            return; 
        }
        const list = document.createElement('ul');
        list.className = 'list-group';
        charData.builds.forEach((build, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
            listItem.innerHTML = `<span>Build del <strong>${build.date}</strong></span><div><button class="btn btn-sm btn-primary btn-edit-build" data-build-index="${index}">Modifica</button> <button class="btn btn-sm btn-danger btn-delete-build" data-build-index="${index}">Cancella</button></div>`;
            list.appendChild(listItem);
        });
        buildListContainer.appendChild(list);
    };

    const libraryCharacterForm = document.getElementById('library-character-form');
    if (libraryCharacterForm) {
        libraryCharacterForm.onsubmit = async (e) => {
            e.preventDefault();
            const submitButton = libraryCharacterForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Salvataggio in corso...';

            try {
                const formData = new FormData(libraryCharacterForm);
                formData.append('action', 'add_character_to_library');

                const response = await fetch('php/api.php', { method: 'POST', body: formData });
                const result = await response.json();

                if (result.status === 'success') {
                    showToast(result.message);
                    libraryCharacterForm.reset();
                    location.hash = '#settings';
                } else {
                    showErrorAlert(result.message);
                }
            } catch (error) {
                showErrorAlert('Errore di comunicazione con il server.');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Aggiungi alla Libreria';
            }
        };
    }

    if (characterForm) {
        characterForm.onsubmit = async (e) => {
            e.preventDefault();

            const submitButton = characterForm.querySelector('button[type="submit"]');
            const originalName = document.getElementById('original_name').value;
            const isEditing = originalName !== '';

            // Logica soprannome obbligatorio
            if (!isEditing) {
                const baseName = characterLibrarySelect.value;
                const customName = document.getElementById('name').value;
                const characterExists = sourceCharacterData.some(char => char.profile.name === baseName);

                if (characterExists && baseName === customName) {
                    showErrorAlert('Esiste già un personaggio con questo nome. Fornisci un soprannome unico nel campo "Nome Personalizzato".');
                    return; // Interrompe il salvataggio
                }
            }

            submitButton.disabled = true;
            submitButton.textContent = 'Salvataggio in corso...';

            try {
                const formData = new FormData(characterForm);
                formData.append('action', isEditing ? 'update_character' : 'save_character');
                const response = await fetch('php/api.php', { method: 'POST', body: formData });
                if (!response.ok) throw new Error(`Errore del server: ${response.statusText}`);
                const result = await response.json();
                if (result.status === 'success') {
                    showToast(result.message);
                    dataLoaded = false;
                    const newName = formData.get('name');
                    location.hash = isEditing ? `#character/${encodeURIComponent(newName)}` : '#';
                } else { 
                    showErrorAlert(result.message); 
                }
            } catch (error) { 
                showErrorAlert('Impossibile comunicare con il server.');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = isEditing ? 'Salva Modifiche' : 'Salva Personaggio';
            }
        };
    }

    if (settingsForm) {
        settingsForm.onsubmit = async (e) => {
            e.preventDefault();

            const password = document.getElementById('settings-password').value;
            const passwordConfirm = document.getElementById('settings-password-confirm').value;

            if (password !== passwordConfirm) {
                showErrorAlert('Le password non coincidono.');
                return;
            }

            const submitButton = settingsForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Salvataggio...';
            try {
                const formData = new FormData(settingsForm);
                formData.append('action', 'update_user');

                const response = await fetch('php/api.php', { method: 'POST', body: formData });
                const result = await response.json();

                if (result.status === 'success') {
                    showToast('Impostazioni aggiornate con successo!');
                    dataLoaded = false;
                    const newUsername = formData.get('username');
                    if (currentUser.username !== newUsername) {
                        await checkSession(); // Re-check session to get new username
                    } else {
                        currentUser.avatar = result.new_avatar_path || currentUser.avatar;
                    }
                    updateLoginUI();
                    location.hash = '#';
                } else {
                    showErrorAlert(result.message);
                }
            } catch (error) {
                showErrorAlert('Impossibile comunicare con il server.');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Salva Impostazioni';
            }
        };
    }

    const settingsAvatarInput = document.getElementById('settings-avatar-input');
    if (settingsAvatarInput) {
        settingsAvatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    document.getElementById('settings-avatar-preview').src = event.target.result;
                }
                reader.readAsDataURL(file);
            }
        });
    }

    if (buildForm) {
        buildForm.onsubmit = async (e) => {
            e.preventDefault();
            const submitButton = buildForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Salvataggio...';
            try {
                const formData = new FormData(buildForm);
                formData.append('action', 'save_build');
                const response = await fetch('php/api.php', { method: 'POST', body: formData });
                if (!response.ok) throw new Error(`Errore del server: ${response.statusText}`);
                const result = await response.json();
                if (result.status === 'success') {
                    showToast(result.message);
                    dataLoaded = false;
                    location.hash = '#';
                } else {
                    showErrorAlert(result.message);
                }
            } catch (error) {
                showErrorAlert('Impossibile comunicare con il server.');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Salva Build';
            }
        };
    }

    if (buildListContainer) {
        buildListContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-edit-build')) {
                const buildIndex = e.target.dataset.buildIndex;
                populateBuildFormForEdit(buildIndex);
            }
            if (e.target.classList.contains('btn-delete-build')) {
                const buildIndex = e.target.dataset.buildIndex;
                handleDeleteBuild(buildIndex);
            }
        });
    }

    const populateBuildFormForEdit = (buildIndex) => {
        if (!currentCharacterData || !currentCharacterData.builds) return;
        const build = currentCharacterData.builds[buildIndex];
        if (!build) return;

        document.getElementById('edit-build-index').value = buildIndex;
        document.getElementById('edit-character-name').value = currentCharacterData.profile.name;
        document.getElementById('edit-build-date').value = build.date;

        populateSelect('edit-build-signature_weapon', config.signatureOptions);
        populateSelect('edit-build-talents', config.talentOptions);

        document.getElementById('edit-build-constellation').value = build.constellation;
        document.getElementById('edit-build-signature_weapon').value = build.signature_weapon;
        document.getElementById('edit-build-talents').value = build.talents;

        const statsContainer = document.getElementById('edit-build-stats-inputs');
        statsContainer.innerHTML = '';
        currentCharacterData.profile.tracked_stats.forEach(stat => {
            const statId = createSafeId(stat);
            const value = build.stats[stat] || '';
            statsContainer.innerHTML += `
                <div class="col-md-4 mb-3">
                    <label for="edit-build-${statId}" class="form-label">${stat}</label>
                    <input type="number" step="0.1" class="form-control" id="edit-build-${statId}" name="stats[${stat}]" value="${value}">
                </div>`;
        });

        const modal = new bootstrap.Modal(document.getElementById('edit-build-modal'));
        modal.show();
    };

    const handleDeleteBuild = (buildIndex) => {
        if (!currentCharacterData || !currentCharacterData.builds) return;
        const build = currentCharacterData.builds[buildIndex];
        if (!build) return;

        Swal.fire({
            title: 'Sei sicuro?',
            text: `Vuoi davvero cancellare la build del ${build.date}? L\'azione è irreversibile.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sì, cancella!',
            cancelButtonText: 'Annulla'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const formData = new FormData();
                    formData.append('action', 'delete_build');
                    formData.append('character_name', currentCharacterData.profile.name);
                    formData.append('build_index', buildIndex);

                    const response = await fetch('php/api.php', { method: 'POST', body: formData });
                    const res = await response.json();

                    if (res.status === 'success') {
                        showToast('Build cancellata con successo.');
                        dataLoaded = false;
                        const charName = currentCharacterData.profile.name;
                        await fetch('php/api.php?action=get_all_characters').then(r => r.json()).then(d => {
                            sourceCharacterData = d;
                            currentCharacterData = sourceCharacterData.find(c => c.profile.name === charName);
                            renderBuildList(currentCharacterData);
                        });
                    } else {
                        showErrorAlert(res.message);
                    }
                } catch (error) {
                    showErrorAlert('Errore di comunicazione con il server.');
                }
            }
        });
    };

    const handleDeleteCharacter = (characterName) => {
        Swal.fire({
            title: 'Sei sicuro?',
            text: `Vuoi davvero cancellare ${characterName}? L\'azione è irreversibile e cancellerà anche tutte le build associate.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sì, cancella!',
            cancelButtonText: 'Annulla'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const formData = new FormData();
                    formData.append('action', 'delete_character');
                    formData.append('character_name', characterName);

                    const response = await fetch('php/api.php', { method: 'POST', body: formData });
                    const res = await response.json();

                    if (res.status === 'success') {
                        showToast('Personaggio cancellato con successo.');
                        dataLoaded = false;
                        location.hash = '#';
                    } else {
                        showErrorAlert(res.message);
                    }
                } catch (error) {
                    showErrorAlert('Errore di comunicazione con il server.');
                }
            }
        });
    };

    if (editBuildForm) {
        editBuildForm.onsubmit = async (e) => {
            e.preventDefault();
            const submitButton = document.querySelector('button[form="edit-build-form"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Salvataggio...';

            try {
                const formData = new FormData(editBuildForm);
                formData.append('action', 'update_build');

                const response = await fetch('php/api.php', { method: 'POST', body: formData });
                const result = await response.json();

                if (result.status === 'success') {
                    showToast('Build aggiornata con successo!');
                    const modal = bootstrap.Modal.getInstance(document.getElementById('edit-build-modal'));
                    modal.hide();
                    dataLoaded = false;
                    const charName = formData.get('character_name');
                    await fetch('php/api.php?action=get_all_characters').then(r => r.json()).then(d => {
                        sourceCharacterData = d;
                        currentCharacterData = sourceCharacterData.find(c => c.profile.name === charName);
                        renderBuildList(currentCharacterData);
                    });
                } else {
                    showErrorAlert(result.message);
                }
            } catch (error) {
                showErrorAlert('Impossibile comunicare con il server.');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Salva Modifiche';
            }
        };
    }

    // --- INIZIALIZZAZIONE ---
    const init = async () => {
        try {
            const response = await fetch('data/characters_list.json');
            if (!response.ok) throw new Error('Network response was not ok');
            characterLibrary = await response.json();
            initCharacterLibrarySelect();
        } catch (error) {
            console.error('Impossibile caricare la libreria dei personaggi:', error);
            showErrorAlert('Impossibile caricare la libreria dei personaggi. Alcune funzionalità potrebbero non essere disponibili.');
        }

        initCharacterCreationForm();
        initGalleryControls();
        initTheme();
        window.addEventListener('hashchange', handleRouteChange);
        await handleRouteChange();
        updateLoginUI();

        // Funzione per aggiustare il quadrato di anteprima
        const adjustPreviewSquare = () => {
            const leftCol = document.getElementById('character-form-left-col');
            const previewContainer = document.getElementById('character-preview-container');
            if (leftCol && previewContainer) {
                const height = leftCol.offsetHeight;
                previewContainer.style.height = `${height}px`;
                previewContainer.style.width = `${height}px`;
            }
        };

        // Aggiusta al caricamento (con un breve ritardo per permettere il rendering) e al resize
        setTimeout(adjustPreviewSquare, 50);
        window.addEventListener('resize', adjustPreviewSquare);
    };

    const statsCheckboxesContainer = document.getElementById('stats-checkboxes');
    if (statsCheckboxesContainer) {
        statsCheckboxesContainer.addEventListener('change', (e) => {
            if (e.target.type !== 'checkbox') return;

            const stat = e.target.value;
            const statId = createSafeId(stat);
            const idealStatsContainer = document.getElementById('ideal-stats-inputs');
            const existingInputContainer = document.getElementById(`ideal-input-container-${statId}`);

            if (e.target.checked && !existingInputContainer) {
                // Aggiunge il campo di input
                const inputDiv = document.createElement('div');
                inputDiv.className = 'col-md-4 mb-3';
                inputDiv.id = `ideal-input-container-${statId}`; // ID per una facile rimozione
                inputDiv.innerHTML = `
                    <label for="ideal-${statId}" class="form-label">Ideal ${stat}</label>
                    <input type="number" step="0.1" class="form-control" id="ideal-${statId}" name="ideal_stats[${stat}]" placeholder="${stat}">
                `;
                idealStatsContainer.appendChild(inputDiv);
            } else if (!e.target.checked && existingInputContainer) {
                // Rimuove il campo di input
                existingInputContainer.remove();
            }
        });
    }

    init();
});
