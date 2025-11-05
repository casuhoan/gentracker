
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

        const render = async () => {
            const bannerUrl = char.banner ? `data/${char.banner}` : 'https://via.placeholder.com/400x600';
            const iconUrl = char.icon ? `data/${char.icon}` : 'https://via.placeholder.com/128';
            const element = elementsData.find(e => e.name === char.elemento);
            const elementIconUrl = element ? `data/icons/elements/${element.icon}` : '';
            const weapon = weaponsData.find(w => w.name === char.arma);
            const weaponIconUrl = weapon && weapon.icon ? `data/icons/weapons/${weapon.icon}` : '';

            let rarityHtml = '';
            if (char.rarita) {
                const starCount = char.rarita === '5-star' ? 5 : 4;
                for (let i = 0; i < starCount; i++) {
                    rarityHtml += '<i class="bi bi-star-fill text-warning"></i>';
                }
            }

            const displayDescription = await formatDescription(char.description, characterName);

            // Options for select
            const elementOptions = elementsData.map(e => `<option value="${e.name}" ${e.name === char.elemento ? 'selected' : ''}>${e.name}</option>`).join('');
            const weaponOptions = weaponsData.map(w => `<option value="${w.name}" ${w.name === char.arma ? 'selected' : ''}>${w.name}</option>`).join('');
            const nationOptions = nationsData.map(n => `<option value="${n.name}" ${n.name === char.nazione ? 'selected' : ''}>${n.name}</option>`).join('');
            const rarityOptions = ['5-star', '4-star'].map(r => `<option value="${r}" ${r === char.rarita ? 'selected' : ''}>${r}</option>`).join('');

            detailView.innerHTML = `
                <div class="container-fluid">
                    <div class="row mb-3">
                        <div class="col-6">
                            <button id="back-to-grimoire" class="btn btn-dark btn-sm"><i class="bi bi-arrow-left"></i> Torna alla Libreria</button>
                        </div>
                        <div class="col-6 text-end">
                            ${isAdmin ? `
                                <button id="edit-char-btn" class="btn btn-primary btn-sm"><i class="bi bi-pencil-fill"></i> Modifica Personaggio</button>
                                <button id="save-char-btn" class="btn btn-success btn-sm d-none"><i class="bi bi-save"></i> Salva Modifiche</button>
                                <button id="cancel-char-btn" class="btn btn-secondary btn-sm d-none"><i class="bi bi-x-lg"></i> Annulla</button>
                            ` : ''}
                        </div>
                    </div>
                    <form id="edit-char-form">
                        <div class="card shadow-sm">
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-4">
                                        <div class="display-view">
                                            <img src="${bannerUrl}" class="img-fluid rounded" alt="Banner di ${char.nome}">
                                        </div>
                                        <div class="edit-view d-none">
                                            <label class="form-label">Banner attuale</label>
                                            <img src="${bannerUrl}" class="img-fluid rounded mt-2" style="max-height: 200px;">
                                        </div>
                                    </div>

                                    <div class="col-md-8">
                                        <div class="d-flex align-items-center mb-4">
                                            <div class="display-view me-4">
                                                <img src="${iconUrl}" class="rounded-circle" alt="Icona di ${char.nome}" style="width: 100px; height: 100px; border: 4px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                                            </div>
                                            <div class="edit-view d-none me-4">
                                                <label class="form-label">Icona attuale</label>
                                                <img src="${iconUrl}" class="rounded-circle mt-2" style="width: 80px; height: 80px;">
                                            </div>
                                            <div>
                                                <div class="display-view">
                                                    <h2 class="display-5">${char.nome}</h2>
                                                    <h4 class="text-muted fw-light">${char.titolo || ''}</h4>
                                                </div>
                                                <div class="edit-view d-none">
                                                    <div class="mb-2">
                                                        <label class="form-label">Nome</label>
                                                        <input type="text" class="form-control" name="name" value="${char.nome}">
                                                    </div>
                                                    <div>
                                                        <label class="form-label">Titolo</label>
                                                        <input type="text" class="form-control" name="title" value="${char.titolo || ''}">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="row border-top pt-3">
                                            <div class="col-6 col-md-4 mb-3">
                                                <h5>Elemento</h5>
                                                <div class="display-view">
                                                    <p class="d-flex align-items-center"><img src="${elementIconUrl}" style="width: 24px; height: 24px;" class="me-2">${char.elemento || 'N/D'}</p>
                                                </div>
                                                <div class="edit-view d-none">
                                                    <select class="form-select" name="element">${elementOptions}</select>
                                                </div>
                                            </div>
                                            <div class="col-6 col-md-4 mb-3">
                                                <h5>Rarità</h5>
                                                <div class="display-view"><p>${rarityHtml || 'N/D'}</p></div>
                                                <div class="edit-view d-none">
                                                    <select class="form-select" name="rarity">${rarityOptions}</select>
                                                </div>
                                            </div>
                                            <div class="col-12 col-md-4 mb-3">
                                                <h5>Arma</h5>
                                                <div class="display-view">
                                                    <p class="d-flex align-items-center"><img src="${weaponIconUrl}" style="width: 24px; height: 24px;" class="me-2">${char.arma || 'N/D'}</p>
                                                </div>
                                                <div class="edit-view d-none">
                                                    <select class="form-select" name="weapon">${weaponOptions}</select>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="row border-top pt-3">
                                            <div class="col-6 col-md-4 mb-3">
                                                <h5>Nazione</h5>
                                                <div class="display-view"><p>${char.nazione || 'N/D'}</p></div>
                                                <div class="edit-view d-none">
                                                    <select class="form-select" name="nazione">${nationOptions}</select>
                                                </div>
                                            </div>
                                            <div class="col-6 col-md-4 mb-3">
                                                <h5>Fazione/Tribe</h5>
                                                <div class="display-view"><p>${char.fazione || 'N/D'}</p></div>
                                                <div class="edit-view d-none">
                                                    <input type="text" class="form-control" name="fazione" value="${char.fazione || ''}">
                                                </div>
                                            </div>
                                            <div class="col-6 col-md-4 mb-3 align-self-center">
                                                <div class="edit-view d-none">
                                                    <div class="form-check form-switch">
                                                        <input class="form-check-input" type="checkbox" role="switch" id="char-wip-switch" name="wip" ${char.wip ? 'checked' : ''}>
                                                        <label class="form-check-label" for="char-wip-switch">WIP</label>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>

                                        <div class="mt-4 position-relative">
                                            <h5 class="border-bottom pb-2 mb-3">Descrizione</h5>
                                            <div class="display-view">
                                                <p>${displayDescription}</p>
                                            </div>
                                            <div class="edit-view d-none">
                                                <textarea name="description" class="form-control" rows="8">${char.description || ''}</textarea>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            `;

            attachEventListeners();
        };

        const attachEventListeners = () => {
            document.getElementById('back-to-grimoire').addEventListener('click', () => {
                location.hash = '#grimoire';
            });

            if (isAdmin) {
                const editBtn = document.getElementById('edit-char-btn');
                const saveBtn = document.getElementById('save-char-btn');
                const cancelBtn = document.getElementById('cancel-char-btn');

                editBtn.addEventListener('click', () => toggleEditMode(true));
                cancelBtn.addEventListener('click', () => toggleEditMode(false));
                saveBtn.addEventListener('click', saveChanges);
            }
        };

        const toggleEditMode = (isEditing) => {
            detailView.querySelectorAll('.display-view').forEach(el => el.classList.toggle('d-none', isEditing));
            detailView.querySelectorAll('.edit-view').forEach(el => el.classList.toggle('d-none', !isEditing));
            
            document.getElementById('edit-char-btn').classList.toggle('d-none', isEditing);
            document.getElementById('save-char-btn').classList.toggle('d-none', !isEditing);
            document.getElementById('cancel-char-btn').classList.toggle('d-none', !isEditing);
        };

        const saveChanges = async () => {
            const form = document.getElementById('edit-char-form');
            const formData = new FormData(form);
            formData.append('action', 'update_library_character');
            formData.append('original_name', characterName);

            // Aggiungi il campo WIP se la checkbox è selezionata
            const wipCheckbox = form.querySelector('[name="wip"]');
            if (wipCheckbox && wipCheckbox.checked) {
                formData.append('wip', 'on');
            }

            try {
                const response = await fetch('php/api.php', { method: 'POST', body: formData });
                const result = await response.json();

                if (result.status === 'success') {
                    showToast('Personaggio aggiornato con successo!');
                    // Ricarica i dati della libreria e la pagina
                    const [charLibResponse] = await Promise.all([
                        fetch('data/characters_list.json?v=' + new Date().getTime()),
                    ]);
                    characterLibrary = await charLibResponse.json();
                    const newName = formData.get('name');
                    location.hash = `#grimoire-character/${encodeURIComponent(newName)}`;
                } else {
                    showErrorAlert(result.message || 'Errore durante l\'aggiornamento.');
                }
            } catch (error) {
                console.error('Save error:', error);
                showErrorAlert('Errore di comunicazione con il server.');
            }
        };

        render();
        showView('character-detail-view');
        applyGrimoireBackground();
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

        // Filtra le nazioni direttamente qui
        const visibleNations = nations.filter(nation => !nation.hidden);

        grid.innerHTML = '';
        if (visibleNations.length === 0) {
            grid.innerHTML = '<div class="col-12 text-center"><p>Nessuna nazione trovata.</p></div>';
            return;
        }

        visibleNations.forEach(nation => {
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
        try {
            const response = await fetch('php/api.php?action=get_nations');
            const nations = await response.json();
            renderNations(nations);
        } catch (error) {
            console.error("Dati delle nazioni non trovati.", error);
            showErrorAlert('Impossibile caricare i dati delle nazioni.');
        }
    };

    window.loadNationDetailPage = async (nationName) => {
        const nation = window.nationsData.find(n => n.name === nationName);
        const detailView = document.getElementById('character-detail-view');

        if (!nation || !detailView) {
            location.hash = '#grimoire';
            return;
        }

        const render = async () => {
            const imageUrl = nation.image ? `data/${nation.image}` : '';
            const imageUrl2 = nation.image2 ? `data/${nation.image2}` : '';
            const displayDescription = await formatDescription(nation.description, nation.name, 'nazione');

            detailView.innerHTML = `
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
                                            <p id="description-part-1"></p>
                                        </div>
                                        
                                        <div class="clearfix mt-4">
                                            ${imageUrl2 ? `<img src="${imageUrl2}" class="img-fluid rounded float-end ms-4 mb-3" style="max-width: 400px;">` : ''}
                                            <p id="description-part-2"></p>
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

            // Split and inject description
            const descriptionContainer1 = document.getElementById('description-part-1');
            const descriptionContainer2 = document.getElementById('description-part-2');
            if (descriptionContainer1 && descriptionContainer2) {
                const words = displayDescription.split(' ');
                const half = Math.ceil(words.length / 2);
                const firstHalf = words.slice(0, half).join(' ');
                const secondHalf = words.slice(half).join(' ');
                descriptionContainer1.innerHTML = firstHalf;
                descriptionContainer2.innerHTML = secondHalf;
            }

            attachEventListeners();
        };

        const attachEventListeners = () => {
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
        };

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
                    // Ricarica dati e vista
                    const nationsResponse = await fetch('php/api.php?action=get_nations');
                    window.nationsData = await nationsResponse.json();
                    location.reload(); // Simple reload to show changes
                } else {
                    showErrorAlert(result.message || 'Errore durante l\'aggiornamento.');
                }
            } catch (error) {
                showErrorAlert('Errore di comunicazione con il server.');
            }
        };

        render();
        showView('character-detail-view');
        applyGrimoireBackground();
    };
});
