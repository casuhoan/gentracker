document.addEventListener('DOMContentLoaded', () => {
    // This file should be loaded after app.js, so it can access its variables and functions

    const settingsForm = document.getElementById('settings-form');
    const passwordForm = document.getElementById('password-form');
    const settingsAvatarInput = document.getElementById('settings-avatar-input');
    
    const libraryCharacterForm = document.getElementById('library-character-form');
    const editLibraryCharacterForm = document.getElementById('edit-library-character-form');


    // --- SETTINGS PAGE FUNCTIONS ---

    window.loadSettingsPage = () => {
        if (!currentUser) return;

        // Profile Tab
        const profileForm = document.getElementById('settings-form');
        if (profileForm) {
            document.getElementById('settings-original-username').value = currentUser.username;
            document.getElementById('settings-username').value = currentUser.username;
            document.getElementById('settings-avatar-preview').src = currentUser.avatar || 'uploads/default_avatar.png';
        }

        // Auth Tab
        const passwordForm = document.getElementById('password-form');
        if (passwordForm) passwordForm.reset();

        // Appearance Tab
        const currentTheme = localStorage.getItem('theme') || 'light';
        const themeRadio = document.getElementById(`theme-${currentTheme}`);
        if (themeRadio) themeRadio.checked = true;

        const opacitySwitch = document.getElementById('enable-card-opacity-switch');
        if (opacitySwitch) {
            opacitySwitch.checked = (currentUser.card_opacity === 'on');
        }

        const grimoireView = currentUser.grimoire_view || 'splash';
        const grimoireViewRadio = document.getElementById(`grimoire-view-${grimoireView}`);
        if (grimoireViewRadio) grimoireViewRadio.checked = true;

        if (window.isAdmin) {
            
            document.getElementById('v-pills-library-tab')?.classList.remove('d-none');
            document.getElementById('v-pills-schema-tab')?.classList.remove('d-none');
            document.getElementById('v-pills-elements-tab')?.classList.remove('d-none');
            document.getElementById('v-pills-weapons-tab')?.classList.remove('d-none');
            document.getElementById('v-pills-tickets-tab')?.classList.remove('d-none');
            document.getElementById('v-pills-nations-tab')?.classList.remove('d-none');
        }

        // Show tabs for both Admin and Moderator
        if (window.isAdmin || window.isModerator) {
            document.getElementById('v-pills-backgrounds-tab')?.classList.remove('d-none');
            document.getElementById('v-pills-keywords-tab')?.classList.remove('d-none');
        }
    };

    window.loadLibraryManagement = async () => {
        try {
            const elementOptions = elementsData.map(el => ({ name: el.name, value: el.name }));
            const nationOptions = nationsData.map(n => ({ name: n.name, value: n.name }));
            populateSelect('library-char-nazione', nationOptions, 'Scegli nazione...');
            populateSelect('edit-library-char-nazione', nationOptions);
            populateSelect('library-char-element', elementOptions, 'Scegli elemento...');
            populateSelect('edit-library-char-element', elementOptions);
            populateSelect('library-char-element', elementOptions, 'Scegli elemento...');
            populateSelect('edit-library-char-element', elementOptions);

            const tableBody = document.getElementById('library-character-table-body');
            if (!tableBody) return;
            tableBody.innerHTML = '';
            if (characterLibrary && characterLibrary.length > 0) {
                characterLibrary.forEach(char => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>
                            <img src="${char.immagine ? 'data/' + char.immagine : ''}" class="me-2" style="width: 32px; height: 32px; object-fit: cover; border-radius: 50%;">
                            <strong>${char.nome}</strong>
                        </td>
                        <td>${char.titolo || '-'}</td>
                        <td>${char.elemento || '-'}</td>
                        <td>${char.rarita || '-'}</td>
                        <td class="text-end">
                            <button class="btn btn-sm btn-primary btn-edit-lib-char" data-char-name="${encodeURIComponent(char.nome)}">Modifica</button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
            }
        } catch (error) {
            showErrorAlert('Impossibile caricare la libreria dei personaggi.');
            console.error(error);
        }
    };

    window.loadBackgroundSelector = async () => {
        const response = await fetch('php/api.php?action=get_backgrounds');
        const data = await response.json();
        const grid = document.getElementById('background-selector-grid');
        const container = document.getElementById('background-selector-container');
        const bgSwitch = document.getElementById('enable-background-switch');
        
        if (!grid || !container || !bgSwitch) return;

        grid.innerHTML = '';

        const isBgEnabled = currentUser.background && currentUser.background !== 'disattivato';
        bgSwitch.checked = isBgEnabled;
        container.classList.toggle('hidden', !isBgEnabled);

        if (data.status === 'success') {
            data.backgrounds.forEach(bg => {
                const isSelected = (currentUser.background === bg);
                const itemWrapper = document.createElement('div');
                itemWrapper.className = 'col';
                itemWrapper.innerHTML = `
                    <div class="background-item" data-bg="${bg}">
                        <img src="data/backgrounds/${bg}" class="img-thumbnail ${isSelected ? 'selected' : ''}">
                        <div class="background-item-overlay">
                            <i class="bi bi-eye-fill preview-icon"></i>
                        </div>
                    </div>
                `;
                grid.appendChild(itemWrapper);
            });
        }
    }

    window.loadBackgroundManagement = async () => {
        const response = await fetch('php/api.php?action=get_backgrounds');
        const data = await response.json();
        const grid = document.getElementById('background-management-grid');
        grid.innerHTML = '';
        if (data.status === 'success') {
            data.backgrounds.forEach(bg => {
                const div = document.createElement('div');
                div.className = 'col';
                div.innerHTML = `
                    <div class="card">
                        <img src="data/backgrounds/${bg}" class="card-img-top">
                        <div class="card-body text-center">
                            <button class="btn btn-sm btn-danger delete-background-btn" data-bg="${bg}">Elimina</button>
                        </div>
                    </div>`;
                grid.appendChild(div);
            });
        }
    }

    window.loadUserSchema = async () => {
        const response = await fetch('php/api.php?action=get_user_schema');
        const schema = await response.json();
        const container = document.getElementById('user-schema-container');
        container.innerHTML = '';
        if (Array.isArray(schema)) {
            schema.forEach(field => {
                const div = document.createElement('div');
                div.className = 'input-group mb-2';
                div.innerHTML = `
                    <span class="input-group-text">Campo</span>
                    <input type="text" class="form-control" placeholder="Nome Campo" value="${field.name}" ${!field.editable ? 'disabled' : ''}>
                    <span class="input-group-text">Default</span>
                    <input type="text" class="form-control" placeholder="Valore Default" value="${field.default}" ${!field.editable ? 'disabled' : ''}>
                    ${field.editable ? '<button class="btn btn-outline-danger remove-schema-field-btn">&times;</button>' : '<button class="btn btn-outline-secondary" disabled>&times;</button>'}
                `;
                container.appendChild(div);
            });
        }
    }

    window.loadElementsManagement = async () => {
        const response = await fetch('php/api.php?action=get_elements');
        const elements = await response.json();
        const container = document.getElementById('elements-list-container');
        if (!container) return;
        container.innerHTML = '';
        elements.forEach(element => {
            const elementNode = document.createElement('div');
            elementNode.className = 'list-group-item d-flex justify-content-between align-items-center';
            elementNode.innerHTML = `
                <div class="d-flex align-items-center">
                    <img src="${element.icon ? 'data/icons/elements/' + element.icon : ''}" class="me-3" style="width: 32px; height: 32px; object-fit: contain;">
                    <strong>${element.name}</strong>
                </div>
                <form class="update-element-icon-form" style="max-width: 250px;">
                    <input type="hidden" name="element_name" value="${element.name}">
                    <div class="input-group">
                        <input type="file" name="element_icon" class="form-control form-control-sm" required>
                        <button type="submit" class="btn btn-sm btn-outline-secondary">Aggiorna</button>
                    </div>
                </form>
            `;
            container.appendChild(elementNode);
        });
    }

    window.loadWeaponsManagement = async () => {
        const response = await fetch('php/api.php?action=get_weapons');
        const weapons = await response.json();
        const container = document.getElementById('weapons-list-container');
        if (!container) return;
        container.innerHTML = '';
        weapons.forEach(weapon => {
            const weaponNode = document.createElement('div');
            weaponNode.className = 'list-group-item d-flex justify-content-between align-items-center';
            weaponNode.innerHTML = `
                <div class="d-flex align-items-center">
                    <img src="${weapon.icon ? 'data/icons/weapons/' + weapon.icon : ''}" class="me-3" style="width: 32px; height: 32px; object-fit: contain;">
                    <strong>${weapon.name}</strong>
                </div>
                <form class="update-weapon-icon-form" style="max-width: 250px;">
                    <input type="hidden" name="weapon_name" value="${weapon.name}">
                    <div class="input-group">
                        <input type="file" name="weapon_icon" class="form-control form-control-sm" required>
                        <button type="submit" class="btn btn-sm btn-outline-secondary">Aggiorna</button>
                    </div>
                </form>
            `;
            container.appendChild(weaponNode);
        });
    }

    // --- TICKET MANAGEMENT ---

    const loadTicketManagement = async () => {
        if (!isAdmin) return;

        try {
            const response = await fetch('php/api.php?action=get_tickets');
            const data = await response.json();

            if (data.status !== 'success') {
                showErrorAlert(data.message || 'Impossibile caricare i ticket.');
                return;
            }

            const openTicketsBody = document.getElementById('open-tickets-table-body');
            const closedTicketsBody = document.getElementById('closed-tickets-table-body');

            openTicketsBody.innerHTML = '';
            if (data.open_tickets && data.open_tickets.length > 0) {
                data.open_tickets.forEach(ticket => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><small>${ticket.id}</small></td>
                        <td>${ticket.user}</td>
                        <td>${ticket.character_name}</td>
                        <td>${ticket.title}</td>
                        <td>${new Date(ticket.timestamp).toLocaleString('it-IT')}</td>
                        <td class="text-end">
                            <button class="btn btn-sm btn-primary btn-view-ticket" 
                                data-ticket-id="${ticket.id}" 
                                data-ticket-content="${encodeURIComponent(ticket.content)}" 
                                data-ticket-title="${ticket.title}" 
                                data-ticket-user="${ticket.user}"
                                data-ticket-character-name="${ticket.character_name}">Vedi e Completa</button>
                        </td>
                    `;
                    openTicketsBody.appendChild(row);
                });
            } else {
                openTicketsBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Nessun ticket aperto.</td></tr>';
            }

            closedTicketsBody.innerHTML = '';
            if (data.closed_tickets && data.closed_tickets.length > 0) {
                data.closed_tickets.forEach(ticket => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><small>${ticket.id}</small></td>
                        <td>${ticket.user}</td>
                        <td>${ticket.character_name}</td>
                        <td>${ticket.title}</td>
                        <td>${new Date(ticket.timestamp).toLocaleString('it-IT')}</td>
                    `;
                    closedTicketsBody.appendChild(row);
                });
            } else {
                closedTicketsBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nessun ticket chiuso.</td></tr>';
            }

        } catch (error) {
            showErrorAlert('Errore di comunicazione con il server durante il caricamento dei ticket.');
            console.error('Error loading tickets:', error);
        }
    };

    document.getElementById('v-pills-tickets')?.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.btn-view-ticket');
        if (!viewBtn) return;

        const ticketId = viewBtn.dataset.ticketId;
        const ticketUser = viewBtn.dataset.ticketUser;
        const ticketTitle = viewBtn.dataset.ticketTitle;
        const ticketContent = decodeURIComponent(viewBtn.dataset.ticketContent);
        const ticketCharacterName = viewBtn.dataset.ticketCharacterName;

        Swal.fire({
            title: `Ticket per ${ticketCharacterName}`,
            html: `
                <div class="text-start">
                    <p class="mb-1"><strong>Inviato da:</strong> ${ticketUser}</p>
                    <p class="mb-1"><strong>Titolo:</strong> ${ticketTitle}</p>
                    <p class="mb-2"><strong>ID:</strong> <small>${ticketId}</small></p>
                    <hr class="my-2">
                    <p class="mb-1"><strong>Contenuto Suggerito:</strong></p>
                    <div style="white-space: pre-wrap; background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 10px; border-radius: 5px; max-height: 300px; overflow-y: auto; text-align: left;">${ticketContent.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Completa Ticket',
            cancelButtonText: 'Annulla',
            confirmButtonColor: '#198754',
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const formData = new FormData();
                    formData.append('action', 'close_ticket');
                    formData.append('ticket_id', ticketId);

                    const response = await fetch('php/api.php', { method: 'POST', body: formData });
                    const res = await response.json();

                    if (res.status === 'success') {
                        showToast('Ticket completato con successo!');
                        loadTicketManagement(); // Refresh the tables
                    } else {
                        showErrorAlert(res.message || 'Impossibile completare il ticket.');
                    }
                } catch (error) {
                    showErrorAlert('Errore di comunicazione con il server.');
                }
            }
        });
    });

    // --- KEYWORD MANAGEMENT ---

    let keywordColors = [];
    let keywordTooltips = [];

    const keywordColorsTable = document.getElementById('keyword-colors-table-body');
    const keywordTooltipsTable = document.getElementById('keyword-tooltips-table-body');
    const saveKeywordsBtn = document.getElementById('save-keyword-settings-btn');

    const colorOptions = {
        "Rosso": "#dc3545",
        "Blu": "#0d6efd",
        "Verde": "#198754",
        "Verde acqua": "#20c997",
        "Giallo": "#ffc107",
        "Ciano": "#0dcaf0",
        "Viola": "#6f42c1",
        "Arancione": "#fd7e14",
        "Rosa": "#d63384",
        "Grigio": "#6c757d",
        "Nero": "#000000"
    };

    const populateColorSelect = () => {
        const select = document.getElementById('keyword-color-select');
        if (!select) return;
        select.innerHTML = '';
        for (const [name, hex] of Object.entries(colorOptions)) {
            const option = document.createElement('option');
            option.value = hex;
            option.innerHTML = `<span style="color:${hex};">&9632;</span> ${name}`;
            select.appendChild(option);
        }
    };

    const renderKeywordManagement = () => {
        if (keywordColorsTable) {
            keywordColorsTable.innerHTML = '';
            keywordColors.forEach((item, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><input type="text" class="form-control form-control-sm keyword-color-input" data-index="${index}" value="${item.keyword}"></td>
                    <td><select class="form-select form-select-sm keyword-color-select" data-index="${index}"></select></td>
                    <td class="text-nowrap">
                        <button class="btn btn-sm btn-outline-secondary move-keyword-up-btn" data-type="color" data-index="${index}" ${index === 0 ? 'disabled' : ''}>&uarr;</button>
                        <button class="btn btn-sm btn-outline-secondary move-keyword-down-btn" data-type="color" data-index="${index}" ${index === keywordColors.length - 1 ? 'disabled' : ''}>&darr;</button>
                        <button class="btn btn-sm btn-danger delete-keyword-color-btn ms-2" data-index="${index}">&times;</button>
                    </td>
                `;
                keywordColorsTable.appendChild(row);

                const select = row.querySelector('.keyword-color-select');
                for (const [name, hex] of Object.entries(colorOptions)) {
                    const option = document.createElement('option');
                    option.value = hex;
                    option.textContent = name;
                    if (hex === item.color) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                }
            });
        }
        const tooltipsAccordion = document.getElementById('keyword-tooltips-accordion');
        if (tooltipsAccordion) {
            tooltipsAccordion.innerHTML = '';
            keywordTooltips.forEach((item, index) => {
                const itemId = `tooltip-${index}`;
                const accordionItem = document.createElement('div');
                accordionItem.className = 'accordion-item';
                accordionItem.innerHTML = `
                    <h2 class="accordion-header" id="heading-${itemId}">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${itemId}" aria-expanded="false" aria-controls="collapse-${itemId}">
                            ${item.keyword}
                        </button>
                    </h2>
                    <div id="collapse-${itemId}" class="accordion-collapse collapse" aria-labelledby="heading-${itemId}" data-bs-parent="#keyword-tooltips-accordion">
                        <div class="accordion-body">
                            <form class="keyword-tooltip-details-form" data-index="${index}">
                                <div class="mb-3">
                                    <label for="keyword-tooltip-keyword-${itemId}" class="form-label">Parola Chiave</label>
                                    <input type="text" id="keyword-tooltip-keyword-${itemId}" class="form-control" value="${item.keyword}">
                                </div>
                                <div class="mb-3">
                                    <label for="keyword-tooltip-desc-${itemId}" class="form-label">Descrizione</label>
                                    <textarea id="keyword-tooltip-desc-${itemId}" class="form-control" rows="5">${item.description}</textarea>
                                </div>
                                <div class="d-flex justify-content-between">
                                    <button type="submit" class="btn btn-primary btn-sm">Salva</button>
                                    <button type="button" class="btn btn-danger btn-sm delete-keyword-tooltip-btn" data-index="${index}">Elimina</button>
                                </div>
                            </form>
                        </div>
                    </div>
                `;
                tooltipsAccordion.appendChild(accordionItem);
            });
        }
    };

    const loadKeywordManagement = async () => {
        try {
            const response = await fetch('php/api.php?action=get_keyword_settings');
            const data = await response.json();
            if (data.status === 'success') {
                keywordColors = data.colors;
                keywordTooltips = data.tooltips;
                populateColorSelect();
                renderKeywordManagement();
            } else {
                showErrorAlert('Impossibile caricare le impostazioni delle parole chiave.');
            }
        } catch (error) {
            showErrorAlert('Errore di comunicazione con il server.');
        }
    };

    // --- EVENT LISTENERS ---

    document.getElementById('v-pills-appearance-tab')?.addEventListener('shown.bs.tab', loadBackgroundSelector);
    document.getElementById('v-pills-backgrounds-tab')?.addEventListener('shown.bs.tab', loadBackgroundManagement);
    document.getElementById('v-pills-schema-tab')?.addEventListener('shown.bs.tab', loadUserSchema);
    document.getElementById('v-pills-library-tab')?.addEventListener('shown.bs.tab', loadLibraryManagement);
    document.getElementById('v-pills-elements-tab')?.addEventListener('shown.bs.tab', loadElementsManagement);
    document.getElementById('v-pills-weapons-tab')?.addEventListener('shown.bs.tab', loadWeaponsManagement);
    document.getElementById('v-pills-keywords-tab')?.addEventListener('shown.bs.tab', loadKeywordManagement);
    document.getElementById('v-pills-tickets-tab')?.addEventListener('shown.bs.tab', loadTicketManagement);
    document.getElementById('v-pills-nations-tab')?.addEventListener('shown.bs.tab', loadNationsManagement);

    document.getElementById('v-pills-tabContent')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        let action = '';
        let formData = null;
        let successMessage = '';
        let callback = null;

        if (e.target.id === 'add-element-form') {
            action = 'add_element';
            formData = new FormData();
            formData.append('element_name', document.getElementById('new-element-name').value);
            formData.append('element_icon', document.getElementById('new-element-icon').files[0]);
            successMessage = 'Elemento aggiunto con successo!';
            callback = loadElementsManagement;
        } else if (e.target.classList.contains('update-element-icon-form')) {
            action = 'update_element_icon';
            formData = new FormData(e.target);
            successMessage = 'Icona elemento aggiornata!';
            callback = loadElementsManagement;
        } else if (e.target.id === 'add-weapon-form') {
            action = 'add_weapon';
            formData = new FormData();
            formData.append('weapon_name', document.getElementById('new-weapon-name').value);
            formData.append('weapon_icon', document.getElementById('new-weapon-icon').files[0]);
            successMessage = 'Arma aggiunta con successo!';
            callback = loadWeaponsManagement;
        } else if (e.target.classList.contains('update-weapon-icon-form')) {
            action = 'update_weapon_icon';
            formData = new FormData(e.target);
            successMessage = 'Icona arma aggiornata!';
            callback = loadWeaponsManagement;
        }

        if (action && formData) {
            try {
                formData.append('action', action);
                const response = await fetch('php/api.php', { method: 'POST', body: formData });
                const result = await response.json();
                if (result.status === 'success') {
                    showToast(successMessage);
                    if (callback) callback(); 
                    e.target.reset();
                } else {
                    showErrorAlert(result.message);
                }
            } catch (error) {
                showErrorAlert('Errore di comunicazione con il server.');
            }
        }
    });

    document.getElementById('v-pills-appearance')?.addEventListener('click', async (e) => {
        const opacitySwitch = e.target.closest('#enable-card-opacity-switch');
        if (opacitySwitch) {
            const isEnabled = opacitySwitch.checked;
            const newOpacityValue = isEnabled ? 'yes' : 'no';

            const formData = new FormData();
            formData.append('action', 'update_user');
            formData.append('original_username', currentUser.username);
            formData.append('username', currentUser.username);
            formData.append('opacity', newOpacityValue);

            try {
                const response = await fetch('php/api.php', { method: 'POST', body: formData });
                const result = await response.json();
                if (result.status === 'success') {
                    currentUser.card_opacity = (newOpacityValue === 'yes' ? 'on' : 'off');
                    updateAppearanceUI();
                } else {
                    showErrorAlert(result.message);
                    opacitySwitch.checked = !isEnabled;
                }
            } catch (error) {
                showErrorAlert('Errore di comunicazione con il server.');
                opacitySwitch.checked = !isEnabled;
            }
            return;
        }

        const bgSwitch = e.target.closest('#enable-background-switch');

        // Handle Grimoire View Radios
        let grimoireViewRadio = e.target.closest('input[name="grimoire-view-radios"]');
        if (!grimoireViewRadio && e.target.tagName === 'LABEL') {
            const inputId = e.target.getAttribute('for');
            if (inputId && inputId.startsWith('grimoire-view-')) {
                grimoireViewRadio = document.getElementById(inputId);
            }
        }

        if (grimoireViewRadio) {
            // Use setTimeout to ensure the radio button's checked state is updated
            setTimeout(async () => {
                const radios = document.querySelectorAll('input[name="grimoire-view-radios"]');
                let selectedValue;
                radios.forEach(radio => {
                    if (radio.checked) {
                        selectedValue = radio.value;
                    }
                });

                if (selectedValue && currentUser.grimoire_view !== selectedValue) {
                    const formData = new FormData();
                    formData.append('action', 'update_user');
                    formData.append('original_username', currentUser.username);
                    formData.append('username', currentUser.username);
                    formData.append('grimoire_view', selectedValue);

                    try {
                        const response = await fetch('php/api.php', { method: 'POST', body: formData });
                        const result = await response.json();
                        if (result.status === 'success') {
                            currentUser.grimoire_view = selectedValue;
                            showToast('Visualizzazione libreria aggiornata!');
                            if (typeof applyGrimoireFiltersAndSorting === 'function' && document.getElementById('grimoire-view').classList.contains('active')) {
                                applyGrimoireFiltersAndSorting();
                            }
                        } else {
                            showErrorAlert(result.message);
                        }
                    } catch (error) {
                        showErrorAlert('Errore di comunicazione con il server.');
                    }
                }
            }, 0);
            return;
        }

        if (bgSwitch) {
            const isEnabled = bgSwitch.checked;
            container.classList.toggle('hidden', !isEnabled);
            if (!isEnabled) {
                const formData = new FormData();
                formData.append('action', 'update_user');
                formData.append('original_username', currentUser.username);
                formData.append('username', currentUser.username);
                formData.append('background', 'disattivato');
                const response = await fetch('php/api.php', { method: 'POST', body: formData });
                const result = await response.json();
                if (result.status === 'success') {
                    showToast('Sfondo disattivato.');
                    currentUser.background = 'disattivato';
                    document.querySelectorAll('#background-selector-grid img').forEach(img => img.classList.remove('selected'));
                    updateAppearanceUI();
                } else {
                    showErrorAlert(result.message);
                }
            }
            return;
        }

        const backgroundItem = e.target.closest('.background-item');
        if (!backgroundItem) return;

        const bg = backgroundItem.dataset.bg;

        if (e.target.classList.contains('preview-icon')) {
            Swal.fire({
                imageUrl: `data/backgrounds/${bg}`,
                imageWidth: '90vw',
                imageAlt: 'Anteprima Sfondo',
                showConfirmButton: false,
                showCloseButton: true,
                background: '#000000d0',
                customClass: { image: 'swal-image-responsive' },
                backdrop: `rgba(0,0,0,0.4) url("data/backgrounds/${bg}") center/cover no-repeat`
            });
            return;
        }

        document.querySelectorAll('#background-selector-grid .img-thumbnail').forEach(img => img.classList.remove('selected'));
        backgroundItem.querySelector('.img-thumbnail').classList.add('selected');

        const formData = new FormData();
        formData.append('action', 'update_user');
        formData.append('original_username', currentUser.username);
        formData.append('username', currentUser.username);
        formData.append('background', bg);
        const response = await fetch('php/api.php', { method: 'POST', body: formData });
        const result = await response.json();
        if (result.status === 'success') {
            showToast('Sfondo aggiornato!');
            currentUser.background = bg;
            updateAppearanceUI();
        } else {
            showErrorAlert(result.message);
        }
    });

    document.getElementById('upload-background-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        formData.append('action', 'upload_background');
        const response = await fetch('php/api.php', { method: 'POST', body: formData });
        const result = await response.json();
        if (result.status === 'success') {
            showToast(result.message);
            loadBackgroundManagement();
            e.target.reset();
        } else {
            showErrorAlert(result.message);
        }
    });

    document.getElementById('upload-grimoire-background-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        formData.append('action', 'upload_grimoire_background');
        const response = await fetch('php/api.php', { method: 'POST', body: formData });
        const result = await response.json();
        if (result.status === 'success') {
            showToast(result.message);
            grimoireBackground = result.background_file;
            applyGrimoireBackground();
            e.target.reset();
        } else {
            showErrorAlert(result.message);
        }
    });

    document.getElementById('upload-favicon-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Caricamento...';

        const formData = new FormData(form);
        formData.append('action', 'upload_favicon');

        try {
            const response = await fetch('php/api.php', { method: 'POST', body: formData });
            const result = await response.json();

            if (result.status === 'success') {
                showToast('Favicon aggiornata con successo!');
                const faviconTag = document.querySelector('link[rel="icon"]');
                if (faviconTag) {
                    faviconTag.href = result.path;
                }
                form.reset();
            } else {
                showErrorAlert(result.message || 'Si è verificato un errore.');
            }
        } catch (error) {
            showErrorAlert('Errore di comunicazione con il server.');
            console.error('Favicon upload error:', error);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Carica Favicon';
        }
    });

    document.getElementById('background-management-grid')?.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-background-btn')) {
            const filename = e.target.dataset.bg;
            Swal.fire({
                title: 'Sei sicuro?',
                text: `Vuoi davvero eliminare lo sfondo ${filename}?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonText: 'Annulla',
                confirmButtonText: 'Sì, elimina!'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    const response = await fetch('php/api.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'delete_background', filename })
                    });
                    const res = await response.json();
                    if (res.status === 'success') {
                        showToast(res.message);
                        loadBackgroundManagement();
                    } else {
                        showErrorAlert(res.message);
                    }
                }
            });
        }
    });

    document.getElementById('add-schema-field-btn')?.addEventListener('click', () => {
        const container = document.getElementById('user-schema-container');
        const div = document.createElement('div');
        div.className = 'input-group mb-2';
        div.innerHTML = `
            <span class="input-group-text">Campo</span>
            <input type="text" class="form-control" placeholder="Nome Campo">
            <span class="input-group-text">Default</span>
            <input type="text" class="form-control" placeholder="Valore Default">
            <button class="btn btn-outline-danger remove-schema-field-btn">&times;</button>
        `;
        container.appendChild(div);
    });

    document.getElementById('user-schema-container')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-schema-field-btn')) {
            e.target.parentElement.remove();
        }
    });

    document.getElementById('save-schema-btn')?.addEventListener('click', async () => {
        const schema = [];
        document.querySelectorAll('#user-schema-container .input-group').forEach(group => {
            const inputs = group.querySelectorAll('input[type="text"]');
            const name = inputs[0].value;
            const def = inputs[1].value;
            if (name) {
                schema.push({ name: name, default: def, editable: !inputs[0].disabled });
            }
        });
        const response = await fetch('php/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'save_user_schema', schema })
        });
        const result = await response.json();
        if (result.status === 'success') {
            showToast(result.message);
        } else {
            showErrorAlert(result.message);
        }
    });

    document.getElementById('enforce-schema-btn')?.addEventListener('click', async () => {
        Swal.fire({
            title: 'Sei sicuro?',
            text: "Questa azione modificherà tutti i profili utente per aggiungere i campi mancanti. L'operazione non è reversibile.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonText: 'Annulla',
            confirmButtonText: 'Sì, sincronizza!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                const response = await fetch('php/api.php', {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'enforce_user_schema' })
                });
                const res = await response.json();
                if (res.status === 'success') {
                    showToast(res.message);
                } else {
                    showErrorAlert(res.message);
                }
            }
        });
    });

    if (settingsForm) {
        settingsForm.onsubmit = async (e) => {
            e.preventDefault();

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
                submitButton.textContent = 'Salva Impostazioni Profilo';
            }
        };
    }

    if (passwordForm) {
        passwordForm.onsubmit = async (e) => {
            e.preventDefault();

            const password = document.getElementById('settings-password').value;
            const passwordConfirm = document.getElementById('settings-password-confirm').value;

            if (password !== passwordConfirm) {
                showErrorAlert('Le password non coincidono.');
                return;
            }
            if (!password) {
                showErrorAlert('Il campo password non può essere vuoto.');
                return;
            }

            const submitButton = passwordForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Salvataggio...';

            try {
                const formData = new FormData();
                formData.append('action', 'update_user');
                formData.append('original_username', currentUser.username);
                formData.append('username', currentUser.username); // Keep username the same
                formData.append('password', password);

                const response = await fetch('php/api.php', { method: 'POST', body: formData });
                const result = await response.json();

                if (result.status === 'success') {
                    showToast('Password aggiornata con successo!');
                    passwordForm.reset();
                } else {
                    showErrorAlert(result.message);
                }
            } catch (error) {
                showErrorAlert('Impossibile comunicare con il server.');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Aggiorna Password';
            }
        };
    }

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
                    // Refresh library data and UI
                    const libResponse = await fetch('data/characters_list.json?v=' + new Date().getTime());
                    characterLibrary = await libResponse.json();
                    loadLibraryManagement();
                    initCharacterLibrarySelect(); // Update the main creation form dropdown
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

    const syncLibraryImagesBtn = document.getElementById('sync-library-images-btn');
    if (syncLibraryImagesBtn) {
        syncLibraryImagesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            Swal.fire({
                title: 'Sincronizzare le immagini della libreria?',
                text: "Questa azione aggiornerà le icone e i banner dei personaggi e copierà i file di immagine. Sei sicuro?",
                icon: 'info',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sì, sincronizza!',
                cancelButtonText: 'Annulla'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        const formData = new FormData();
                        formData.append('action', 'sync_library_images');
                        const response = await fetch('php/api.php', { method: 'POST', body: formData });
                        const res = await response.json();
                        if (res.status === 'success') {
                            showToast('Sincronizzazione delle immagini completata con successo.');
                            // Optionally, refresh the library view
                            if (typeof loadLibraryManagement === 'function') {
                                loadLibraryManagement();
                            }
                        } else {
                            showErrorAlert(res.message || 'Errore durante la sincronizzazione delle immagini.');
                        }
                    } catch (error) {
                        showErrorAlert('Errore di comunicazione con il server.');
                    }
                }
            });
        });
    }

    const organizeSplashartsBtn = document.getElementById('organize-splasharts-btn');
    if (organizeSplashartsBtn) {
        organizeSplashartsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            Swal.fire({
                title: 'Sei assolutamente sicuro?',
                html: `Questa azione sposterà <b>tutti</b> i file delle splash art in una nuova cartella <code>/data/splashart/</code> e aggiornerà i percorsi nel file della libreria e in <b>tutti i file dei personaggi di tutti gli utenti</b>. <br><br><strong class="text-danger">Questa operazione è rischiosa e non può essere annullata facilmente.</strong><br>Procedere solo se si è sicuri e si ha un backup.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sì, sposta tutto!',
                cancelButtonText: 'Annulla'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    Swal.fire({
                        title: 'Spostamento in corso...',
                        html: 'Questa operazione potrebbe richiedere alcuni istanti. Non chiudere la pagina.',
                        allowOutsideClick: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });

                    try {
                        const response = await fetch('php/api.php', { 
                            method: 'POST', 
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'organize_splasharts' }) 
                        });
                        const res = await response.json();
                        if (res.status === 'success') {
                            Swal.fire('Successo!', res.message, 'success');
                        } else {
                            Swal.fire('Errore', res.message, 'error');
                        }
                    } catch (error) {
                        Swal.fire('Errore Critico', 'Errore di comunicazione con il server.', 'error');
                    }
                }
            });
        });
    }

    document.getElementById('library-character-table-body')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-edit-lib-char')) {
            document.getElementById('edit-library-character-form').reset();

            const charName = decodeURIComponent(e.target.dataset.charName);
            const charData = characterLibrary.find(c => c.nome === charName);
            if (!charData) return;

            const modal = new bootstrap.Modal(document.getElementById('edit-library-character-modal'));
            document.getElementById('edit-library-original-name').value = charData.nome;
            document.getElementById('edit-library-char-name').value = charData.nome;
            document.getElementById('edit-library-char-title').value = charData.titolo || '';
            document.getElementById('edit-library-char-element').value = charData.elemento || '';
            document.getElementById('edit-library-char-weapon').value = charData.arma || '';
            document.getElementById('edit-library-char-nazione').value = charData.nazione || '';
            document.getElementById('edit-library-char-fazione').value = charData.fazione || '';
            
            const rarityRadio = document.querySelector(`#edit-library-character-modal input[name="rarity"][value="${charData.rarita || '5-star'}"]`);
            if(rarityRadio) rarityRadio.checked = true;

            document.getElementById('edit-library-char-wip').checked = charData.wip || false;

            const currentImage = document.getElementById('edit-library-current-image');
            currentImage.src = charData.immagine ? `data/${charData.immagine}` : '';

            const currentIcon = document.getElementById('edit-library-current-icon');
            currentIcon.src = charData.icon ? `data/${charData.icon}` : '';

            const currentBanner = document.getElementById('edit-library-current-banner');
            currentBanner.src = charData.banner ? `data/${charData.banner}` : '';
            
            modal.show();
        }
    });

    if (editLibraryCharacterForm) {
        editLibraryCharacterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = editLibraryCharacterForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Salvataggio...';

            const formData = new FormData(editLibraryCharacterForm);
            formData.append('action', 'update_library_character');

            try {
                const response = await fetch('php/api.php', { method: 'POST', body: formData });
                const result = await response.json();

                if (result.status === 'success') {
                    showToast(result.message);
                    const modal = bootstrap.Modal.getInstance(document.getElementById('edit-library-character-modal'));
                    modal.hide();
                    
                    const libResponse = await fetch('data/characters_list.json?v=' + new Date().getTime());
                    characterLibrary = await libResponse.json();
                    loadLibraryManagement();
                    
                    dataLoaded = false; 
                } else {
                    showErrorAlert(result.message);
                }
            } catch (error) {
                showErrorAlert('Errore di comunicazione con il server.');
                console.error('Update library character error:', error);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Salva e Sincronizza Modifiche';
            }
        });
    }

    const libraryCharSearch = document.getElementById('library-char-search');
    if (libraryCharSearch) {
        libraryCharSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const tableRows = document.querySelectorAll('#library-character-table-body tr');
            tableRows.forEach(row => {
                const charName = row.querySelector('td').textContent.toLowerCase();
                if (charName.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    // --- AVATAR LIBRARY ---

    const chooseAvatarBtn = document.getElementById('choose-avatar-from-library-btn');
    const avatarLibraryView = document.getElementById('avatar-library-view');
    const backToSettingsBtn = document.getElementById('back-to-settings-btn');
    const settingsView = document.getElementById('settings-view');

    if (chooseAvatarBtn) {
        chooseAvatarBtn.addEventListener('click', () => {
            settingsView.classList.remove('active');
            avatarLibraryView.classList.add('active');
            loadAvatarLibrary();
        });
    }

    if (backToSettingsBtn) {
        backToSettingsBtn.addEventListener('click', () => {
            avatarLibraryView.classList.remove('active');
            settingsView.classList.add('active');
        });
    }

    const loadAvatarLibrary = () => {
        const grid = document.getElementById('avatar-library-grid');
        if (!grid) return;
        grid.innerHTML = '';

        characterLibrary.forEach(char => {
            if (char.icon) {
                const col = document.createElement('div');
                col.className = 'col';
                col.innerHTML = `
                    <div class="card h-100 text-center p-2 avatar-select-card" data-icon-path="data/${char.icon}">
                        <img src="data/${char.icon}" class="card-img-top" style="width: 80px; height: 80px; object-fit: contain; margin: 0 auto;">
                        <div class="card-body p-1">
                            <h6 class="card-title" style="font-size: 0.8rem;">${char.nome}</h6>
                        </div>
                    </div>
                `;
                grid.appendChild(col);
            }
        });
    };

    const avatarGrid = document.getElementById('avatar-library-grid');
    if (avatarGrid) {
        avatarGrid.addEventListener('click', async (e) => {
            const card = e.target.closest('.avatar-select-card');
            if (!card) return;

            const avatarPath = card.dataset.iconPath;

            const formData = new FormData();
            formData.append('action', 'update_user');
            formData.append('original_username', currentUser.username);
            formData.append('username', currentUser.username);
            formData.append('avatar_path', avatarPath);

            try {
                const response = await fetch('php/api.php', { method: 'POST', body: formData });
                const result = await response.json();

                if (result.status === 'success') {
                    showToast('Avatar aggiornato con successo!');
                    // Update currentUser and UI
                    currentUser.avatar = avatarPath;
                    updateLoginUI(); // This updates the navbar avatar
                    document.getElementById('settings-avatar-preview').src = avatarPath; // Update settings page preview
                    // Go back to settings view
                    backToSettingsBtn.click();
                } else {
                    showErrorAlert(result.message);
                }
            } catch (error) {
                showErrorAlert('Impossibile comunicare con il server.');
            }
        });
    }

    document.getElementById('v-pills-keywords')?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (e.target.id === 'keyword-color-form') {
            const keywordInput = document.getElementById('keyword-color-input');
            const colorSelect = document.getElementById('keyword-color-select');
            const keyword = keywordInput.value.trim();
            if (keyword) {
                keywordColors.push({ keyword: keyword, color: colorSelect.value });
                renderKeywordManagement();
                keywordInput.value = '';
            }
        } else if (e.target.id === 'keyword-tooltip-form') {
            const keywordInput = document.getElementById('keyword-tooltip-input');
            const descInput = document.getElementById('keyword-tooltip-desc');
            const keyword = keywordInput.value.trim();
            const description = descInput.value.trim();
            if (keyword && description) {
                keywordTooltips.push({ keyword: keyword, description: description });
                renderKeywordManagement();
                keywordInput.value = '';
                descInput.value = '';
            }
        }
    });

    document.getElementById('v-pills-keywords')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-keyword-color-btn')) {
            const index = parseInt(e.target.dataset.index);
            keywordColors.splice(index, 1);
            renderKeywordManagement();
        }
        if (e.target.classList.contains('delete-keyword-tooltip-btn')) {
            const index = parseInt(e.target.dataset.index);
            keywordTooltips.splice(index, 1);
            renderKeywordManagement();
        }
        if (e.target.classList.contains('move-keyword-up-btn')) {
            const index = parseInt(e.target.dataset.index);
            const type = e.target.dataset.type;
            if (type === 'color' && index > 0) {
                [keywordColors[index - 1], keywordColors[index]] = [keywordColors[index], keywordColors[index - 1]];
                renderKeywordManagement();
            }
            if (type === 'tooltip' && index > 0) {
                [keywordTooltips[index - 1], keywordTooltips[index]] = [keywordTooltips[index], keywordTooltips[index - 1]];
                renderKeywordManagement();
            }
        }
        if (e.target.classList.contains('move-keyword-down-btn')) {
            const index = parseInt(e.target.dataset.index);
            const type = e.target.dataset.type;
            if (type === 'color' && index < keywordColors.length - 1) {
                [keywordColors[index], keywordColors[index + 1]] = [keywordColors[index + 1], keywordColors[index]];
                renderKeywordManagement();
            }
            if (type === 'tooltip' && index < keywordTooltips.length - 1) {
                [keywordTooltips[index], keywordTooltips[index + 1]] = [keywordTooltips[index + 1], keywordTooltips[index]];
                renderKeywordManagement();
            }
        }
    });

    document.getElementById('v-pills-keywords')?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (e.target.classList.contains('keyword-tooltip-details-form')) {
            const index = parseInt(e.target.dataset.index);
            const keywordInput = e.target.querySelector('input[type="text"]');
            const descTextarea = e.target.querySelector('textarea');
            keywordTooltips[index].keyword = keywordInput.value;
            keywordTooltips[index].description = descTextarea.value;
            renderKeywordManagement();
            showToast('Tooltip salvato!');
        }
    });

    document.getElementById('v-pills-keywords')?.addEventListener('change', (e) => {
        const index = parseInt(e.target.dataset.index);
        if (isNaN(index)) return;

        if (e.target.classList.contains('keyword-color-select')) {
            if(keywordColors[index]) keywordColors[index].color = e.target.value;
        }
    });

    if (saveKeywordsBtn) {
        saveKeywordsBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('php/api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'save_keyword_settings',
                        colors: keywordColors,
                        tooltips: keywordTooltips
                    })
                });
                const result = await response.json();
                if (result.status === 'success') {
                    showToast(result.message);
                    window.keywordSettings = null; // Invalidate cache
                } else {
                    showErrorAlert(result.message);
                }
            } catch (error) {
                showErrorAlert('Errore durante il salvataggio.');
            }
        });
    }

});

// --- NATIONS MANAGEMENT --- 

async function loadNationsManagement() {
    try {
        const response = await fetch('php/api.php?action=get_nations');
        const nations = await response.json();
        window.nationsData = nations; // Update the global variable
        const container = document.getElementById('nations-accordion-container');
        if (!container) return;
        container.innerHTML = '';
        if (nations && nations.length > 0) {
            nations.forEach((nation, index) => {
                const nationId = `nation-${index}`;
                const imageUrl = nation.image ? `data/${nation.image}` : '';
                const accordionItem = document.createElement('div');
                accordionItem.className = 'accordion-item';
                accordionItem.innerHTML = `
                    <h2 class="accordion-header" id="heading-${nationId}">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${nationId}" aria-expanded="false" aria-controls="collapse-${nationId}">
                            ${nation.name} ${nation.hidden ? '<span class="badge bg-secondary ms-2">Nascosta</span>' : ''}
                        </button>
                    </h2>
                    <div id="collapse-${nationId}" class="accordion-collapse collapse" aria-labelledby="heading-${nationId}" data-bs-parent="#nations-accordion-container">
                        <div class="accordion-body">
                            <div class="form-check form-switch mb-3">
                                <input class="form-check-input nation-visibility-switch" type="checkbox" role="switch" id="nation-hidden-${nationId}" data-nation-name="${nation.name}" ${nation.hidden ? 'checked' : ''}>
                                <label class="form-check-label" for="nation-hidden-${nationId}">Nascondi Nazione</label>
                            </div>
                            <form class="nation-details-form" data-nation-name="${nation.name}">
                                <div class="mb-3">
                                    <label for="nation-desc-${nationId}" class="form-label">Descrizione</label>
                                    <textarea id="nation-desc-${nationId}" name="description" class="form-control" rows="5">${nation.description || ''}</textarea>
                                </div>
                                <div class="mb-3">
                                    <label for="nation-image-${nationId}" class="form-label">Immagine di Copertina</label>
                                    <input type="file" id="nation-image-${nationId}" name="image" class="form-control" accept="image/*">
                                    ${imageUrl ? `<img src="${imageUrl}" class="img-thumbnail mt-2" style="max-height: 100px;">` : ''}
                                </div>
                                <div class="d-flex justify-content-between">
                                    <button type="submit" class="btn btn-primary btn-sm">Salva Modifiche</button>
                                    <button type="button" class="btn btn-danger btn-sm delete-nation-btn" data-nation-name="${nation.name}">Elimina Nazione</button>
                                </div>
                            </form>
                        </div>
                    </div>
                `;
                container.appendChild(accordionItem);
            });
        }
    } catch (error) {
        showErrorAlert('Impossibile caricare le nazioni.');
        console.error(error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const addNationForm = document.getElementById('add-nation-form');
    if (addNationForm) {
        addNationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nationNameInput = document.getElementById('new-nation-name');
            const nationName = nationNameInput.value.trim();
            if (!nationName) return;

            try {
                const formData = new FormData();
                formData.append('action', 'add_nation');
                formData.append('name', nationName);

                const response = await fetch('php/api.php', { method: 'POST', body: formData });
                const result = await response.json();

                if (result.status === 'success') {
                    showToast('Nazione aggiunta con successo!');
                    nationNameInput.value = '';
                    loadNationsManagement();
                } else {
                    showErrorAlert(result.message);
                }
            } catch (error) {
                showErrorAlert('Errore di comunicazione con il server.');
            }
        });
    }

    const nationsContainer = document.getElementById('nations-accordion-container');
    if (nationsContainer) {
        nationsContainer.addEventListener('change', async (e) => {
            if (e.target.classList.contains('nation-visibility-switch')) {
                const nationName = e.target.dataset.nationName;
                const isHidden = e.target.checked;

                try {
                    const response = await fetch('php/api.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'update_nation_visibility',
                            name: nationName,
                            hidden: isHidden
                        })
                    });
                    const result = await response.json();
                    if (result.status === 'success') {
                        showToast('Visibilità della nazione aggiornata.');
                        await loadNationsManagement(); // Reload to show the badge and update window.nationsData

                        // Re-populate dropdowns
                        const nationOptions = window.nationsData.map(n => ({ name: n.name, value: n.name }));
                        if(typeof populateSelect === 'function'){
                            populateSelect('library-char-nazione', nationOptions, 'Scegli nazione...');
                            populateSelect('edit-library-char-nazione', nationOptions);
                            populateSelect('nation', nationOptions, 'Scegli nazione...'); // For character creation form
                            populateSelect('edit-nation', nationOptions, 'Scegli nazione...'); // For character edit form
                        }
                    } else {
                        showErrorAlert(result.message);
                    }
                } catch (error) {
                    showErrorAlert('Errore di comunicazione con il server.');
                }
            }
        });

        nationsContainer.addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-nation-btn')) {
                const nationName = e.target.dataset.nationName;
                
                Swal.fire({
                    title: 'Sei sicuro?',
                    text: `Vuoi davvero eliminare la nazione "${nationName}"?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonText: 'Annulla',
                    confirmButtonText: 'Sì, elimina!'
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        try {
                            const formData = new FormData();
                            formData.append('action', 'delete_nation');
                            formData.append('name', nationName);

                            const response = await fetch('php/api.php', { method: 'POST', body: formData });
                            const res = await response.json();

                            if (res.status === 'success') {
                                showToast('Nazione eliminata con successo.');
                                loadNationsManagement();
                            } else {
                                showErrorAlert(res.message);
                            }
                        } catch (error) {
                            showErrorAlert('Errore di comunicazione con il server.');
                        }
                    }
                });
            }
        });

        nationsContainer.addEventListener('submit', async (e) => {
            if (e.target.classList.contains('nation-details-form')) {
                e.preventDefault();
                const form = e.target;
                const nationName = form.dataset.nationName;
                const formData = new FormData(form);
                formData.append('action', 'update_nation_details');
                formData.append('name', nationName);

                try {
                    const response = await fetch('php/api.php', { method: 'POST', body: formData });
                    const result = await response.json();

                    if (result.status === 'success') {
                        showToast('Dettagli nazione aggiornati!');
                        // Optionally refresh the view
                        loadNationsManagement();
                    } else {
                        showErrorAlert(result.message);
                    }
                } catch (error) {
                    showErrorAlert('Errore di comunicazione con il server.');
                }
            }
        });
    }
});