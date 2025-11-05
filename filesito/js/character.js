document.addEventListener('DOMContentLoaded', () => {

    // --- CHARACTER FORM FUNCTIONS ---

    window.loadCharacterEditPage = (charData) => {
        showView('character-edit-view');
        const form = document.getElementById('character-edit-form');
        if (!form) return;

        const profile = charData.profile;
        form.reset();

        document.getElementById('edit-char-title-name').textContent = profile.name;
        document.getElementById('edit-original-name').value = profile.name;
        document.getElementById('edit-name').value = profile.name;
        
        const baseChar = characterLibrary.find(c => profile.name.includes(c.nome));
        document.getElementById('edit-base-char-name').value = baseChar ? baseChar.nome : profile.name;

        document.getElementById('edit-character-icon').value = profile.icon || '';
        document.getElementById('edit-character-banner').value = profile.banner || '';

        const previewContainer = document.getElementById('character-edit-preview-container');
        const previewImage = document.getElementById('character-edit-preview-image');
        if (profile.splashart && profile.splashart !== '') {
            previewImage.src = profile.splashart;
            previewContainer.classList.remove('empty');
        } else {
            previewImage.src = '';
            previewContainer.classList.add('empty');
        }

        document.getElementById('edit-element').value = profile.element;
        document.getElementById('edit-acquisition_date').value = profile.acquisition_date;
        document.getElementById('edit-constellation').value = profile.constellation;
        document.getElementById('edit-signature_weapon').value = profile.signature_weapon;
        document.getElementById('edit-talents').value = profile.talents;
        document.getElementById('edit-nation').value = profile.nation || '';
        document.getElementById('edit-faction').value = profile.faction || '';

        const rarityRadio = document.querySelector(`#edit-rarity-radios input[value="${profile.rarity || '5-star'}"]`);
        if (rarityRadio) rarityRadio.checked = true;

        document.querySelectorAll('#edit-role-checkboxes input').forEach(cb => cb.checked = profile.role.includes(cb.value));
        document.querySelectorAll('#edit-stats-checkboxes input').forEach(cb => cb.checked = profile.tracked_stats.includes(cb.value));

        const idealStatsContainer = document.getElementById('edit-ideal-stats-inputs');
        idealStatsContainer.innerHTML = '';
        profile.tracked_stats.forEach(stat => {
            const statId = createSafeId(stat);
            const idealValue = profile.ideal_stats[stat] || '';
            idealStatsContainer.innerHTML += `
                <div class="col-md-4 mb-3">
                    <label for="ideal-edit-${statId}" class="form-label">Ideal ${stat}</label>
                    <input type="number" step="0.1" class="form-control" id="ideal-edit-${statId}" name="ideal_stats[${stat}]" value="${idealValue}">
                </div>`;
        });

        // Handle Goblet Elementale
        const editGobletCheckbox = document.getElementById('edit-track-goblet-elementale');
        const editGobletContainer = document.getElementById('edit-ideal-goblet-elementale-container');
        const editGobletSelect = document.getElementById('edit-ideal-goblet-elementale');
        if (profile.ideal_stats && profile.ideal_stats['Goblet Elementale']) {
            editGobletCheckbox.checked = true;
            editGobletContainer.style.display = 'block';
            editGobletSelect.value = profile.ideal_stats['Goblet Elementale'];
        } else {
            editGobletCheckbox.checked = false;
            editGobletContainer.style.display = 'none';
            editGobletSelect.value = 'No';
        }

        const deleteBtn = document.getElementById('delete-character-btn');
        deleteBtn.style.display = 'inline-block';
        deleteBtn.onclick = () => handleDeleteCharacter(profile.name);
    };

    window.resetCharacterForm = () => {
        const characterForm = document.getElementById('character-form');
        if (!characterForm) return;
        characterForm.reset();

        const previewContainer = document.getElementById('character-preview-container');
        const previewImage = document.getElementById('character-preview-image');
        previewImage.src = '';
        if (previewContainer) previewContainer.classList.add('empty');

        document.getElementById('character-form-title').textContent = 'Crea Personaggio';
        document.getElementById('ideal-stats-inputs').innerHTML = '';
        document.querySelectorAll('#stats-checkboxes input[type=checkbox]').forEach(cb => cb.checked = false);
        characterForm.querySelector('button[type="submit"]').textContent = 'Salva Personaggio';
        const deleteBtn = document.getElementById('delete-character-btn');
        if(deleteBtn) {
            deleteBtn.style.display = 'none';
        }
        const characterLibrarySelect = document.getElementById('character-library-select');
        if (characterLibrarySelect) {
            characterLibrarySelect.disabled = false;
            characterLibrarySelect.selectedIndex = 0;
        }
        const defaultImagePathInput = document.getElementById('default_image_path');
        if (defaultImagePathInput) {
            defaultImagePathInput.value = '';
        }
    };

    window.initCharacterCreationForm = () => {
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
        populateNationsSelect();
    };

    async function populateNationsSelect() {
        try {
            const response = await fetch('php/api.php?action=get_nations');
            const nations = await response.json();
            const nationOptions = nations.map(n => ({ name: n.name, value: n.name }));
            populateSelect('nation', nationOptions, 'Scegli una nazione...');
            populateSelect('edit-nation', nationOptions, 'Scegli una nazione...');
        } catch (error) {
            console.error('Could not load nations for select', error);
        }
    }

    window.initCharacterLibrarySelect = () => {
        const characterLibrarySelect = document.getElementById('character-library-select');
        if (!characterLibrarySelect || characterLibrary.length === 0) return;
        const options = characterLibrary.map(char => ({ name: char.nome, value: char.nome }));
        populateSelect('character-library-select', options, 'Scegli un personaggio...');
    };

    window.handleDeleteCharacter = (characterName) => {
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

    const characterForm = document.getElementById('character-form');
    if (characterForm) {
        characterForm.onsubmit = async (e) => {
            e.preventDefault();

            const statsCheckboxes = characterForm.querySelectorAll('input[name="tracked_stats[]"]:checked');
            const errorMessage = document.getElementById('stats-error-message');

            if (statsCheckboxes.length === 0) {
                errorMessage.textContent = 'Selezionare delle statistiche da tracciare.';
                errorMessage.style.display = 'block';
                return;
            } else {
                errorMessage.style.display = 'none';
            }

            const submitButton = characterForm.querySelector('button[type="submit"]');
            const baseName = document.getElementById('character-library-select').value;
            const customName = document.getElementById('name').value;
            const characterExists = sourceCharacterData.some(char => char.profile.name === baseName);

            if (characterExists && baseName === customName) {
                showErrorAlert('Esiste già un personaggio con questo nome. Fornisci un soprannome unico nel campo "Nome Personalizzato".');
                return;
            }

            submitButton.disabled = true;
            submitButton.textContent = 'Salvataggio in corso...';

            try {
                const formData = new FormData(characterForm);
                formData.append('action', 'save_character');
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
                submitButton.textContent = 'Salva Personaggio';
            }
        };
    }

    const characterEditForm = document.getElementById('character-edit-form');
    if (characterEditForm) {
        characterEditForm.onsubmit = async (e) => {
            e.preventDefault();
            const submitButton = characterEditForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Salvataggio in corso...';

            try {
                const formData = new FormData(characterEditForm);
                formData.append('action', 'update_character');
                const response = await fetch('php/api.php', { method: 'POST', body: formData });
                const result = await response.json();

                if (result.status === 'success') {
                    showToast(result.message);
                    dataLoaded = false;
                    location.hash = `#character/${encodeURIComponent(formData.get('name'))}`;
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

    const characterLibrarySelect = document.getElementById('character-library-select');
    if (characterLibrarySelect) {
        characterLibrarySelect.addEventListener('change', () => {
            const selectedCharName = characterLibrarySelect.value;
            const nameInput = document.getElementById('name');
            const previewContainer = document.getElementById('character-preview-container');
            const previewImage = document.getElementById('character-preview-image');
            const elementDisplay = document.getElementById('character-element-display');
            const rarityDisplay = document.getElementById('character-rarity-display');
            const defaultImagePathInput = document.getElementById('default_image_path');
            const iconInput = document.getElementById('character-icon');
            const bannerInput = document.getElementById('character-banner');

            if (selectedCharName) {
                const characterFromLibrary = characterLibrary.find(c => c.nome === selectedCharName);
                if (characterFromLibrary) {
                    const imagePath = `data/${characterFromLibrary.immagine}`;
                    if (nameInput) nameInput.value = selectedCharName;
                    if (previewImage) previewImage.src = imagePath;
                    if (previewContainer) previewContainer.classList.remove('empty');
                    if (defaultImagePathInput) defaultImagePathInput.value = imagePath;
                    if (iconInput) iconInput.value = characterFromLibrary.icon || '';
                    if (bannerInput) bannerInput.value = characterFromLibrary.banner || '';

                    if (elementDisplay) {
                        const element = elementsData.find(e => e.name === characterFromLibrary.elemento);
                        elementDisplay.innerHTML = element && element.icon ? 
                            `<img src="data/icons/elements/${element.icon}" style="height: 24px;" alt="${element.name}"> <span class="ms-2">${element.name}</span>` : 
                            'N/D';
                        const elementInput = document.getElementById('character-element');
                        if (elementInput) {
                            elementInput.value = characterFromLibrary.elemento || '';
                        }
                    }

                    if (rarityDisplay) {
                        const starCount = characterFromLibrary.rarita === '5-star' ? 5 : 4;
                        rarityDisplay.innerHTML = '';
                        for(let i=0; i<starCount; i++) {
                            rarityDisplay.innerHTML += '<i class="bi bi-star-fill text-warning"></i>';
                        }
                    }
                }
            } else {
                if (nameInput) nameInput.value = '';
                if (previewImage) previewImage.src = '';
                if (previewContainer) previewContainer.classList.add('empty');
                if (defaultImagePathInput) defaultImagePathInput.value = '';
                if (elementDisplay) elementDisplay.innerHTML = '';
                if (rarityDisplay) rarityDisplay.innerHTML = '';
                const elementInput = document.getElementById('character-element');
                if (elementInput) {
                    elementInput.value = '';
                }
            }
        });
    }

    const useDefaultImageBtn = document.getElementById('use-default-image-btn');
    if (useDefaultImageBtn) {
        useDefaultImageBtn.addEventListener('click', () => {
            const selectedCharName = document.getElementById('character-library-select').value;
            if (!selectedCharName) {
                showErrorAlert('Seleziona prima un personaggio dalla libreria.');
                return;
            }
            const characterFromLibrary = characterLibrary.find(c => c.nome === selectedCharName);
            if (characterFromLibrary) {
                const imagePath = `data/${characterFromLibrary.immagine}`;
                document.getElementById('default_image_path').value = imagePath;
                document.getElementById('character-preview-image').src = imagePath;
                document.getElementById('character-preview-container').classList.remove('empty');
                showToast(`Immagine di default per ${selectedCharName} selezionata.`);
                document.getElementById('splashart').value = '';
            }
        });
    }

    const setupImagePreview = (inputId, previewId, containerId, defaultPathInputId) => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        document.getElementById(previewId).src = event.target.result;
                        document.getElementById(containerId).classList.remove('empty');
                        if (defaultPathInputId) {
                            document.getElementById(defaultPathInputId).value = '';
                        }
                    }
                    reader.readAsDataURL(file);
                }
            });
        }
    };

    setupImagePreview('splashart', 'character-preview-image', 'character-preview-container', 'default_image_path');
    setupImagePreview('edit-splashart', 'character-edit-preview-image', 'character-edit-preview-container', 'edit-default-image-path');

    const editUseDefaultBtn = document.getElementById('edit-use-default-image-btn');
    if (editUseDefaultBtn) {
        editUseDefaultBtn.addEventListener('click', () => {
            const baseCharName = document.getElementById('edit-base-char-name').value;
            const characterFromLibrary = characterLibrary.find(c => c.nome === baseCharName);
            if (characterFromLibrary) {
                const imagePath = `data/${characterFromLibrary.immagine}`;
                document.getElementById('edit-default-image-path').value = imagePath;
                document.getElementById('character-edit-preview-image').src = imagePath;
                document.getElementById('character-edit-preview-container').classList.remove('empty');
                if(document.getElementById('edit-splashart')) document.getElementById('edit-splashart').value = '';
                showToast(`Immagine di default per ${baseCharName} impostata.`);
            }
        });
    }

    if (document.getElementById('edit-character-btn')) {
        document.getElementById('edit-character-btn').addEventListener('click', (e) => {
            e.preventDefault();
            if (currentCharacterData) {
                location.hash = `#edit-character/${encodeURIComponent(currentCharacterData.profile.name)}`;
            }
        });
    }

    const statsCheckboxesContainer = document.getElementById('stats-checkboxes');
    if (statsCheckboxesContainer) {
        statsCheckboxesContainer.addEventListener('change', (e) => {
            if (e.target.type !== 'checkbox') return;

            const stat = e.target.value;
            const statId = createSafeId(stat);
            const idealStatsContainer = document.getElementById('ideal-stats-inputs');
            const existingInputContainer = document.getElementById(`ideal-input-container-${statId}`);

            if (e.target.checked && !existingInputContainer) {
                const inputDiv = document.createElement('div');
                inputDiv.className = 'col-md-4 mb-3';
                inputDiv.id = `ideal-input-container-${statId}`;
                inputDiv.innerHTML = `
                    <label for="ideal-${statId}" class="form-label">Ideal ${stat}</label>
                    <input type="number" step="0.1" class="form-control" id="ideal-${statId}" name="ideal_stats[${stat}]" placeholder="${stat}">
                `;
                idealStatsContainer.appendChild(inputDiv);
            } else if (!e.target.checked && existingInputContainer) {
                existingInputContainer.remove();
            }
        });
    }

    const setTodayAcquisitionBtn = document.getElementById('set-today-acquisition');
    if (setTodayAcquisitionBtn) {
        setTodayAcquisitionBtn.addEventListener('click', () => {
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('acquisition_date').value = today;
        });
    }

    const setupCheckboxToggle = (checkboxId, containerId) => {
        const checkbox = document.getElementById(checkboxId);
        const container = document.getElementById(containerId);
        if (checkbox && container) {
            checkbox.addEventListener('change', (e) => {
                container.style.display = e.target.checked ? 'block' : 'none';
            });
        }
    };

    setupCheckboxToggle('track-goblet-elementale', 'ideal-goblet-elementale-container');
    setupCheckboxToggle('edit-track-goblet-elementale', 'edit-ideal-goblet-elementale-container');
});
