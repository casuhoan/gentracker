document.addEventListener('DOMContentLoaded', () => {
    const inventoryContainer = document.getElementById('inventory-view');
    const characterDetailContainer = document.getElementById('inventory-character-detail-view');
    let fullInventoryData = null;

    // --- Local Data Scope for Inventory ---
    let characterIdMap = {};
    let inventoryCharacterMap = {};
    let backgrounds = [];
    let enkaStatMap = {};
    let siteSettings = {};
    let isDataInitialized = false;

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

    // Restored self-contained data initialization function
    const initData = async () => {
        if (isDataInitialized) return;
        try {
            const [idMapRes, bgRes, enkaStatRes, settingsRes, invCharMapRes] = await Promise.all([
                fetch('inventory/character_id_map.json'),
                fetch('php/api.php?action=get_backgrounds'),
                fetch('inventory/en_stat_map.json'),
                fetch('php/api.php?action=get_settings'),
                fetch('inventory/inventory_character_map.json')
            ]);

            if (!idMapRes.ok) throw new Error('Impossibile caricare character_id_map.json');
            characterIdMap = (await idMapRes.json()).reduce((acc, item) => { acc[item.id] = item.name; return acc; }, {});
            
            if (bgRes.ok) backgrounds = (await bgRes.json()).backgrounds || [];
            if (enkaStatRes.ok) enkaStatMap = await enkaStatRes.json();
            if (settingsRes.ok) siteSettings = await settingsRes.json();
            if (invCharMapRes.ok) inventoryCharacterMap = await invCharMapRes.json();

            isDataInitialized = true;
        } catch (error) {
            console.error("Errore critico durante l\'inizializzazione dei dati dell\'inventario:", error);
            inventoryContainer.innerHTML = `<div class=\"alert alert-danger\">Errore critico: ${error.message}</div>`;
        }
    };
    
    const setInventoryBackground = () => {
        const specificBg = siteSettings?.inventory_background;
        let bgImage = '';

        if (specificBg && specificBg !== "") {
            bgImage = `data/backgrounds/${specificBg}`;
        } else if (backgrounds && backgrounds.length > 0) {
            const randomBg = backgrounds[Math.floor(Math.random() * backgrounds.length)];
            bgImage = `data/backgrounds/${randomBg}`;
        }

        if (bgImage) {
            document.documentElement.style.setProperty('--gallery-background', `url('${bgImage}')`);
            document.body.classList.add('body-has-background');
        }
    };

    const loadInventoryPage = async () => {
        await initData();
        if (!isDataInitialized) return;

        if (!currentUser) {
            inventoryContainer.innerHTML = '<p>Per favore, effettua il login per vedere l\'inventario.</p>';
            return;
        }
        if (currentUser.genshin_uid) {
            await displayInventory(currentUser.genshin_uid);
        } else {
            displayUidForm();
        }
    };

    const displayUidForm = () => {
        inventoryContainer.innerHTML = `
            <div class="row justify-content-center"><div class="col-md-8 col-lg-6"><div class="card"><div class="card-body">
                <h5 class="card-title">Imposta il tuo UID</h5>
                <p class="card-text text-muted">Per visualizzare il tuo inventario di Genshin Impact, abbiamo bisogno del tuo User ID (UID).</p>
                <form id="uid-form">
                    <div class="input-group mb-3">
                        <span class="input-group-text">UID</span>
                        <input type="text" class="form-control" id="uid-input" placeholder="Es. 718119017" required pattern="[0-9]{9}">
                        <button class="btn btn-primary" type="submit">Salva e Carica</button>
                    </div>
                    <div class="form-text">L\'UID è un numero di 9 cifre che trovi in basso a destra nel gioco.</div>
                </form>
            </div></div></div></div>`;
        document.getElementById('uid-form').addEventListener('submit', handleUidFormSubmit);
    };

    const handleUidFormSubmit = async (e) => {
        e.preventDefault();
        const uid = document.getElementById('uid-input').value.trim();
        if (!uid) return;

        const formData = new FormData();
        formData.append('action', 'save_genshin_uid');
        formData.append('genshin_uid', uid);

        try {
            const response = await fetch('php/api.php', { method: 'POST', body: formData });
            const result = await response.json();
            if (result.status === 'success') {
                showToast('UID salvato con successo!');
                currentUser.genshin_uid = uid;
                await displayInventory(uid);
            } else {
                showErrorAlert(result.message || 'Errore durante il salvataggio.');
            }
        } catch (error) {
            showErrorAlert('Errore di comunicazione con il server.');
        }
    };

    const fetchInventoryData = async (uid) => {
        try {
            const response = await fetch(`php/api.php?action=getInventory&uid=${uid}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                let msg = `Errore ${response.status}: Impossibile caricare i dati.`;
                if (errorData?.message) msg = errorData.message;
                else if (response.status === 404) msg = `Errore 404: UID non trovato o vetrina vuota.`;
                throw new Error(msg);
            }
            fullInventoryData = await response.json();
            return fullInventoryData;
        } catch (error) {
            inventoryContainer.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
            return null;
        }
    };

    const displayInventory = async (uid) => {
        inventoryContainer.innerHTML = `<div class="text-center"><h2>Inventario UID: ${uid}</h2><p>Caricamento...</p><div class="spinner-border"></div></div>`;
        const data = await fetchInventoryData(uid);
        if (data) {
            renderInventoryUI(data);
        }
    };

    const renderInventoryUI = (data) => {
        setInventoryBackground();
        const { playerInfo, avatarInfoList = [] } = data;
        avatarInfoList.sort((a, b) => (b.propMap['4001']?.val || 0) - (a.propMap['4001']?.val || 0));

        let html = `
            <div class="card mb-4"><div class="card-header d-flex justify-content-between align-items-center"><h3>Profilo Giocatore</h3><button id="change-uid-btn" class="btn btn-sm btn-outline-secondary">Cambia UID</button></div><div class="card-body"><p><strong>Nickname:</strong> ${playerInfo.nickname}</p><p><strong>AR:</strong> ${playerInfo.level}</p><p><strong>Descrizione:</strong> ${playerInfo.signature || 'N/A'}</p></div></div>
            <hr class="my-4"><h3>I tuoi Personaggi</h3>
            <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4" id="inventory-character-grid">
`;

        avatarInfoList.forEach(apiChar => {
            const localCharName = inventoryCharacterMap ? inventoryCharacterMap[apiChar.avatarId] : null;
            const libChar = localCharName ? window.characterLibrary.find(c => c.nome === localCharName) : null;

            const name = libChar ? libChar.nome : (characterIdMap[apiChar.avatarId] || `ID: ${apiChar.avatarId}`);
            const cardImage = libChar && libChar.banner ? `data/${libChar.banner}` : 'uploads/default_avatar.png';
            const level = apiChar.propMap['4001']?.val || 'N/A';
            const rarity = libChar ? libChar.rarita : '5-star';
            const constellation = apiChar.talentIdList ? apiChar.talentIdList.length : 0;

            let rarityStars = '';
            const starCount = rarity === '5-star' ? 5 : 4;
            for (let i = 0; i < starCount; i++) rarityStars += '<i class="bi bi-star-fill"></i>';

            html += `
                <div class="col">
                    <a href="#inventory-character/${apiChar.avatarId}" class="text-decoration-none">
                        <div class="gallery-card-new gallery-card-link" data-char-name="${encodeURIComponent(name)}">
                            <div class="gallery-card-new-background" style="background-image: url('${cardImage}')"></div>
                            <div class="gallery-card-new-overlay"></div>
                            <div class="gallery-card-new-content">
                                <div class="gallery-card-new-header"><div class="gallery-card-new-rarity">${rarityStars}</div></div>
                                <div class="gallery-card-new-body"><h5 class="gallery-card-new-name">${name}</h5></div>
                                <div class="gallery-card-new-footer">
                                    <div class="gallery-card-new-constellation">C${constellation}</div>
                                    <div class="gallery-card-new-date">Lv. ${level}</div>
                                </div>
                            </div>
                        </div>
                    </a>
                </div>`;
        });

        html += `</div>`;
        inventoryContainer.innerHTML = html;
        document.getElementById('change-uid-btn').addEventListener('click', () => displayUidForm());
    };

    const getStatName = (statKey) => {
        if (enkaStatMap && enkaStatMap[statKey] && enkaStatMap[statKey].name) {
            return enkaStatMap[statKey].name;
        }
        return statKey;
    }

    const formatStatValue = (key, value) => {
        const statInfo = enkaStatMap ? enkaStatMap[key] : null;
        if (statInfo && statInfo.percent) {
             return `${(value * 100).toFixed(1)}%`;
        }
        return Math.round(value);
    };

    const renderStats = (fightPropMap) => {
        let statsHtml = '<div class="row">';
        const orderedStatIds = { "HP": "2000", "ATK": "2001", "DEF": "2002", "Energy Recharge": "23", "Elemental Mastery": "28", "CRIT Rate": "20", "CRIT DMG": "22" };

        for (const statName in orderedStatIds) {
            const numericKey = orderedStatIds[statName];
            const stringKey = FIGHT_PROP_ID_MAP[numericKey];
            const value = fightPropMap[numericKey] || 0;
            if (stringKey) {
                statsHtml += `
                    <div class="col-12 col-md-6 d-flex justify-content-between align-items-center stat-row">
                        <span>${getStatName(stringKey)}</span>
                        <strong>${formatStatValue(stringKey, value)}</strong>
                    </div>`;
            }
        }
        return statsHtml + '</div>';
    };

    const renderEquip = (equipList) => {
        if (!equipList) return '<p>Nessun equipaggiamento trovato.</p>';
        
        const weapon = equipList.find(e => e.flat.itemType === 'ITEM_WEAPON');
        const artifacts = equipList.filter(e => e.flat.itemType === 'ITEM_RELIQUARY');
        
        let html = '<h4>Arma</h4>';
        if (weapon) {
            const mainStat = weapon.flat.weaponStats[0];
            const subStat = weapon.flat.weaponStats[1];
            html += `<div class="card equip-item-card p-2">`;
            if (mainStat) html += `<div>${getStatName(mainStat.appendPropId)}: <strong>${Math.round(mainStat.statValue)}</strong></div>`;
            if (subStat) html += `<div class="small text-muted">${getStatName(subStat.appendPropId)}: ${formatStatValue(subStat.appendPropId, subStat.statValue)}</div>`;
            html += `</div>`;
        } else { 
            html += '<p>Nessuna arma equipaggiata.</p>'; 
        } 
        
        html += '<h4 class="mt-4">Artefatti</h4>';
        if (artifacts.length > 0) {
            html += '<div class="row g-2">';
            const slotMap = { 'EQUIP_BRACER': 'Flower', 'EQUIP_NECKLACE': 'Plume', 'EQUIP_SHOES': 'Sands', 'EQUIP_RING': 'Goblet', 'EQUIP_DRESS': 'Circlet' };
            const artifactSlots = ['Flower', 'Plume', 'Sands', 'Goblet', 'Circlet'];
            const equippedArtifacts = {};
            artifacts.forEach(art => {
                const slotKey = slotMap[art.flat.equipType];
                if (slotKey) equippedArtifacts[slotKey] = art;
            });

            artifactSlots.forEach(slotKey => {
                const art = equippedArtifacts[slotKey];
                html += `<div class="col-12 col-md-6">`;
                if (art) {
                    const mainStatKey = art.flat.reliquaryMainstat.mainPropId;
                    const mainStatValue = art.flat.reliquaryMainstat.statValue;
                    let substatsHtml = '<ul class="list-unstyled list-inside small text-muted">';
                    if (art.flat.reliquarySubstats) {
                        art.flat.reliquarySubstats.forEach(substat => {
                            substatsHtml += `<li>${getStatName(substat.appendPropId)}: ${formatStatValue(substat.appendPropId, substat.statValue)}</li>`;
                        });
                    }
                    substatsHtml += '</ul>';
                    html += `<div class="card equip-item-card p-2 h-100"><strong>${getStatName(mainStatKey)}: ${formatStatValue(mainStatKey, mainStatValue)}</strong>${substatsHtml}</div>`;
                } else {
                    html += `<div class="card equip-item-card p-2 h-100 d-flex align-items-center justify-content-center"><span class="text-muted small">Slot ${slotKey} vuoto</span></div>`;
                }
                html += `</div>`;
            });
            html += '</div>';
        } else { 
            html += '<p>Nessun artefatto equipaggiato.</p>'; 
        } 
        return html;
    };

    const renderCharacterDetail = (charData) => {
        const localCharName = inventoryCharacterMap ? inventoryCharacterMap[charData.avatarId] : null;
        const libChar = localCharName ? window.characterLibrary.find(c => c.nome === localCharName) : null;

        const name = libChar ? libChar.nome : (characterIdMap[charData.avatarId] || `ID: ${charData.avatarId}`);
        const bannerImage = libChar && libChar.banner ? `data/${libChar.banner}` : 'uploads/default_avatar.png';
        const characterLink = libChar ? `#grimoire-character/${encodeURIComponent(libChar.nome)}` : '#';

        const level = charData.propMap['4001']?.val || 'N/A';
        const friendship = charData.fetterInfo?.expLevel || 0;

        setInventoryBackground();
        let html = `
            <div class="container-fluid inventory-detail-container">
                <button onclick="window.history.back()" class="btn btn-light mb-3">&larr; Torna all\'Inventario</button>
                <div class="row">
                    <div class="col-lg-5 text-center">
                        <a href="${characterLink}"><img src="${bannerImage}" class="img-fluid character-splash" alt="${name}" onerror="this.onerror=null;this.src='uploads/default_avatar.png';"></a>
                    </div>
                    <div class="col-lg-7">
                        <div class="d-flex align-items-center mb-2">
                            <h1 class="mb-0 me-3 inventory-detail-header-text">${name}</h1>
                            <span class="badge bg-primary fs-5 inventory-detail-header-text">Lv. ${level}</span>
                        </div>
                        <p class="inventory-detail-header-text">Livello Amicizia: ${friendship}</p>
                        <div class="card bg-dark text-white mb-3"><div class="card-header"><h4>Statistiche</h4></div><div class="card-body">${renderStats(charData.fightPropMap)}</div></div>
                        <div class="card bg-dark text-white"><div class="card-header"><h4>Equipaggiamento</h4></div><div class="card-body">${renderEquip(charData.equipList)}</div></div>
                    </div>
                </div>
            </div>`;
        characterDetailContainer.innerHTML = html;
    };

    const loadInventoryCharacterPage = async (avatarId) => {
        showView('inventory-character-detail-view');
        await initData();
        if (!isDataInitialized) return;
        
        let dataToRender = fullInventoryData;
        if (!dataToRender) {
            if (!currentUser?.genshin_uid) {
                characterDetailContainer.innerHTML = `<div class="alert alert-warning">UID non impostato. Vai all\'<a href="#inventory">inventario</a> per configurarlo.</div>`;
                return;
            }
            characterDetailContainer.innerHTML = `<div class="text-center"><p>Caricamento dati inventario...</p><div class="spinner-border"></div></div>`;
            dataToRender = await fetchInventoryData(currentUser.genshin_uid);
            if (!dataToRender) return; 
        }

        const charData = dataToRender.avatarInfoList.find(c => c.avatarId == avatarId);
        if (!charData) {
            characterDetailContainer.innerHTML = `<div class="alert alert-danger">Personaggio ID ${avatarId} non trovato.</div>`;
            return;
        }
        renderCharacterDetail(charData);
    };

    window.loadInventoryPage = loadInventoryPage;
    window.loadInventoryCharacterPage = loadInventoryCharacterPage;
});