
document.addEventListener('DOMContentLoaded', () => {

    const FIGHT_PROP_ID_MAP = {
        "1": "FIGHT_PROP_BASE_HP", "2": "FIGHT_PROP_HP", "3": "FIGHT_PROP_HP_PERCENT",
        "4": "FIGHT_PROP_BASE_ATTACK", "5": "FIGHT_PROP_ATTACK", "6": "FIGHT_PROP_ATTACK_PERCENT",
        "7": "FIGHT_PROP_BASE_DEFENSE", "8": "FIGHT_PROP_DEFENSE", "9": "FIGHT_PROP_DEFENSE_PERCENT",
        "10": "FIGHT_PROP_BASE_SPEED", "11": "FIGHT_PROP_SPEED_PERCENT",
        "20": "FIGHT_PROP_CRITICAL", "21": "FIGHT_PROP_ANTI_CRITICAL", "22": "FIGHT_PROP_CRITICAL_HURT",
        "23": "FIGHT_PROP_CHARGE_EFFICIENCY", "26": "FIGHT_PROP_HEAL_ADD", "27": "FIGHT_PROP_HEALED_ADD",
        "28": "FIGHT_PROP_ELEMENT_MASTERY", "29": "FIGHT_PROP_PHYSICAL_SUB_HURT", "30": "FIGHT_PROP_PHYSICAL_ADD_HURT",
        "40": "FIGHT_PROP_FIRE_ADD_HURT", "41": "FIGHT_PROP_ELEC_ADD_HURT", "42": "FIGHT_PROP_WATER_ADD_HURT",
        "43": "FIGHT_PROP_GRASS_ADD_HURT", "44": "FIGHT_PROP_WIND_ADD_HURT", "45": "FIGHT_PROP_ROCK_ADD_HURT",
        "46": "FIGHT_PROP_ICE_ADD_HURT", "50": "FIGHT_PROP_FIRE_SUB_HURT", "51": "FIGHT_PROP_ELEC_SUB_HURT",
        "52": "FIGHT_PROP_WATER_SUB_HURT", "53": "FIGHT_PROP_GRASS_SUB_HURT", "54": "FIGHT_PROP_WIND_SUB_HURT",
        "55": "FIGHT_PROP_ROCK_SUB_HURT", "56": "FIGHT_PROP_ICE_SUB_HURT",
        "2000": "FIGHT_PROP_MAX_HP", "2001": "FIGHT_PROP_ATTACK", "2002": "FIGHT_PROP_DEFENSE"
    };
    let enkaStatMap = {};
    fetch('inventory/en_stat_map.json').then(r => r.json()).then(data => enkaStatMap = data);

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

    const prefillBuildFormFromMigration = (galleryCharData) => {
        const inventoryCharData = window.migrationData.inventoryCharData;
        const fightPropMap = inventoryCharData.fightPropMap;

        // Set date to today
        document.getElementById('build-date').value = new Date().toISOString().split('T')[0];

        // Pre-fill Constellation
        const constellationInput = document.getElementById('build_constellation');
        if (constellationInput && inventoryCharData.talentIdList) {
            constellationInput.value = inventoryCharData.talentIdList.length;
        }

        // Map the display stat name (from tracked_stats) to the numeric key in fightPropMap
        const nameToNumericKey = {
            "HP": "2000",
            "Atk": "2001",
            "Def": "2002",
            "Energy Recharge (%)": "23",
            "Elemental Mastery": "28",
            "Crit Rate (%)": "20",
            "Crit Damage (%)": "22",
            "Healing Bonus (%)": "26",
            "Pyro DMG Bonus (%)": "40",
            "Electro DMG Bonus (%)": "41",
            "Hydro DMG Bonus (%)": "42",
            "Dendro DMG Bonus (%)": "43",
            "Anemo DMG Bonus (%)": "44",
            "Geo DMG Bonus (%)": "45",
            "Cryo DMG Bonus (%)": "46",
            "Physical DMG Bonus (%)": "30"
        };

        // Pre-fill stats
        galleryCharData.profile.tracked_stats.forEach(trackedStatName => {
            const numericKey = nameToNumericKey[trackedStatName];
            if (numericKey && fightPropMap[numericKey] !== undefined) {
                const value = fightPropMap[numericKey];
                const input = document.getElementById(`build-${createSafeId(trackedStatName)}`);
                if (input) {
                    const stringKey = FIGHT_PROP_ID_MAP[numericKey];
                    const statInfo = enkaStatMap ? enkaStatMap[stringKey] : null;
                    if (statInfo && statInfo.percent) {
                        input.value = (value * 100).toFixed(1);
                    } else {
                        input.value = Math.round(value);
                    }
                }
            }
        });

        showToast('Modulo pre-compilato con i dati dall\'inventario.');
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

            // Pre-fill talents and signature weapon from the latest build
            const talentsSelect = document.getElementById('build_talents');
            const signatureSelect = document.getElementById('build_signature_weapon');

            if (charData.builds && charData.builds.length > 0) {
                const latestBuild = charData.builds[0]; // Assumes builds are sorted descending by date
                if (talentsSelect) {
                    talentsSelect.value = latestBuild.talents || config.talentOptions[0];
                }
                if (signatureSelect) {
                    signatureSelect.value = latestBuild.signature_weapon || config.signatureOptions[0];
                }
            } else {
                // Set to default if no builds exist
                if (talentsSelect) {
                    talentsSelect.selectedIndex = 0;
                }
                if (signatureSelect) {
                    signatureSelect.selectedIndex = 0;
                }
            }

            // --- NEW MIGRATION LOGIC ---
            // Use a timeout to ensure the DOM is updated with the new inputs
            setTimeout(() => {
                if (window.migrationData && window.migrationData.targetCharName === charName) {
                    prefillBuildFormFromMigration(charData);
                    delete window.migrationData; // Clear it after use
                }
            }, 100);
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
