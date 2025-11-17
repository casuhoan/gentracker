
document.addEventListener('DOMContentLoaded', () => {


    const getKeywordSettings = async () => {
        if (window.keywordSettings === null) {
            console.log("Fetching keyword settings...");
            try {
                const response = await fetch('php/api.php?action=get_keyword_settings');
                const data = await response.json();
                if (data.status === 'success') {
                    window.keywordSettings = data;
                } else {
                    window.keywordSettings = { colors: [], tooltips: [] };
                }
            } catch (e) {
                console.error("Failed to fetch keyword settings:", e);
                window.keywordSettings = { colors: [], tooltips: [] };
            }
        }
        return window.keywordSettings;
    };

    const formatDescription = async (text, itemName, itemType = 'personaggio') => {
        if (!text) {
            if (itemType === 'personaggio') {
                 return `Questo personaggio non ha ancora una descrizione, se vuoi scriverla o farla scrivere invia pure un ticket ai nostri Amministratori con il testo desiderato tramite questo <a href="#submit-ticket/${encodeURIComponent(itemName)}">link</a>.`;
            }
            return `Questa ${itemType} non ha ancora una descrizione.`
        }

        const settings = await getKeywordSettings();
        let formattedText = text;

        if (!settings || (!settings.colors.length && !settings.tooltips.length && !characterLibrary.length)) {
            return text.replace(/\n/g, '<br>');
        }
        
        const replacements = [];

        const charNames = characterLibrary.map(c => c.nome).sort((a, b) => b.length - a.length);
        charNames.forEach(name => {
            const regex = new RegExp(`\\b(${name})\\b`, 'g');
            let match;
            while ((match = regex.exec(text)) !== null) {
                replacements.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    html: `<strong>${match[0]}</strong>`
                });
            }
        });

        if (settings.tooltips) {
            settings.tooltips.forEach(item => {
                const regex = new RegExp(`\\b(${item.keyword})\\b`, 'gi');
                let match;
                while ((match = regex.exec(text)) !== null) {
                    replacements.push({
                        start: match.index,
                        end: match.index + match[0].length,
                        html: `<span class="tooltip-keyword" data-bs-toggle="tooltip" title="${item.description}"><em>${match[0]}</em></span>`
                    });
                }
            });
        }

        if (settings.colors) {
            settings.colors.forEach(item => {
                const regex = new RegExp(`\\b(${item.keyword})\\b`, 'g');
                let match;
                while ((match = regex.exec(text)) !== null) {
                    replacements.push({
                        start: match.index,
                        end: match.index + match[0].length,
                        html: `<span style="color: ${item.color};">${match[0]}</span>`
                    });
                }
            });
        }

        const filteredReplacements = replacements.filter((r1, i1) => {
            return !replacements.some((r2, i2) => {
                if (i1 === i2) return false;
                if (r1.start < r2.end && r1.end > r2.start) {
                    const len1 = r1.end - r1.start;
                    const len2 = r2.end - r2.start;
                    if (len1 < len2) return true;
                    if (len1 === len2 && i1 > i2) return true;
                }
                return false;
            });
        });

        filteredReplacements.sort((a, b) => a.start - b.start);

        let lastIndex = 0;
        let result = '';
        filteredReplacements.forEach(rep => {
            result += text.substring(lastIndex, rep.start);
            result += rep.html;
            lastIndex = rep.end;
        });
        result += text.substring(lastIndex);

        return result.replace(/\n/g, '<br>');
    };

    // --- GRIMOIRE FUNCTIONS ---

    window.initGrimoireControls = () => {
        const elementFiltersContainer = document.getElementById('grimoire-element-filters');
        if (!elementFiltersContainer) return;

        elementFiltersContainer.innerHTML = ''; // Clear previous filters

        elementsData.forEach(element => {
            const elId = `grimoimoire-filter-${createSafeId(element.name)}`;
            const iconPath = element.icon ? `data/icons/elements/${element.icon}` : '';

            const label = document.createElement('label');
            label.className = 'element-filter-label';
            label.setAttribute('for', elId);
            label.title = element.name; // Tooltip with element name

            label.innerHTML = `
                <input class="form-check-input element-filter-checkbox" type="checkbox" value="${element.name}" id="${elId}" checked>
                <img src="${iconPath}" class="element-filter-icon" alt="${element.name}">
            `;
            elementFiltersContainer.appendChild(label);
        });

        document.getElementById('grimoire-name-filter').addEventListener('input', applyGrimoireFiltersAndSorting);
        document.getElementById('grimoire-sort-select').addEventListener('change', applyGrimoireFiltersAndSorting);
        elementFiltersContainer.addEventListener('change', applyGrimoireFiltersAndSorting);
    };

    window.applyGrimoireFiltersAndSorting = () => {
        let filteredCharacters = characterLibrary.filter(char => !char.wip || isAdmin);
        const nameFilter = document.getElementById('grimoire-name-filter').value.toLowerCase();
        if (nameFilter) {
            filteredCharacters = filteredCharacters.filter(char => char.nome.toLowerCase().includes(nameFilter));
        }

        const selectedElements = Array.from(document.querySelectorAll('#grimoire-element-filters input:checked')).map(cb => cb.value);
        if (selectedElements.length > 0) {
            filteredCharacters = filteredCharacters.filter(char => selectedElements.includes(char.elemento));
        }

        const sortValue = document.getElementById('grimoire-sort-select').value;
        const sortFunctions = {
            'nameAsc': (a, b) => a.nome.localeCompare(b.nome),
            'nameDesc': (a, b) => b.nome.localeCompare(a.nome),
            'elementAsc': (a, b) => a.elemento.localeCompare(b.elemento) || a.nome.localeCompare(b.nome),
            'rarityAsc': (a, b) => (a.rarita === '4-star' ? 4 : 5) - (b.rarita === '4-star' ? 4 : 5) || a.nome.localeCompare(b.nome),
            'rarityDesc': (a, b) => (b.rarita === '4-star' ? 4 : 5) - (a.rarita === '4-star' ? 4 : 5) || a.nome.localeCompare(b.nome),
        };
        if (sortFunctions[sortValue]) {
            filteredCharacters.sort(sortFunctions[sortValue]);
        }

        renderGrimoire(filteredCharacters);
    };

    const renderGrimoire = (characters) => {
        const grid = document.getElementById('grimoire-grid');
        if (!grid) return;

        const grimoireView = currentUser.grimoire_view || 'splash';
        grid.classList.remove('grimoire-view-icon', 'grimoire-view-banner', 'grimoire-view-splash');
        grid.classList.add(`grimoire-view-${grimoireView}`);

        grid.innerHTML = '';
        if (characters.length === 0) {
            grid.innerHTML = '<div class="col-12 text-center grimoire-no-results"><p>Nessun personaggio trovato con i filtri attuali.</p></div>';
            return;
        }

        characters.forEach(char => {
            const grimoireView = currentUser.grimoire_view || 'splash';
            let imageUrl = `data/${char.immagine}`;
            if (grimoireView === 'icon') {
                imageUrl = char.icon ? `data/${char.icon}` : 'uploads/default_avatar.png';
            } else if (grimoireView === 'banner') {
                imageUrl = char.banner ? `data/${char.banner}` : 'uploads/default_avatar.png';
            }

            const element = elementsData.find(e => e.name === char.elemento);
            const elementIcon = element ? `data/icons/elements/${element.icon}` : '';

            const card = document.createElement('div');
            card.className = 'col';

            let statusDotHtml = '';
            if ((isAdmin || isModerator) && grimoireView === 'icon') {
                const hasDescription = char.description && char.description.trim() !== '';
                const dotColorClass = hasDescription ? 'dot-green' : 'dot-red';
                statusDotHtml = `<div class="description-status-dot ${dotColorClass}" title="${hasDescription ? 'Descrizione presente' : 'Descrizione assente'}"></div>`;
            }

            card.innerHTML = `
                <a href="#grimoire-character/${encodeURIComponent(char.nome)}" class="text-decoration-none">
                    <div class="grimoire-card">
                        ${statusDotHtml}
                        <img src="${imageUrl}" class="grimoire-card-img" alt="${char.nome}">
                        <img src="${elementIcon}" class="grimoire-card-element" alt="${char.elemento}">
                        <div class="grimoire-card-body">
                            <h5 class="card-title text-center">${char.nome}</h5>
                        </div>
                        <div class="grimoire-card-overlay">
                            <div class="grimoire-overlay-name">${char.nome}</div>
                            <div class="grimoire-overlay-title">${char.titolo || ''}</div>
                        </div>
                    </div>
                </a>
            `;
            grid.appendChild(card);
        });
    };

    window.loadGrimoirePage = () => {
        const nationsTab = document.getElementById('grimoire-nations-tab');
        
        // Carica i personaggi di default
        applyGrimoireFiltersAndSorting();
    
        // Aggiungi l'event listener per il tab delle nazioni
        nationsTab.addEventListener('click', loadNationsPage, { once: true });
    
        applyGrimoireBackground();
    };

    window.loadCharacterDetailPage = async (characterName) => {
        const char = characterLibrary.find(c => c.nome === characterName);
        const detailView = document.getElementById('character-detail-view');

        if (!char || !detailView) {
            location.hash = '#grimoire';
            return;
        }

        const bannerUrl = char.banner ? `data/${char.banner}` : 'https://via.placeholder.com/400x600';
        const iconUrl = char.icon ? `data/${char.icon}` : 'https://via.placeholder.com/128';
        const element = elementsData.find(e => e.name === char.elemento);
        const elementIconUrl = element ? `data/icons/elements/${element.icon}` : '';

        const weapon = weaponsData.find(w => w.name === char.arma);
        const weaponIconUrl = weapon && weapon.icon ? `data/icons/weapons/${weapon.icon}` : '';

        let rarityHtml = '';
        if (char.rarita) {
            const starCount = char.rarita === '5-star' ? 5 : 4;
            for(let i=0; i<starCount; i++) {
                rarityHtml += '<i class="bi bi-star-fill text-warning"></i>';
            }
        }

        const displayDescription = await formatDescription(char.description, characterName);

        detailView.innerHTML = `
            <div class="container-fluid">
                <div class="row mb-3">
                    <div class="col-12 d-flex justify-content-between">
                        <button id="back-to-grimoire" class="btn btn-dark btn-sm"><i class="bi bi-arrow-left"></i> Torna alla Libreria</button>
                        ${isAdmin ? `<button id="edit-library-char-btn" class="btn btn-primary btn-sm"><i class="bi bi-pencil-square"></i> Modifica Personaggio</button>` : ''}
                    </div>
                </div>
                <div class="card shadow-sm">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-4">
                                <img src="${bannerUrl}" class="img-fluid rounded" alt="Banner di ${char.nome}">
                            </div>

                            <div class="col-md-8">
                                <div class="d-flex align-items-center mb-4">
                                    <img src="${iconUrl}" class="rounded-circle me-4" alt="Icona di ${char.nome}" style="width: 100px; height: 100px; border: 4px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                                    <div>
                                        <h2 class="display-5">${char.nome}</h2>
                                        <h4 class="text-muted fw-light">${char.titolo || ''}</h4>
                                    </div>
                                </div>
                                
                                <div class="row border-top pt-3">
                                    <div class="col-6 col-md-4 mb-3">
                                        <h5>Vision/Gnosis</h5>
                                        <p class="d-flex align-items-center"><img src="${elementIconUrl}" style="width: 24px; height: 24px;" class="me-2">${char.elemento || 'N/D'}</p>
                                    </div>
                                    <div class="col-6 col-md-4 mb-3">
                                        <h5>Rarità</h5>
                                        <p>${rarityHtml || 'N/D'}</p>
                                    </div>
                                    <div class="col-12 col-md-4 mb-3">
                                        <h5>Arma</h5>
                                        <p class="d-flex align-items-center"><img src="${weaponIconUrl}" style="width: 24px; height: 24px;" class="me-2">${char.arma || 'N/D'}</p>
                                    </div>
                                </div>

                                <div class="row border-top pt-3">
                                    <div class="col-6 col-md-4 mb-3">
                                        <h5>Nazione</h5>
                                        <p>${char.nazione || 'N/D'}</p>
                                    </div>
                                    <div class="col-6 col-md-4 mb-3">
                                        <h5>Affiliazione</h5>
                                        <p>${char.fazione || 'N/D'}</p>
                                    </div>
                                </div>

                                <div class="mt-2 position-relative">
                                    <h5 class="border-bottom pb-2 mb-3">Descrizione</h5>
                                    <div id="description-display-container">
                                        <p>${displayDescription}</p>
                                    </div>
                                    <div id="description-edit-container" style="display: none;">
                                        <div class="btn-toolbar mb-1" role="toolbar">
                                            <div class="btn-group me-2" role="group">
                                                <button type="button" id="add-title-btn" class="btn btn-outline-secondary btn-sm">Aggiungi titolo</button>
                                            </div>
                                        </div>
                                        <textarea id="description-textarea" class="form-control" rows="8">${char.description || ''}</textarea>
                                        <div class="text-end mt-2">
                                            <button id="cancel-description-edit" class="btn btn-secondary btn-sm">Annulla</button>
                                            <button id="save-description" class="btn btn-primary btn-sm">Salva</button>
                                        </div>
                                    </div>
                                    ${(isAdmin || isModerator) ? `<button id="edit-description-btn" class="btn btn-outline-primary btn-sm" style="position: absolute; top: 0; right: 0;"><i class="bi bi-pencil-fill"></i></button>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        showView('character-detail-view');
        applyGrimoireBackground();

        const tooltipTriggerList = [].slice.call(detailView.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });

        document.getElementById('back-to-grimoire').addEventListener('click', () => {
            location.hash = '#grimoire';
        });

        if (isAdmin) {
            document.getElementById('edit-library-char-btn').addEventListener('click', () => {
                const modalElement = document.getElementById('edit-library-character-modal');
                const modal = new bootstrap.Modal(modalElement);

                // Pre-populate selects
                const elementOptions = elementsData.map(el => ({ name: el.name, value: el.name }));
                const nationOptions = nationsData.map(n => ({ name: n.name, value: n.name }));
                window.populateSelect('edit-library-char-element', elementOptions);
                window.populateSelect('edit-library-char-nazione', nationOptions);

                // Populate common fields
                document.getElementById('edit-library-original-name').value = char.nome;
                document.getElementById('edit-library-char-name').value = char.nome;
                document.getElementById('edit-library-char-title').value = char.titolo;
                document.getElementById('edit-library-char-element').value = char.elemento;
                document.getElementById('edit-library-char-weapon').value = char.arma;
                document.getElementById('edit-library-char-nazione').value = char.nazione;
                document.getElementById('edit-library-char-fazione').value = char.fazione;

                // Populate radio buttons for rarity
                const rarity5 = document.getElementById('edit-lib-rarity-5');
                const rarity4 = document.getElementById('edit-lib-rarity-4');
                if (char.rarita === '5-star') {
                    rarity5.checked = true;
                } else {
                    rarity4.checked = true;
                }

                // Populate WIP checkbox
                document.getElementById('edit-library-char-wip').checked = char.wip;

                // Populate images
                document.getElementById('edit-library-current-icon').src = char.icon ? `data/${char.icon}` : '';
                document.getElementById('edit-library-current-banner').src = char.banner ? `data/${char.banner}` : '';
                document.getElementById('edit-library-current-image').src = char.splashart ? `data/${char.splashart}` : '';

                modal.show();
            });
        }

        if (isAdmin || isModerator) {
            const editBtn = document.getElementById('edit-description-btn');
            const saveBtn = document.getElementById('save-description');
            const cancelBtn = document.getElementById('cancel-description-edit');
            const displayContainer = document.getElementById('description-display-container');
            const editContainer = document.getElementById('description-edit-container');
            const addTitleBtn = document.getElementById('add-title-btn');

            if (addTitleBtn) {
                addTitleBtn.addEventListener('click', () => {
                    const textarea = document.getElementById('description-textarea');
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const text = textarea.value;
                    const tag = '<span style="font-size: calc(1em + 3px);"></span>';
                    textarea.value = text.substring(0, start) + tag + text.substring(end);
                    const cursorPos = start + 42; // Position cursor inside the span
                    textarea.selectionStart = cursorPos;
                    textarea.selectionEnd = cursorPos;
                    textarea.focus();
                });
            }

            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    displayContainer.style.display = 'none';
                    editContainer.style.display = 'block';
                    editBtn.style.display = 'none';
                });
            }

            cancelBtn.addEventListener('click', () => {
                displayContainer.style.display = 'block';
                editContainer.style.display = 'none';
                if (editBtn) editBtn.style.display = 'block';
            });

            saveBtn.addEventListener('click', async () => {
                const newDescription = document.getElementById('description-textarea').value;
                
                const formData = new FormData();
                formData.append('action', 'update_character_description');
                formData.append('character_name', characterName);
                formData.append('description', newDescription);

                try {
                    const response = await fetch('php/api.php', { method: 'POST', body: formData });
                    const result = await response.json();

                    if (result.status === 'success') {
                        showToast('Descrizione salvata!');
                        char.description = newDescription;
                        const formatted = await formatDescription(newDescription, characterName);
                        displayContainer.querySelector('p').innerHTML = formatted;
                        cancelBtn.click();
                    } else {
                        showErrorAlert(result.message || 'Errore nel salvataggio della descrizione.');
                    }
                } catch (error) {
                    showErrorAlert('Errore di comunicazione con il server.');
                }
            });
        }
    };

    window.applyGrimoireBackground = () => {
        const body = document.body;
        if (grimoireBackground && grimoireBackground !== 'none') {
            document.documentElement.style.setProperty('--grimoire-background', `url(data/backgrounds/${grimoireBackground})`);
            body.classList.add('grimoire-background');
        } else {
            document.documentElement.style.removeProperty('--grimoire-background');
            body.classList.remove('grimoire-background');
        }
    };
    
    // --- NATION FUNCTIONS ---

    const renderNations = (nations) => {
        const grid = document.getElementById('nations-grid');
        if (!grid) return;

        grid.innerHTML = '';
        if (nations.length === 0) {
            grid.innerHTML = '<div class="col-12 text-center"><p>Nessuna nazione trovata.</p></div>';
            return;
        }

        nations.forEach(nation => {
            const card = document.createElement('div');
            card.className = 'col';
            const imageUrl = nation.image ? `data/${nation.image}` : `https://via.placeholder.com/300x200?text=${nation.name}`;

            card.innerHTML = `
                <a href="#grimoire-nation/${encodeURIComponent(nation.name)}" class="text-decoration-none">
                    <div class="card h-100 nation-card">
                        <img src="${imageUrl}" class="card-img-top" alt="${nation.name}">
                        <div class="card-body">
                            <h5 class="card-title text-center">${nation.name}</h5>
                        </div>
                    </div>
                </a>
            `;
            grid.appendChild(card);
        });
    };

    window.loadNationsPage = async () => {
        // La variabile 'nationsData' dovrebbe essere già stata caricata e disponibile globalmente
        if (window.nationsData) {
            renderNations(window.nationsData);
        } else {
            console.error("Dati delle nazioni non trovati.");
        }
    };

    window.loadNationDetailPage = async (nationName) => {
        const nation = window.nationsData.find(n => n.name === nationName);
        const detailView = document.getElementById('character-detail-view');

        if (!nation || !detailView) {
            location.hash = '#grimoire';
            return;
        }

        // 1. Prepara tutti i dati in anticipo
        const rawDescription = nation.description || '';
        const words = rawDescription.split(' ');
        const half = Math.ceil(words.length / 2);
        const firstHalf = words.slice(0, half).join(' ');
        const secondHalf = words.slice(half).join(' ');

        const formattedDesc1 = await formatDescription(firstHalf, nation.name, 'nazione');
        const formattedDesc2 = await formatDescription(secondHalf, nation.name, 'nazione');

        const imageUrl = nation.image ? `data/${nation.image}` : '';
        const imageUrl2 = nation.image2 ? `data/${nation.image2}` : '';

        // 2. Costruisci l'intera stringa HTML
        const fullHtml = `
            <div class="container-fluid">
                <div class="row mb-3">
                    <div class="col-6">
                        <button id="back-to-grimoire" class="btn btn-dark btn-sm"><i class="bi bi-arrow-left"></i> Torna alla Libreria</button>
                    </div>
                    <div class="col-6 text-end">
                        ${isAdmin ? `
                            <button id="edit-nation-btn" class="btn btn-primary btn-sm"><i class="bi bi-pencil-fill"></i> Modifica Nazione</button>
                            <button id="save-nation-btn" class="btn btn-success btn-sm d-none"><i class="bi bi-save"></i> Salva</button>
                            <button id="cancel-nation-btn" class="btn btn-secondary btn-sm d-none"><i class="bi bi-x-lg"></i> Annulla</button>
                        ` : ''}
                    </div>
                </div>
                <form id="edit-nation-form">
                    <div class="card shadow-sm">
                        <div class="card-body">
                            <h2 class="display-5">${nation.name}</h2>
                            <hr>
                            <div class="nation-detail-content">
                                <div class="display-view">
                                    <div class="clearfix mb-4">
                                        ${imageUrl ? `<img src="${imageUrl}" class="img-fluid rounded float-start me-4 mb-3" style="max-width: 450px;">` : ''}
                                        <p>${formattedDesc1}</p>
                                    </div>
                                    <hr class="my-4">
                                    <div class="clearfix mt-4">
                                        ${imageUrl2 ? `<img src="${imageUrl2}" class="img-fluid rounded float-end ms-4 mb-3" style="max-width: 400px;">` : ''}
                                        <p>${formattedDesc2}</p>
                                    </div>
                                </div>
                                <div class="edit-view d-none">
                                    <div class="mb-3">
                                        <label class="form-label">Descrizione</label>
                                        <textarea name="description" class="form-control" rows="10">${nation.description || ''}</textarea>
                                    </div>
                                    <div class="row">
                                        <div class="col-md-6">
                                            <label class="form-label">Immagine Principale</label>
                                            <input type="file" name="image" class="form-control">
                                            ${imageUrl ? `<img src="${imageUrl}" class="img-fluid rounded mt-2" style="max-height: 150px;">` : ''}
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Immagine Secondaria</label>
                                            <input type="file" name="image2" class="form-control">
                                            ${imageUrl2 ? `<img src="${imageUrl2}" class="img-fluid rounded mt-2" style="max-height: 150px;">` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        `;

        // 3. Inserisci l'HTML nel DOM
        detailView.innerHTML = fullHtml;

        // 4. Mostra la vista
        showView('character-detail-view');
        applyGrimoireBackground();

        // 5. Inizializza i tooltip
        const tooltipTriggerList = [].slice.call(detailView.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });

        // 6. Aggiungi gli event listener
        document.getElementById('back-to-grimoire').addEventListener('click', () => {
            location.hash = '#grimoire';
            const nationsTab = document.getElementById('grimoire-nations-tab');
            if (nationsTab) new bootstrap.Tab(nationsTab).show();
        });

        if (isAdmin) {
            document.getElementById('edit-nation-btn').addEventListener('click', () => toggleEditMode(true));
            document.getElementById('cancel-nation-btn').addEventListener('click', () => toggleEditMode(false));
            document.getElementById('save-nation-btn').addEventListener('click', saveChanges);
        }

        // Funzioni helper
        const toggleEditMode = (isEditing) => {
            detailView.querySelector('.display-view').classList.toggle('d-none', isEditing);
            detailView.querySelector('.edit-view').classList.toggle('d-none', !isEditing);
            document.getElementById('edit-nation-btn').classList.toggle('d-none', isEditing);
            document.getElementById('save-nation-btn').classList.toggle('d-none', !isEditing);
            document.getElementById('cancel-nation-btn').classList.toggle('d-none', !isEditing);
        };

        const saveChanges = async () => {
            const form = document.getElementById('edit-nation-form');
            const formData = new FormData(form);
            formData.append('action', 'update_nation_details');
            formData.append('name', nationName);

            try {
                const response = await fetch('php/api.php', { method: 'POST', body: formData });
                const result = await response.json();

                if (result.status === 'success') {
                    showToast('Dettagli nazione aggiornati!');
                    const nationsResponse = await fetch('php/api.php?action=get_nations');
                    window.nationsData = await nationsResponse.json();
                    location.reload();
                } else {
                    showErrorAlert(result.message || 'Errore durante l\'aggiornamento.');
                }
            } catch (error) {
                showErrorAlert('Errore di comunicazione con il server.');
            }
        };
    };
});
