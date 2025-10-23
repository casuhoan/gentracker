
document.addEventListener('DOMContentLoaded', () => {
    // This file should be loaded after app.js, so it can access its variables and functions

    const settingsForm = document.getElementById('settings-form');
    const passwordForm = document.getElementById('password-form');
    const settingsAvatarInput = document.getElementById('settings-avatar-input');
    const syncLibraryBtn = document.getElementById('v-pills-sync-tab');
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

        if (isAdmin) {
            document.getElementById('v-pills-sync-tab')?.classList.remove('d-none');
            document.getElementById('v-pills-library-tab')?.classList.remove('d-none');
            document.getElementById('v-pills-backgrounds-tab')?.classList.remove('d-none');
            document.getElementById('v-pills-schema-tab')?.classList.remove('d-none');
            document.getElementById('v-pills-elements-tab')?.classList.remove('d-none');
        }
    };

    window.loadLibraryManagement = async () => {
        try {
            const elementOptions = elementsData.map(el => ({ name: el.name, value: el.name }));
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


    // --- EVENT LISTENERS ---

    document.getElementById('v-pills-appearance-tab')?.addEventListener('shown.bs.tab', loadBackgroundSelector);
    document.getElementById('v-pills-backgrounds-tab')?.addEventListener('shown.bs.tab', loadBackgroundManagement);
    document.getElementById('v-pills-schema-tab')?.addEventListener('shown.bs.tab', loadUserSchema);
    document.getElementById('v-pills-library-tab')?.addEventListener('shown.bs.tab', loadLibraryManagement);
    document.getElementById('v-pills-elements-tab')?.addEventListener('shown.bs.tab', loadElementsManagement);

    document.getElementById('v-pills-elements')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        let action = '';
        let formData = null;
        let successMessage = '';

        if (e.target.id === 'add-element-form') {
            action = 'add_element';
            formData = new FormData();
            formData.append('element_name', document.getElementById('new-element-name').value);
            formData.append('element_icon', document.getElementById('new-element-icon').files[0]);
            successMessage = 'Elemento aggiunto con successo!';
        } else if (e.target.classList.contains('update-element-icon-form')) {
            action = 'update_element_icon';
            formData = new FormData(e.target);
            successMessage = 'Icona elemento aggiornata!';
        }

        if (action && formData) {
            try {
                formData.append('action', action);
                const response = await fetch('php/api.php', { method: 'POST', body: formData });
                const result = await response.json();
                if (result.status === 'success') {
                    showToast(successMessage);
                    loadElementsManagement(); // Refresh the list
                    if (e.target.id === 'add-element-form') e.target.reset();
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
        const container = document.getElementById('background-selector-container');

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
            
            const rarityRadio = document.querySelector(`#edit-library-character-modal input[name="rarity"][value="${charData.rarita || '5-star'}"]`);
            if(rarityRadio) rarityRadio.checked = true;

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

});
