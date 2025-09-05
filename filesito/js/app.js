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
    let currentCharacterData = null;
    let dataLoaded = false;
    let currentUser = null;
    let isAdmin = false;

    // --- ELEMENTI DOM ---
    const views = document.querySelectorAll('.view');
    const characterForm = document.getElementById('character-form');
    const buildForm = document.getElementById('build-form');
    const editBuildForm = document.getElementById('edit-build-form');
    const charSelect = document.getElementById('char-select');
    const manageCharSelect = document.getElementById('manage-char-select');
    const buildListContainer = document.getElementById('build-list-container');
    const navLoginLink = document.getElementById('nav-login-link');
    const navUserMenu = document.getElementById('nav-user-menu');
    const currentUsernameSpan = document.getElementById('current-username');
    const navLogoutBtn = document.getElementById('nav-logout');
    const navUserManagementLink = document.getElementById('nav-user-management');

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

    // --- USER INTERFACE FUNCTIONS ---
    const updateLoginUI = () => {
        if (currentUser) {
            navLoginLink.classList.add('d-none');
            navUserMenu.classList.remove('d-none');
            currentUsernameSpan.textContent = currentUser.username;
            if (currentUser.role === 'admin') {
                navUserManagementLink.classList.remove('d-none');
            } else {
                navUserManagementLink.classList.add('d-none');
            }
        } else {
            navLoginLink.classList.remove('d-none');
            navUserMenu.classList.add('d-none');
            navUserManagementLink.classList.add('d-none');
        }
    };

    const loadUserManagement = async () => {
        if (!currentUser || currentUser.role !== 'admin') {
            showErrorAlert('Accesso negato. Solo gli amministratori possono gestire gli utenti.');
            location.hash = '#'; // Redirect to gallery
            return;
        }
        // Assuming user-management.js is loaded and provides loadUsers function
        if (typeof loadUsers === 'function') {
            await loadUsers();
        } else {
            showErrorAlert('Funzionalità di gestione utenti non disponibile. Assicurati che user-management.js sia caricato.');
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
        const hash = window.location.hash || '#';

        // Check session on every route change
        await checkSession();

        if (!dataLoaded && currentUser) { // Modified: only load data if logged in
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
            };
            const viewId = routeMap[hash] || 'gallery-view';
            showView(viewId);

            if (viewId === 'gallery-view') applyFiltersAndSorting();
            if (viewId === 'character-creation-view') resetCharacterForm();
            if (viewId === 'build-logger-view') loadCharactersForBuildLogger();
            if (viewId === 'build-management-view') loadBuildManagement();
            if (viewId === 'user-management-view') loadUserManagement();
        }
    };

    // --- AUTHENTICATION FUNCTIONS ---
    const checkSession = async () => {
        try {
            const response = await fetch('php/api.php?action=check_session');
            const result = await response.json();
            if (result.status === 'success') {
                currentUser = { username: result.username, role: result.role };
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
        const nameFilter = document.getElementById('name-filter').value.toLowerCase();
        if (nameFilter) {
            filteredCharacters = filteredCharacters.filter(char => char.profile.name.toLowerCase().includes(nameFilter));
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
        const sortValue = document.getElementById('sort-select').value;
        const sortFunctions = {
            'nameAsc': (a, b) => a.profile.name.localeCompare(b.profile.name),
            'nameDesc': (a, b) => b.profile.name.localeCompare(a.profile.name),
            'constAsc': (a, b) => a.profile.latest_constellation - b.profile.latest_constellation || a.profile.name.localeCompare(b.profile.name),
            'constDesc': (a, b) => b.profile.latest_constellation - a.profile.latest_constellation || a.profile.name.localeCompare(b.profile.name),
            'rarityAsc': (a, b) => (a.profile.rarity === '4-star' ? 4 : 5) - (b.profile.rarity === '4-star' ? 4 : 5) || a.profile.name.localeCompare(b.profile.name),
            'rarityDesc': (a, b) => (b.profile.rarity === '4-star' ? 4 : 5) - (a.profile.rarity === '4-star' ? 4 : 5) || a.profile.name.localeCompare(b.profile.name),
            'buildAsc': (a, b) => a.buildScore - b.buildScore || a.profile.name.localeCompare(b.profile.name),
            'buildDesc': (a, b) => b.buildScore - a.buildScore || a.profile.name.localeCompare(b.profile.name),
        };
        if (sortFunctions[sortValue]) filteredCharacters.sort(sortFunctions[sortValue]);
        renderGallery(filteredCharacters);
    };

    const renderGallery = (characters) => {
        const galleryGrid = document.getElementById('gallery-grid');
        galleryGrid.innerHTML = '';
        if (characters.length === 0) {
            galleryGrid.innerHTML = `
                <div class="col-12 d-flex flex-column justify-content-center align-items-center" style="min-height: 300px;">
                    <p class="text-center w-100">Nessun personaggio corrisponde ai criteri di ricerca.</p>
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
                        <div class="card-constellation ${constellationColorClass}">C${char.latest_constellation}</div>
                        <img src="${char.splashart || 'https://via.placeholder.com/150x200'}" class="card-img-top" alt="${char.name}" style="height: 250px; object-fit: contain;">
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
        document.getElementById('dashboard-title').textContent = `Confronto Build: ${charData.profile.name}`;
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
        const profile = charData.profile;
        characterForm.reset();
        document.getElementById('character-form-title').textContent = `Modifica ${profile.name}`;
        document.getElementById('original_name').value = profile.name;
        document.getElementById('name').value = profile.name;
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
    };

    const resetCharacterForm = () => {
        characterForm.reset();
        document.getElementById('original_name').value = '';
        document.getElementById('character-form-title').textContent = 'Crea Personaggio';
        document.getElementById('ideal-stats-inputs').innerHTML = '';
        document.querySelectorAll('#stats-checkboxes input[type=checkbox]').forEach(cb => cb.checked = false);
    };

    const initCharacterCreationForm = () => {
        const statsCheckboxesContainer = document.getElementById('stats-checkboxes');
        statsCheckboxesContainer.innerHTML = '';
        config.stats.forEach(stat => {
            const statId = createSafeId(stat);
            statsCheckboxesContainer.innerHTML += `<div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="track-${statId}" name="tracked_stats[]" value="${stat}"><label class="form-check-label" for="track-${statId}">${stat}</label></div>`;
        });
        const roleCheckboxesContainer = document.getElementById('role-checkboxes');
        roleCheckboxesContainer.innerHTML = '';
        config.roles.forEach(role => {
            const roleId = `role-${createSafeId(role)}`;
            roleCheckboxesContainer.innerHTML += `<div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="${roleId}" name="role[]" value="${role}"><label class="form-check-label" for="${roleId}">${role}</label></div>`;
        });
        populateSelect('element', config.elements);
        populateSelect('signature_weapon', config.signatureOptions);
        populateSelect('talents', config.talentOptions);
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

    // --- EVENT LISTENERS ---
    document.getElementById('back-to-gallery-btn').addEventListener('click', (e) => { e.preventDefault(); location.hash = '#'; });
    document.getElementById('edit-character-btn').addEventListener('click', (e) => {
        e.preventDefault();
        if (currentCharacterData) {
            populateCharacterFormForEdit(currentCharacterData);
            location.hash = '#new-character';
        }
    });

    // Added Logout Event Listener
    navLogoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('php/api.php?action=logout');
            const result = await response.json();
            if (result.status === 'success') {
                showToast('Logout effettuato con successo.');
                currentUser = null;
                isAdmin = false;
                updateLoginUI();
                location.hash = '#'; // Redirect to gallery after logout
            } else {
                showErrorAlert(result.message);
            }
        } catch (error) {
            showErrorAlert('Errore durante il logout.');
        }
    });

    // Added User Management Link Event Listener
    navUserManagementLink.addEventListener('click', (e) => {
        e.preventDefault();
        location.hash = '#user-management';
    });

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

    manageCharSelect.addEventListener('change', () => {
        const charName = manageCharSelect.value;
        if (!charName) { buildListContainer.innerHTML = ''; return; }
        currentCharacterData = sourceCharacterData.find(c => c.profile.name === charName);
        renderBuildList(currentCharacterData);
    });

    const renderBuildList = (charData) => {
        buildListContainer.innerHTML = '';
        if (charData.builds.length === 0) { buildListContainer.innerHTML = '<p class="text-muted">Nessuna build registrata.</p>'; return; }
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

    characterForm.onsubmit = async (e) => {
        e.preventDefault();
        const submitButton = characterForm.querySelector('button[type="submit"]');
        const originalName = document.getElementById('original_name').value;
        const isEditing = originalName !== '';
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
                dataLoaded = false; // Forza il ricaricamento dei dati alla prossima navigazione
                const newName = formData.get('name');
                location.hash = isEditing ? `#character/${encodeURIComponent(newName)}` : '#';
            } else { showErrorAlert(result.message); }
        } catch (error) { showErrorAlert('Impossibile comunicare con il server.');
        } finally { submitButton.disabled = false; submitButton.textContent = 'Salva Personaggio'; }
    };

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

    // ... (Aggiungere qui la logica per editBuildForm.onsubmit e buildListContainer click listener se necessario)

    // --- SEZIONE: TEMA DARK/LIGHT ---
    function initTheme() {
        const themeToggleBtn = document.getElementById('theme-toggle-btn');
        const currentTheme = localStorage.getItem('theme') || 'light';

        document.body.classList.toggle('dark-mode', currentTheme === 'dark');
        updateThemeIcon(currentTheme);

        themeToggleBtn.addEventListener('click', () => {
            const isDarkMode = document.body.classList.toggle('dark-mode');
            const newTheme = isDarkMode ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }

    function updateThemeIcon(theme) {
        const themeToggleBtn = document.getElementById('theme-toggle-btn');
        const icon = themeToggleBtn.querySelector('i');
        if (theme === 'dark') {
            icon.classList.remove('bi-moon-stars-fill');
            icon.classList.add('bi-sun-fill');
        } else {
            icon.classList.remove('bi-sun-fill');
            icon.classList.add('bi-moon-stars-fill');
        }
    }

    // --- INIZIALIZZAZIONE ---
    const init = async () => {
        initCharacterCreationForm();
        initGalleryControls();
        initTheme();
        window.addEventListener('hashchange', handleRouteChange);
        await handleRouteChange();
        updateLoginUI();
    };

    init();
});