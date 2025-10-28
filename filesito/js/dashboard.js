
document.addEventListener('DOMContentLoaded', () => {
    console.log('dashboard.js loaded.');

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
        const signatureWeaponText = build.signature_weapon === 'Sì' ? 'Best in the slot' : build.signature_weapon;
        html += `<li class="list-group-item d-flex justify-content-between align-items-center">Signature <strong class="${getStatusColorClass('signature_weapon', signatureWeaponText)}">${signatureWeaponText}</strong></li>`;
        html += '</ul>';
        html += `<div class="text-center mt-3"><button class="btn btn-sm btn-info show-build-score-info-btn" data-build-display-id="${displayId}" data-build-index="${buildIndex}">Dettagli Score</button></div>`;
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

    const displayBuildScoreInfoModal = (details, talentsValue) => {
        const modalBody = document.getElementById('build-score-info-body');
        if (!modalBody) return;

        let html = `
            <p>Il Build Score finale di <strong>${currentCharacterData.profile.name}</strong> è <strong>${details.finalScore.toFixed(2)}%</strong>.</p>
            <hr>
            <h5>1. Punteggio Base (Statistiche Principali)</h5>
            <p>Media delle percentuali di raggiungimento delle statistiche ideali (cappate al 100%).</p>
            <table class="table table-striped table-bordered">
                <thead>
                    <tr>
                        <th>Statistica</th>
                        <th>Ideale</th>
                        <th>Attuale</th>
                        <th>% Raggiunta (max 100%)</th>
                    </tr>
                </thead>
                <tbody>
        `;
        details.statsBreakdown.forEach(item => {
            html += `
                <tr>
                    <td>${item.stat}</td>
                    <td>${item.ideal}</td>
                    <td>${item.actual}</td>
                    <td>${(item.cappedRatio * 100).toFixed(2)}%</td>
                </tr>
            `;
        });
        html += `
                </tbody>
                <tfoot>
                    <tr>
                        <th colspan="3" class="text-end">Punteggio Base Medio:</th>
                        <th>${details.baseScore.toFixed(2)}%</th>
                    </tr>
                </tfoot>
            </table>
            <hr>
            <h5>2. Bonus per Eccesso Statistiche</h5>
            <p>Somma delle percentuali in eccesso per le statistiche che superano il valore ideale.</p>
        `;

        if (details.excessStats.length > 0) {
            html += `
                <table class="table table-striped table-bordered">
                    <thead>
                        <tr>
                            <th>Statistica</th>
                            <th>% di Eccesso</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            details.excessStats.forEach(item => {
                html += `
                    <tr>
                        <td>${item.stat}</td>
                        <td>${item.excessPercentage.toFixed(2)}%</td>
                    </tr>
                `;
            });
            html += `
                    </tbody>
                    <tfoot>
                        <tr>
                            <th class="text-end">Totale Eccesso:</th>
                            <th>${details.excessStats.reduce((sum, item) => sum + item.excessPercentage, 0).toFixed(2)}%</th>
                        </tr>
                    </tfoot>
                </table>
            `;
        } else {
            html += '<p>Nessuna statistica ha superato il valore ideale.</p>';
        }

        html += `
            <p>In base al totale eccesso, viene aggiunto un bonus al punteggio:</p>
            <ul>
                <li>> 100%: +4%</li>
                <li>> 75%: +3%</li>
                <li>> 50%: +2%</li>
                <li>> 25%: +1%</li>
            </ul>
            <p>Bonus applicato: <strong>+${details.bonusScore}%</strong></p>
            <hr>
            <h5>3. Modificatori Aggiuntivi (Costellazione e Arma Signature)</h5>
            <p>I modificatori vengono applicati in base alla rarità del personaggio (${details.modifierBreakdown.rarity}).</p>
            <table class="table table-striped table-bordered">
                <thead>
                    <tr>
                        <th>Parametro</th>
                        <th>Valore</th>
                        <th>Modificatore</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Costellazione</td>
                        <td>C${details.modifierBreakdown.constellation}</td>
                        <td>${details.modifierBreakdown.constellationModifier}%</td>
                    </tr>
                    <tr>
                        <td>Arma Signature</td>
                        <td>${details.modifierBreakdown.signatureWeapon}</td>
                        <td>${details.modifierBreakdown.signatureWeaponModifier}%</td>
                    </tr>
                    <tr>
                        <td>Talenti</td>
                        <td>${talentsValue}</td>
                        <td>${details.modifierBreakdown.talentModifier}%</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <th colspan="2" class="text-end">Totale Modificatori:</th>
                        <th>${details.futureModifiers}%</th>
                    </tr>
                </tfoot>
            </table>
            <p class="mt-3"><strong>Dettaglio Modificatori:</strong></p>
        `;

        if (details.modifierBreakdown.rarity === '4-star') {
            html += `
                <ul>
                    <li>**Personaggi 4 Stelle:**</li>
                    <ul>
                        <li>Costellazione C0-C2: **-2%**</li>
                        <li>Costellazione C3-C4: **-1%**</li>
                        <li>Costellazione C5-C6: **+0%**</li>
                        <li>Arma Signature "4 Stelle": **-1%**</li>
                        <li>Arma Signature "Buona": **+0%**</li>
                        <li>Arma Signature "Best in the slot": **+1%**</li>
                    </ul>
                </ul>
            `;
        } else if (details.modifierBreakdown.rarity === '5-star') {
            html += `
                <ul>
                    <li>**Personaggi 5 Stelle:**</li>
                    <ul>
                        <li>Costellazione C0-C1: **+0%**</li>
                        <li>Costellazione C2-C5: **+1%**</li>
                        <li>Costellazione C6: **+5%**</li>
                        <li>Arma Signature "4 Stelle" o "Buona": **+0%**</li>
                        <li>Arma Signature "Best in the slot": **+1%**</li>
                    </ul>
                </ul>
            `;
        }

        html += `
            <hr>
            <h5>Calcolo Finale</h5>
            <p>Punteggio Base (${details.baseScore.toFixed(2)}%) + Bonus Eccesso (${details.bonusScore}%) + Modificatori (${details.futureModifiers}%) + Modificatore Talenti (${details.modifierBreakdown.talentModifier}%) = <strong>${details.finalScore.toFixed(2)}%</strong></p>
        `;


        modalBody.innerHTML = html;
        const modal = new bootstrap.Modal(document.getElementById('build-score-info-modal'));
        modal.show();
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

    // New delegated event listener for the Build Score Info buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('show-build-score-info-btn')) {
            const buildIndex = parseInt(e.target.dataset.buildIndex);

            if (currentCharacterData && currentCharacterData.builds[buildIndex]) {
                const selectedBuild = currentCharacterData.builds[buildIndex];
                
                // Create a temporary profile object for calculateBuildScore
                const tempProfile = {
                    ...currentCharacterData.profile, // Copy existing profile data
                    latest_build_stats: selectedBuild.stats,
                    constellation: selectedBuild.constellation, // Use build's constellation
                    signature_weapon: selectedBuild.signature_weapon, // Use build's signature weapon
                    talents: selectedBuild.talents // Use build's talents
                };
                
                console.log('Build score button clicked.');
                console.log('window.calculateBuildScore is type:', typeof window.calculateBuildScore);
                // Calculate score and GET details using the global function from gallery.js
                const { score, details } = window.calculateBuildScore(tempProfile);
                
                displayBuildScoreInfoModal(details, tempProfile.talents);
            } else {
                showErrorAlert('Dettagli del Build Score non disponibili per la build selezionata.');
            }
        }
    });
});
