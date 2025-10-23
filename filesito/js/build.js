
document.addEventListener('DOMContentLoaded', () => {

    // --- BUILD FUNCTIONS ---

    window.loadCharactersForBuildLogger = () => {
        const charOptions = sourceCharacterData.map(c => ({ name: c.profile.name, value: c.profile.name }));
        populateSelect('char-select', charOptions, 'Scegli un personaggio...');
        populateSelect('build_signature_weapon', config.signatureOptions);
        populateSelect('build_talents', config.talentOptions);
        document.getElementById('build-stats-inputs').innerHTML = '';
    };

    window.loadBuildManagement = () => {
        const charOptions = sourceCharacterData.map(c => ({ name: c.profile.name, value: c.profile.name }));
        populateSelect('manage-char-select', charOptions, 'Scegli un personaggio...');
        document.getElementById('build-list-container').innerHTML = '';
    };

    const renderBuildList = (charData) => {
        const buildListContainer = document.getElementById('build-list-container');
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

    const buildForm = document.getElementById('build-form');
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

    const editBuildForm = document.getElementById('edit-build-form');
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

    const charSelect = document.getElementById('char-select');
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

    const manageCharSelect = document.getElementById('manage-char-select');
    if (manageCharSelect) {
        manageCharSelect.addEventListener('change', () => {
            const charName = manageCharSelect.value;
            if (!charName) { document.getElementById('build-list-container').innerHTML = ''; return; }
            currentCharacterData = sourceCharacterData.find(c => c.profile.name === charName);
            renderBuildList(currentCharacterData);
        });
    }

    const buildListContainer = document.getElementById('build-list-container');
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

    const setTodayBuildBtn = document.getElementById('set-today-build');
    if (setTodayBuildBtn) {
        setTodayBuildBtn.addEventListener('click', () => {
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('build-date').value = today;
        });
    }
});
