
document.addEventListener('DOMContentLoaded', () => {

    // --- DASHBOARD FUNCTIONS ---

    window.loadDashboard = (charData) => {
        currentCharacterData = charData;
        
        const element = elementsData.find(e => e.name === charData.profile.element);
        const elementIconHtml = element && element.icon ? `<img src="data/icons/elements/${element.icon}" style="height: 32px; margin-right: 10px;" alt="${charData.profile.element}">` : '';

        document.getElementById('dashboard-title').innerHTML = `${elementIconHtml}Confronto Build: ${charData.profile.name}`;
        
        const buildOptions = charData.builds.map((build, index) => ({ name: `Build del ${build.date} (Build #${charData.builds.length - index})`, value: index }));
        populateSelect('compare-select-1', buildOptions);
        populateSelect('compare-select-2', buildOptions);
        if (buildOptions.length > 0) {
            document.getElementById('compare-select-2').value = 0;
            document.getElementById('compare-select-1').value = buildOptions.length > 1 ? 1 : 0;
        }
        displayBuild(2, 0);
        displayBuild(1, buildOptions.length > 1 ? 1 : -1);
        displayIdealStats();
        showView('dashboard-view');

        document.getElementById('character-info-btn').addEventListener('click', () => {
            // Find the base character name from the library to ensure the link works even with nicknames
            const baseChar = characterLibrary.find(c => charData.profile.name.includes(c.nome));
            if (baseChar) {
                location.hash = `#grimoire-character/${encodeURIComponent(baseChar.nome)}`;
            }
        });
    };

    const displayBuild = (displayId, buildIndex) => {
        const container = document.getElementById(`build-display-${displayId}`);
        if (buildIndex < 0 || !currentCharacterData.builds[buildIndex]) { container.innerHTML = '<p class="text-muted">Nessuna build selezionata.</p>'; return; }
        const build = currentCharacterData.builds[buildIndex];
        const rarity = currentCharacterData.profile.rarity;
        let html = '<ul class="list-group list-group-flush">';
        for (const stat of currentCharacterData.profile.tracked_stats) {
            const value = build.stats[stat] || 'N/D';
            html += `<li class="list-group-item d-flex justify-content-between align-items-center">${stat} <strong class="${getStatColorForIdeal(stat, value)}">${value}</strong></li>`;
        }
        html += '</ul><hr class="my-3">';
        html += '<ul class="list-group list-group-flush">';
        html += `<li class="list-group-item d-flex justify-content-between align-items-center">Costellazione <strong class="${getStatusColorClass('constellation', build.constellation, rarity)}">${build.constellation}</strong></li>`;
        html += `<li class="list-group-item d-flex justify-content-between align-items-center">Signature <strong class="${getStatusColorClass('signature_weapon', build.signature_weapon)}">${build.signature_weapon}</strong></li>`;
        html += `<li class="list-group-item d-flex justify-content-between align-items-center">Talenti <strong class="${getStatusColorClass('talents', build.talents)}">${build.talents}</strong></li>`;
        html += '</ul>';
        container.innerHTML = html;
    };

    const displayIdealStats = () => {
        const container = document.getElementById('ideal-stats-display');
        const idealStats = currentCharacterData.profile.ideal_stats;
        if (Object.keys(idealStats).length === 0) { container.innerHTML = '<p class="text-muted">Nessuna statistica ideale impostata.</p>'; return; }
        let html = '<ul class="list-group list-group-flush">';
        for (const [stat, value] of Object.entries(idealStats)) { html += `<li class="list-group-item d-flex justify-content-between align-items-center">${stat} <strong>${value}</strong></li>`; }
        html += '</ul>';
        container.innerHTML = html;
    };

    const compareSelect1 = document.getElementById('compare-select-1');
    if(compareSelect1) {
        compareSelect1.addEventListener('change', () => {
            displayBuild(1, compareSelect1.value);
        });
    }

    const compareSelect2 = document.getElementById('compare-select-2');
    if(compareSelect2) {
        compareSelect2.addEventListener('change', () => {
            displayBuild(2, compareSelect2.value);
        });
    }

    if (document.getElementById('back-to-gallery-btn')) {
        document.getElementById('back-to-gallery-btn').addEventListener('click', (e) => { e.preventDefault(); location.hash = '#'; });
    }
});
