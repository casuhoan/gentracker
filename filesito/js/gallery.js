
document.addEventListener('DOMContentLoaded', () => {

    // --- GALLERY FUNCTIONS ---

    window.initGalleryControls = () => {
        const elementFiltersContainer = document.getElementById('element-filters');
        if (!elementFiltersContainer) return;

        elementFiltersContainer.innerHTML = ''; // Clear previous filters

        elementsData.forEach(element => {
            const elId = `filter-${createSafeId(element.name)}`;
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

        document.getElementById('name-filter').addEventListener('input', applyFiltersAndSorting);
        document.getElementById('sort-select').addEventListener('change', applyFiltersAndSorting);
        elementFiltersContainer.addEventListener('change', applyFiltersAndSorting);
    };

    window.applyFiltersAndSorting = () => {
        let filteredCharacters = [...sourceCharacterData];
        const nameFilterInput = document.getElementById('name-filter');
        if (nameFilterInput) {
            const nameFilter = nameFilterInput.value.toLowerCase();
            if (nameFilter) {
                filteredCharacters = filteredCharacters.filter(char => char.profile.name.toLowerCase().includes(nameFilter));
            }
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
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            const sortValue = sortSelect.value;
            const sortFunctions = {
                'nameAsc': (a, b) => a.profile.name.localeCompare(b.profile.name),
                'nameDesc': (a, b) => b.profile.name.localeCompare(a.profile.name),
                'constAsc': (a, b) => (a.profile.latest_constellation || 0) - (b.profile.latest_constellation || 0) || a.profile.name.localeCompare(b.profile.name),
                'constDesc': (a, b) => (b.profile.latest_constellation || 0) - (a.profile.latest_constellation || 0) || a.profile.name.localeCompare(b.profile.name),
                'rarityAsc': (a, b) => (a.profile.rarity === '4-star' ? 4 : 5) - (b.profile.rarity === '4-star' ? 4 : 5) || a.profile.name.localeCompare(b.profile.name),
                'rarityDesc': (a, b) => (b.profile.rarity === '4-star' ? 4 : 5) - (a.profile.rarity === '4-star' ? 4 : 5) || a.profile.name.localeCompare(b.profile.name),
                'buildAsc': (a, b) => a.buildScore - b.buildScore || a.profile.name.localeCompare(b.profile.name),
                'buildDesc': (a, b) => b.buildScore - a.buildScore || a.profile.name.localeCompare(b.profile.name),
                'elementAsc': (a, b) => a.profile.element.localeCompare(b.profile.element) || a.profile.name.localeCompare(b.profile.name),
            };
            if (sortFunctions[sortValue]) filteredCharacters.sort(sortFunctions[sortValue]);
        }
        renderGallery(filteredCharacters);
    };

    const renderGallery = (characters) => {
        const galleryGrid = document.getElementById('gallery-grid');
        if (!galleryGrid) return;
        galleryGrid.innerHTML = '';
        if (characters.length === 0) {
            galleryGrid.innerHTML = `
                <div class="col-12 d-flex flex-column justify-content-center align-items-center" style="min-height: 300px;">
                    <p class="text-center w-100">Nessun personaggio trovato.</p>
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
                    <div class="custom-card gallery-card">
                        ${hoverStatsHtml}
                        <div class="card-constellation ${constellationColorClass}">C${char.latest_constellation || 0}</div>
                        <img src="${char.splashart || 'uploads/default_avatar.png'}" class="card-img-top" alt="${char.name}" style="height: 250px; object-fit: contain;">
                        <div class="card-body"><h5 class="card-title">${char.name}</h5>${rolesHtml}</div>
                        <div class="card-acquisition-date">${formattedDate}</div>
                        <a href="#character/${encodeURIComponent(char.name)}" class="stretched-link"></a>
                    </div>
                </div>`;
        });
    };

    window.initGallerySettings = async () => {
        const settingsToggleBtn = document.getElementById('gallery-settings-toggle-btn');
        const settingsPanel = document.getElementById('gallery-settings-panel');
        const enableBackgroundSwitch = document.getElementById('gallery-enable-background-switch');
        const backgroundOptionsContainer = document.getElementById('gallery-background-options');
        const backgroundSelectorGrid = document.getElementById('gallery-background-selector-grid');
        const galleryEnableCardOpacitySwitch = document.getElementById('gallery-enable-card-opacity-switch');

        if (!settingsToggleBtn || !settingsPanel || !enableBackgroundSwitch || !backgroundOptionsContainer || !backgroundSelectorGrid || !galleryEnableCardOpacitySwitch) return;

        settingsToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
        });

        document.addEventListener('click', (e) => {
            if (!settingsPanel.contains(e.target) && e.target !== settingsToggleBtn) {
                settingsPanel.style.display = 'none';
            }
        });

        const response = await fetch('php/api.php?action=get_backgrounds');
        const data = await response.json();
        if (data.status === 'success') {
            backgroundSelectorGrid.innerHTML = '';
            data.backgrounds.forEach(bg => {
                const itemWrapper = document.createElement('div');
                itemWrapper.className = 'col';
                itemWrapper.innerHTML = `
                    <div class="background-item" data-bg="${bg}">
                        <img src="data/backgrounds/${bg}" class="img-thumbnail">
                        <div class="background-item-overlay">
                            <i class="bi bi-eye-fill preview-icon"></i>
                        </div>
                    </div>
                `;
                backgroundSelectorGrid.appendChild(itemWrapper);
            });
        }

        enableBackgroundSwitch.addEventListener('change', async () => {
            const isEnabled = enableBackgroundSwitch.checked;
            backgroundOptionsContainer.style.display = isEnabled ? 'block' : 'none';

            let newBackgroundValue = currentUser.background;
            if (!isEnabled) {
                newBackgroundValue = 'disattivato';
            } else {
                if (currentUser.background === 'disattivato' || !currentUser.background) {
                    const backgroundsResponse = await fetch('php/api.php?action=get_backgrounds');
                    const backgroundsData = await backgroundsResponse.json();
                    if (backgroundsData.status === 'success' && backgroundsData.backgrounds.length > 0) {
                        newBackgroundValue = backgroundsData.backgrounds[0];
                    } else {
                        showToast('Nessuno sfondo disponibile. Carica uno sfondo o disattiva l\'opzione.');
                        enableBackgroundSwitch.checked = false;
                        backgroundOptionsContainer.style.display = 'none';
                        return;
                    }
                }
            }

            const formData = new FormData();
            formData.append('action', 'update_user');
            formData.append('original_username', currentUser.username);
            formData.append('username', currentUser.username);
            formData.append('background', newBackgroundValue);

            try {
                const updateResponse = await fetch('php/api.php', { method: 'POST', body: formData });
                const updateResult = await updateResponse.json();
                if (updateResult.status === 'success') {
                    currentUser.background = newBackgroundValue;
                    updateAppearanceUI();
                } else {
                    showErrorAlert(updateResult.message);
                    enableBackgroundSwitch.checked = !isEnabled;
                    backgroundOptionsContainer.style.display = isEnabled ? 'none' : 'block';
                }
            } catch (error) {
                showErrorAlert('Errore di comunicazione con il server.');
                enableBackgroundSwitch.checked = !isEnabled;
                backgroundOptionsContainer.style.display = isEnabled ? 'none' : 'block';
            }
        });

        backgroundSelectorGrid.addEventListener('click', async (e) => {
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

            const formData = new FormData();
            formData.append('action', 'update_user');
            formData.append('original_username', currentUser.username);
            formData.append('username', currentUser.username);
            formData.append('background', bg);
            const updateResponse = await fetch('php/api.php', { method: 'POST', body: formData });
            const updateResult = await updateResponse.json();
            if (updateResult.status === 'success') {
                currentUser.background = bg;
                updateAppearanceUI();
            }
        });

        galleryEnableCardOpacitySwitch.addEventListener('change', async () => {
            const isEnabled = galleryEnableCardOpacitySwitch.checked;
            const newOpacityValue = isEnabled ? 'yes' : 'no';

            const formData = new FormData();
            formData.append('action', 'update_user');
            formData.append('original_username', currentUser.username);
            formData.append('username', currentUser.username);
            formData.append('opacity', newOpacityValue);

            try {
                const updateResponse = await fetch('php/api.php', { method: 'POST', body: formData });
                const updateResult = await updateResponse.json();
                if (updateResult.status === 'success') {
                    currentUser.card_opacity = (newOpacityValue === 'yes' ? 'on' : 'off');
                    updateAppearanceUI();
                } else {
                    showErrorAlert(updateResult.message);
                    galleryEnableCardOpacitySwitch.checked = !isEnabled;
                }
            } catch (error) {
                showErrorAlert('Errore di comunicazione con il server.');
                galleryEnableCardOpacitySwitch.checked = !isEnabled;
            }
        });

        updateAppearanceUI();
    };
});
