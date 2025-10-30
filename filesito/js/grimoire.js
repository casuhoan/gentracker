
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

    const formatDescription = async (text, characterName) => {
        if (!text) {
            const charName = characterName || '';
            return `Questo personaggio non ha ancora una descrizione, se vuoi scriverla o farla scrivere invia pure un ticket ai nostri Amministratori con il testo desiderato tramite questo <a href="#submit-ticket/${encodeURIComponent(charName)}">link</a>.`;
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
            const elId = `grimoire-filter-${createSafeId(element.name)}`;
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
            card.innerHTML = `
                <a href="#grimoire-character/${encodeURIComponent(char.nome)}" class="text-decoration-none">
                    <div class="grimoire-card">
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
        applyGrimoireFiltersAndSorting();
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
                    <div class="col-12">
                        <button id="back-to-grimoire" class="btn btn-dark btn-sm"><i class="bi bi-arrow-left"></i> Torna alla Libreria</button>
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
                                        <h5>Elemento</h5>
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
                                        <h5>Fazione/Tribe</h5>
                                        <p>${char.fazione || 'N/D'}</p>
                                    </div>
                                </div>

                                <div class="mt-4 position-relative">
                                    <h5 class="border-bottom pb-2 mb-3">Descrizione</h5>
                                    <div id="description-display-container">
                                        <p>${displayDescription}</p>
                                    </div>
                                    <div id="description-edit-container" style="display: none;">
                                        <textarea id="description-textarea" class="form-control" rows="8">${char.description || ''}</textarea>
                                        <div class="text-end mt-2">
                                            <button id="cancel-description-edit" class="btn btn-secondary btn-sm">Annulla</button>
                                            <button id="save-description" class="btn btn-primary btn-sm">Salva</button>
                                        </div>
                                    </div>
                                    ${isAdmin ? '<button id="edit-description-btn" class="btn btn-outline-primary btn-sm" style="position: absolute; top: 0; right: 0;"><i class="bi bi-pencil-fill"></i></button>' : ''}
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
            const editBtn = document.getElementById('edit-description-btn');
            const saveBtn = document.getElementById('save-description');
            const cancelBtn = document.getElementById('cancel-description-edit');
            const displayContainer = document.getElementById('description-display-container');
            const editContainer = document.getElementById('description-edit-container');

            editBtn.addEventListener('click', () => {
                displayContainer.style.display = 'none';
                editContainer.style.display = 'block';
                editBtn.style.display = 'none';
            });

            cancelBtn.addEventListener('click', () => {
                displayContainer.style.display = 'block';
                editContainer.style.display = 'none';
                editBtn.style.display = 'block';
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
});
