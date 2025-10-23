
document.addEventListener('DOMContentLoaded', () => {

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
        let filteredCharacters = [...characterLibrary];
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

        grid.innerHTML = '';
        if (characters.length === 0) {
            grid.innerHTML = '<div class="col-12 text-center"><p>Nessun personaggio trovato con i filtri attuali.</p></div>';
            return;
        }

        characters.forEach(char => {
            const element = elementsData.find(e => e.name === char.elemento);
            const elementIcon = element ? `data/icons/elements/${element.icon}` : '';

            const card = document.createElement('div');
            card.className = 'col';
            card.innerHTML = `
                <a href="#grimoire-character/${encodeURIComponent(char.nome)}" class="text-decoration-none">
                    <div class="grimoire-card">
                        <img src="data/${char.immagine}" class="grimoire-card-img" alt="${char.nome}">
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

    window.loadCharacterDetailPage = (characterName) => {
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

        let rarityHtml = '';
        if (char.rarita) {
            const starCount = char.rarita === '5-star' ? 5 : 4;
            for(let i=0; i<starCount; i++) {
                rarityHtml += '<i class="bi bi-star-fill text-warning"></i>';
            }
        }

        // Convert newlines in description to <br> for display
        const displayDescription = char.description ? char.description.replace(/\n/g, '<br>') : 'Nessuna descrizione disponibile.';

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
                            <!-- Colonna Sinistra per Banner -->
                            <div class="col-md-4">
                                <img src="${bannerUrl}" class="img-fluid rounded" alt="Banner di ${char.nome}">
                            </div>

                            <!-- Colonna Destra per Dettagli -->
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
                                        <p>${char.arma || 'N/D'}</p>
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
                        // Update local data to avoid full reload
                        char.description = newDescription;
                        displayContainer.querySelector('p').innerHTML = newDescription.replace(/\n/g, '<br>');
                        // Toggle back to display mode
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
