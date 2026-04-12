let lasers = [], modules = [], gadgets = [];
let gadgetOptionsHtml = "";
let modOptionsHtml = "";
let importMode = ""; 

let laserOptionsS1 = ""; 
let laserOptionsS2 = ""; 
let laserOptionsGolem = ""; 

const tooltipEl = document.createElement('div');
tooltipEl.className = 'item-preview-tooltip';
document.body.appendChild(tooltipEl);

document.addEventListener('mousemove', (e) => {
    if (tooltipEl.style.display === 'block') {
        tooltipEl.style.left = (e.clientX + 15) + 'px';
        tooltipEl.style.top = (e.clientY + 15) + 'px';
    }
});

window.showStatTip = (type) => {
    if (type === 'window') {
        tooltipEl.innerHTML = `<h4>Mining Limit</h4><div style="font-size:0.9em; line-height:1.4;">Regardless of how many modifiers you stack, the Optimal Charge Window is hard-capped at 50% of the total Window in-game.</div>`;
        tooltipEl.style.display = 'block';
    }
}

window.showPreview = (index, type) => {
    let item = type === 'laser' ? lasers[index] : (type === 'module' ? modules[index] : gadgets[index]);
    tooltipEl.innerHTML = `<h4>${item.name}</h4>${formatStatPreview(item, type)}`;
    tooltipEl.style.display = 'block';
}
window.hidePreview = () => tooltipEl.style.display = 'none';

function formatStatPreview(item, type) {
    if (!item || item.name === "None") return `<div style="color:var(--text-muted);">No modifiers</div>`;
    let html = '';
    const addStat = (label, val, suffix, inv = false, base = false) => {
        if (!val) return;
        let d = parseFloat(val).toFixed(1).replace('.0','');
        if (!base && val > 0) d = '+' + d;
        let c = base ? '' : ((val > 0 ? !inv : inv) ? 'style="color:var(--good-stat);"' : 'style="color:var(--bad-stat);"');
        html += `<div class="preview-stat-row"><span class="preview-label">${label}</span><span ${c}>${d}${suffix}</span></div>`;
    };
    if (type === 'laser') {
        html += `<div class="preview-stat-row"><span class="preview-label">Power</span><span>${Math.round(item.powerMin)}-${Math.round(item.powerMax)}</span></div>`;
        addStat('Module Slots', item.slots, '', false, true);
        addStat('Extraction', item.extraction, '', false, true);
    } else if (type === 'module') {
        addStat('Uses', item.uses, '', false, true);
        addStat('Power', item.power, '%');
        addStat('Extraction', item.extraction, '%');
    }
    addStat('Inert Filter', item.inert, '%', true);
    addStat('Resistance', item.resistance, '%', true);
    addStat('Instability', item.instability, '%', true);
    addStat('Opt. Window', item.optimalWin, '%');
    addStat('Opt. Charge', item.optCharge, '%');
    addStat('Overcharge', item.overcharge, '%', true);
    addStat('Shatter', item.shatter, '%', true);
    addStat('Cluster', item.cluster, '%');
    return html;
}

function safeFloat(v, d=0) { if (!v) return d; let f = parseFloat(v.toString().replace(/[% ,]/g, '')); return isNaN(f) ? d : f; }

async function loadData() {
    try {
        const [lR, mR, gR] = await Promise.all([fetch('UEX - mining-laser-heads.json'), fetch('UEX - mining-modules.json'), fetch('UEX - gadgets.json')]);
        const rL = await lR.json(), rM = await mR.json(), rG = await gR.json();

        lasers.push({ name: "None", slots: 0, powerMin: 0, powerMax: 0, extraction: 0 });
        rL.forEach(l => {
            let pm = l['Mining Laser Power'] || '', pmin = 0, pmax = 0;
            if (pm.includes('-')) { pmin = safeFloat(pm.split('-')[0]); pmax = safeFloat(pm.split('-')[1]); }
            else { pmax = safeFloat(pm); pmin = pmax * (safeFloat(l['Throttle min'])/100); }
            lasers.push({
                name: `${l.Item} (S${l.Size})`, slots: safeFloat(l['Module Slots']), powerMin: pmin, powerMax: pmax, extraction: safeFloat(l['Extraction Laser Power'] || l['Extraction Throughput']),
                inert: safeFloat(l['Inert Material Level']), resistance: safeFloat(l['Resistance']), instability: safeFloat(l['Laser Instability'] || l.Instability), 
                optimalWin: safeFloat(l['Optimal Charge Window Size']), optCharge: safeFloat(l['Optimal Charge Window Rate']), overcharge: safeFloat(l['Catastrophic Charge Rate']), 
                shatter: safeFloat(l['Shatter Damage']), optRange: safeFloat(l['Optimal Range']), maxRange: safeFloat(l['Maximum Range']), size: safeFloat(l.Size)
            });
        });

        modules.push({ name: "None", power: 0, extraction: 0, uses: 0 });
        rM.forEach(m => {
            let u = safeFloat(m.Uses);
            modules.push({
                name: `${m.Item} ${u > 0 ? '(Active)' : '(Passive)'}`, power: safeFloat(m['Mining Laser Power'], 100)-100, extraction: safeFloat(m['Extraction Laser Power'], 100)-100, 
                uses: u, inert: safeFloat(m['Inert Material Level']), resistance: safeFloat(m['Resistance']), instability: safeFloat(m['Laser Instability']), 
                optimalWin: safeFloat(m['Optimal Charge Window Size']), optCharge: safeFloat(m['Optimal Charge Rate']), overcharge: safeFloat(m['Catastrophic Charge Rate']), shatter: safeFloat(m['Shatter Damage'])
            });
        });

        gadgets.push({ name: "None" });
        rG.forEach(g => {
            gadgets.push({
                name: g.Item, inert: safeFloat(g['Inert Material Level']), resistance: safeFloat(g['Resistance']), instability: safeFloat(g['Laser Instability'] || g.Instability), 
                optimalWin: safeFloat(g['Optimal Charge Window Size']), optCharge: safeFloat(g['Optimal Charge Window Rate']), overcharge: safeFloat(g['Catastrophic Charge Rate']), 
                shatter: safeFloat(g['Shatter Damage']), cluster: safeFloat(g['Cluster Modifier'])
            });
        });

        document.getElementById('loading').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        initUI();
    } catch (e) { console.error(e); }
}

// --- FLEET BUILDER ENGINE ---

function initUI() {
    laserOptionsS1 = `<div class="cs-option" data-val="0" onclick="selectCSOption(event, this, 'laser')">None</div>`;
    laserOptionsS2 = `<div class="cs-option" data-val="0" onclick="selectCSOption(event, this, 'laser')">None</div>`;
    laserOptionsGolem = `<div class="cs-option" data-val="0" onclick="selectCSOption(event, this, 'laser')">None</div>`;
    
    // Size 2 Lasers (MOLE)
    let f2 = lasers.map((l, i) => ({l, i})).filter(o => o.l.size === 2 && o.l.name !== "None");
    if(f2.length) laserOptionsS2 += `<div class="cs-optgroup">Size 2 Lasers</div>` + f2.map(o => `<div class="cs-option" data-val="${o.i}" onmouseenter="showPreview(${o.i}, 'laser')" onmouseleave="hidePreview()" onclick="selectCSOption(event, this, 'laser')">${o.l.name}</div>`).join('');

    // Size 1 Lasers (Prospector) - Explicitly excludes the Pitman
    let f1 = lasers.map((l, i) => ({l, i})).filter(o => o.l.size === 1 && o.l.name !== "None" && !o.l.name.toLowerCase().includes("pitman"));
    if(f1.length) laserOptionsS1 += `<div class="cs-optgroup">Size 1 Lasers</div>` + f1.map(o => `<div class="cs-option" data-val="${o.i}" onmouseenter="showPreview(${o.i}, 'laser')" onmouseleave="hidePreview()" onclick="selectCSOption(event, this, 'laser')">${o.l.name}</div>`).join('');

    // Dedicated Golem Laser (Only grabs the Pitman)
    let fGolem = lasers.map((l, i) => ({l, i})).filter(o => o.l.name.toLowerCase().includes("pitman"));
    if(fGolem.length) laserOptionsGolem += `<div class="cs-optgroup">Drake Golem</div>` + fGolem.map(o => `<div class="cs-option" data-val="${o.i}" onmouseenter="showPreview(${o.i}, 'laser')" onmouseleave="hidePreview()" onclick="selectCSOption(event, this, 'laser')">${o.l.name}</div>`).join('');

    modOptionsHtml = `<div class="cs-option" data-val="0" onclick="selectCSOption(event, this, 'module')">None</div>`;
    let actives = modules.map((m, i) => ({m, i})).filter(o => o.m.uses > 0);
    let passives = modules.map((m, i) => ({m, i})).filter(o => o.m.uses === 0 && o.m.name !== "None");
    if (actives.length) { modOptionsHtml += `<div class="cs-optgroup">Active Modules</div>`; actives.forEach(o => modOptionsHtml += `<div class="cs-option" data-val="${o.i}" onmouseenter="showPreview(${o.i}, 'module')" onmouseleave="hidePreview()" onclick="selectCSOption(event, this, 'module')">${o.m.name}</div>`); }
    if (passives.length) { modOptionsHtml += `<div class="cs-optgroup">Passive Modules</div>`; passives.forEach(o => modOptionsHtml += `<div class="cs-option" data-val="${o.i}" onmouseenter="showPreview(${o.i}, 'module')" onmouseleave="hidePreview()" onclick="selectCSOption(event, this, 'module')">${o.m.name}</div>`); }

    gadgetOptionsHtml = gadgets.map((g, i) => `<div class="cs-option" data-val="${i}" onmouseenter="showPreview(${i}, 'gadget')" onmouseleave="hidePreview()" onclick="selectCSOption(event, this, 'gadget')">${g.name}</div>`).join('');

    addShip('MOLE');
}

function generateId() { return Math.random().toString(36).substr(2, 9); }

function createOperatorHtml(opId, seatName, laserOptions) {
    return `
        <div class="setup-card" id="card-${opId}" data-opid="${opId}">
            <div class="card-header">
                <h3>${seatName}</h3>
                <label class="switch"><input type="checkbox" checked onchange="toggleOperator('${opId}', this.checked)"><span class="slider"></span></label>
            </div>
            <div class="form-group"><label>Laser Head</label><div class="custom-select" id="cs-laser-${opId}" data-value="0" onclick="toggleCS(this)"><div class="cs-display">None</div><div class="cs-options">${laserOptions}</div></div></div>
            ${[1,2,3].map(m => `<div class="form-group"><label>Module ${m}</label><div class="custom-select disabled" id="cs-mod${m}-${opId}" data-value="0" onclick="toggleCS(this)"><div class="cs-display">None</div><div class="cs-options">${modOptionsHtml}</div></div></div>`).join('')}
            <div class="operator-results">
                <div class="local-stat"><span class="label">Local Ext.</span><span class="value" id="op-ext-${opId}">0.0</span></div>
                <div class="local-stat"><span class="label">Local Inert</span><span class="value" id="op-inert-${opId}">0%</span></div>
                <div class="local-stat"><span class="label">Opt. Range</span><span class="value" id="op-optrange-${opId}">0m</span></div>
                <div class="local-stat"><span class="label">Max Range</span><span class="value" id="op-maxrange-${opId}">0m</span></div>
            </div>
        </div>`;
}

function addShip(type, loadConfig = null, customName = null) {
    const container = document.getElementById('fleet-container');
    const shipId = generateId();
    const shipDiv = document.createElement('div');
    shipDiv.className = 'ship-container';
    shipDiv.id = `ship-${shipId}`;
    shipDiv.dataset.type = type;

    if (type === 'MOLE') { shipDiv.style.order = '1'; } 
    else if (type === 'PROSPECTOR') { shipDiv.style.order = '2'; } 
    else if (type === 'GOLEM') { shipDiv.style.order = '3'; }

    let headerIcon = type === 'MOLE' ? '🟧' : (type === 'PROSPECTOR' ? '🟦' : '🟨');
    let displayName = customName ? escapeHTML(customName) : type;
    
    let operatorsHtml = "";
    let operatorIds = [];

    if (type === 'MOLE') {
        let seats = ['Center Seat', 'Port Seat', 'Starboard Seat'];
        seats.forEach(seat => {
            let opId = generateId();
            operatorIds.push(opId);
            operatorsHtml += createOperatorHtml(opId, seat, laserOptionsS2);
        });
    } else if (type === 'PROSPECTOR') {
        let opId = generateId();
        operatorIds.push(opId);
        operatorsHtml += createOperatorHtml(opId, 'Pilot Seat', laserOptionsS1);
    } else if (type === 'GOLEM') {
        let opId = generateId();
        operatorIds.push(opId);
        operatorsHtml += createOperatorHtml(opId, 'Pilot Seat', laserOptionsGolem);
    }

    shipDiv.innerHTML = `
        <div class="ship-header">
            <div class="ship-title-container">
                <h2>${headerIcon}</h2>
                <span class="ship-title-text" id="title-text-${shipId}" onclick="editShipName('${shipId}')">${displayName}</span>
                <span class="edit-icon" id="edit-icon-${shipId}" onclick="editShipName('${shipId}')">✏️</span>
                <input type="text" class="ship-name-input" id="title-input-${shipId}" value="${displayName}" maxlength="50" onblur="saveShipName('${shipId}')" onkeydown="if(event.key === 'Enter') saveShipName('${shipId}')">
            </div>
            <div class="ship-header-controls">
                <button class="btn btn-export" onclick="exportShip('${shipId}')">Export</button>
                <button class="btn btn-remove" onclick="removeShip('${shipId}')">Remove</button>
            </div>
        </div>
        <div class="setups-grid">${operatorsHtml}</div>
    `;

    container.appendChild(shipDiv);

    // --- NEW: Auto-Equip Stock Lasers ---
    if (!loadConfig) {
        let defaultLaser = "None";
        if (type === 'MOLE') {
            let match = lasers.find(l => l.size === 2 && l.name.toLowerCase().includes('arbor'));
            if (match) defaultLaser = match.name;
            loadConfig = [
                { enabled: true, laser: defaultLaser, m1: "None", m2: "None", m3: "None" },
                { enabled: true, laser: defaultLaser, m1: "None", m2: "None", m3: "None" },
                { enabled: true, laser: defaultLaser, m1: "None", m2: "None", m3: "None" }
            ];
        } else if (type === 'PROSPECTOR') {
            let match = lasers.find(l => l.size === 1 && l.name.toLowerCase().includes('arbor'));
            if (match) defaultLaser = match.name;
            loadConfig = [ { enabled: true, laser: defaultLaser, m1: "None", m2: "None", m3: "None" } ];
        } else if (type === 'GOLEM') {
            let match = lasers.find(l => l.name.toLowerCase().includes('pitman'));
            if (match) defaultLaser = match.name;
            loadConfig = [ { enabled: true, laser: defaultLaser, m1: "None", m2: "None", m3: "None" } ];
        }
    }

    if (loadConfig) { applyShipConfig(operatorIds, loadConfig); }
    calculate();
}

function clearFleet() {
    if (confirm("Are you sure you want to clear the entire fleet?")) {
        document.getElementById('fleet-container').innerHTML = '';
        calculate();
    }
}

function removeShip(shipId) {
    document.getElementById(`ship-${shipId}`).remove();
    calculate();
}

function editShipName(shipId) {
    document.getElementById(`title-text-${shipId}`).style.display = 'none';
    document.getElementById(`edit-icon-${shipId}`).style.display = 'none';
    let input = document.getElementById(`title-input-${shipId}`);
    input.style.display = 'block';
    input.focus();
    let val = input.value;
    input.value = '';
    input.value = val;
}

function saveShipName(shipId) {
    let input = document.getElementById(`title-input-${shipId}`);
    let text = document.getElementById(`title-text-${shipId}`);
    let icon = document.getElementById(`edit-icon-${shipId}`);

    let newName = input.value.trim();
    if (newName === '') {
        newName = document.getElementById(`ship-${shipId}`).dataset.type;
        input.value = newName;
    }

    text.innerText = newName;
    input.style.display = 'none';
    text.style.display = 'block';
    icon.style.display = 'block';
}

// --- SECURITY & VALIDATION ---

function escapeHTML(str) {
    if (!str) return "";
    return str.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function generateHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; 
    }
    return Math.abs(hash).toString(16); 
}

function triggerImport(mode) {
    importMode = mode;
    document.getElementById('import-file').click();
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    // --- SECURITY: FILE SIZE LIMIT ---
    if (file.size > 15360) {
        alert("❌ File is too large. Valid loadouts are very small files.");
        event.target.value = ""; 
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            // --- SECURITY: HASH VALIDATION ---
            if (!data._hash) { alert("❌ Invalid File: Missing security signature."); return; }
            const providedHash = data._hash;
            delete data._hash; 
            if (providedHash !== generateHash(JSON.stringify(data))) {
                alert("❌ Corrupted File: The contents have been modified or tampered with."); return;
            }

            // --- SECURITY: FLEET SIZE LIMIT ---
            // Prevents someone from modifying the JSON to spawn 10,000 ships and freezing the PC.
            if (data.type === 'FLEET' && data.ships) {
                if (data.ships.length > 20) {
                    alert("❌ Import failed: Fleet exceeds the maximum limit of 20 ships.");
                    return;
                }
                if (confirm("Importing a Fleet will overwrite your current setup. Continue?")) {
                    document.getElementById('fleet-container').innerHTML = '';
                    data.ships.forEach(s => addShip(s.shipType || s.type, s.operators, s.customName));
                }
            } else if (data.type === 'SHIP' || importMode === 'SHIP') {
                let t = data.shipType || (data.operators && data.operators.length > 1 ? 'MOLE' : 'PROSPECTOR');
                addShip(t, data.operators, data.customName);
            }
        } catch (err) { 
            alert("❌ Invalid JSON file format!"); 
        }
        event.target.value = ""; 
    };
    reader.readAsText(file);
}

function exportFleet() {
    let fleet = { type: 'FLEET', ships: [] };
    document.querySelectorAll('.ship-container').forEach(ship => {
        fleet.ships.push(extractShipData(ship));
    });
    downloadJsonWithHash(fleet, 'minecalc-fleet.json');
}

function exportShip(shipId) {
    const ship = document.getElementById(`ship-${shipId}`);
    let data = extractShipData(ship);
    data.type = 'SHIP';
    
    let filename = `minecalc-${data.shipType.toLowerCase()}.json`;
    if (data.customName && data.customName !== data.shipType) {
        let safeName = data.customName.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
        filename = `${safeName}.json`;
    }
    
    downloadJsonWithHash(data, filename);
}

function extractShipData(shipDiv) {
    let titleText = shipDiv.querySelector('.ship-title-text').innerText;
    let data = { shipType: shipDiv.dataset.type, customName: titleText, operators: [] };
    
    shipDiv.querySelectorAll('.setup-card').forEach(card => {
        let opId = card.dataset.opid;
        let laserId = document.getElementById(`cs-laser-${opId}`).dataset.value;
        data.operators.push({
            enabled: !card.classList.contains('off'),
            laser: lasers[laserId].name,
            m1: modules[document.getElementById(`cs-mod1-${opId}`).dataset.value].name,
            m2: modules[document.getElementById(`cs-mod2-${opId}`).dataset.value].name,
            m3: modules[document.getElementById(`cs-mod3-${opId}`).dataset.value].name
        });
    });
    return data;
}

function downloadJsonWithHash(obj, filename) {
    const jsonString = JSON.stringify(obj);
    obj._hash = generateHash(jsonString); 
    
    const finalStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj, null, 2));
    const el = document.createElement('a');
    el.setAttribute("href", finalStr);
    el.setAttribute("download", filename);
    document.body.appendChild(el);
    el.click();
    el.remove();
}

function applyShipConfig(operatorIds, opConfigs) {
    operatorIds.forEach((opId, index) => {
        let conf = opConfigs[index];
        if (!conf) return;

        if (conf.enabled === false) {
            document.getElementById(`card-${opId}`).querySelector('.switch input').checked = false;
            toggleOperator(opId, false);
        }

        const setSelect = (elId, nameToFind, list) => {
            let idx = list.findIndex(i => i.name === nameToFind);
            if (idx > 0) {
                let el = document.getElementById(elId);
                el.dataset.value = idx;
                el.querySelector('.cs-display').innerText = list[idx].name;
            }
        };

        setSelect(`cs-laser-${opId}`, conf.laser, lasers);
        handleLaserChange(opId); 
        setSelect(`cs-mod1-${opId}`, conf.m1, modules);
        setSelect(`cs-mod2-${opId}`, conf.m2, modules);
        setSelect(`cs-mod3-${opId}`, conf.m3, modules);
    });
}

function toggleCS(container) {
    if (container.classList.contains('disabled')) return;
    let wasOpen = container.classList.contains('open');
    document.querySelectorAll('.custom-select').forEach(el => { el.classList.remove('open'); el.querySelector('.cs-options').style.display = 'none'; });
    if (!wasOpen) { container.classList.add('open'); container.querySelector('.cs-options').style.display = 'block'; }
}

function selectCSOption(e, el, type) {
    e.stopPropagation();
    let c = el.closest('.custom-select');
    c.dataset.value = el.dataset.val;
    c.querySelector('.cs-display').innerText = el.innerText;
    c.classList.remove('open');
    c.querySelector('.cs-options').style.display = 'none';
    hidePreview();
    if (type === 'laser') handleLaserChange(c.id.split('-').pop());
    else calculate();
}

function toggleOperator(opId, state) { document.getElementById(`card-${opId}`).classList.toggle('off', !state); calculate(); }

function handleLaserChange(opId) {
    let l = lasers[document.getElementById(`cs-laser-${opId}`).dataset.value];
    for (let m=1; m<=3; m++) {
        let el = document.getElementById(`cs-mod${m}-${opId}`);
        if (m <= l.slots) el.classList.remove('disabled');
        else { el.classList.add('disabled'); el.dataset.value = 0; el.querySelector('.cs-display').innerText = 'None'; }
    }
    calculate();
}

function addGadgetRow() {
    const list = document.getElementById('gadget-list');
    const row = document.createElement('div');
    row.className = 'gadget-row';
    row.innerHTML = `
        <div class="custom-select gadget-select" data-value="0" onclick="toggleCS(this)">
            <div class="cs-display">None</div>
            <div class="cs-options">${gadgetOptionsHtml}</div>
        </div>
        <button class="btn btn-remove" onclick="this.parentElement.remove(); calculate();">Remove</button>
    `;
    list.appendChild(row);
    calculate();
}

function toggleAccordion(headerElement) {
    headerElement.classList.toggle('active');
    const contentElement = headerElement.nextElementSibling;
    contentElement.style.display = headerElement.classList.contains('active') ? 'block' : 'none';
}

function calcMulti(arr) { if (!arr.length) return 0; let p = 1; arr.forEach(v => p *= (1 + (v/100))); return (p - 1) * 100; }

function updateStat(id, val, inv, suf='%') {
    let el = document.getElementById(id); if (!el) return;
    let d = val.toFixed(1).replace('.0', '');
    el.innerText = (val === 0 ? '0' : (val > 0 ? '+' + d : d)) + suf;
    el.style.color = val === 0 ? 'var(--text-main)' : ((val > 0 ? !inv : inv) ? 'var(--good-stat)' : 'var(--bad-stat)');
}

function calculate() {
    let tMax = 0, tMin = 0;
    let fleetRes = [], fleetInst = []; 
    let gadgetRes = [], gadgetInst = []; 
    let win = [], chg = [], over = [], shat = [], clust = [];

    document.querySelectorAll('.setup-card').forEach(card => {
        let opId = card.dataset.opid;
        if (card.classList.contains('off')) {
            let extEl = document.getElementById(`op-ext-${opId}`);
            let inertEl = document.getElementById(`op-inert-${opId}`);
            if (extEl) extEl.innerText = '0.0';
            if (inertEl) inertEl.innerText = '0%';
            return;
        }

        let l = lasers[document.getElementById(`cs-laser-${opId}`).dataset.value];
        if (!l || l.name === "None") return;

        let pMod = 0, eMod = 0, opInert = [l.inert || 0];
        
        // NEW: Variables to pool the module stats together for this specific seat (Additive)
        let seatWin = 0, seatChg = 0, seatOver = 0, seatShat = 0, seatClust = 0;

        [1,2,3].forEach(m => {
            let mod = modules[document.getElementById(`cs-mod${m}-${opId}`).dataset.value];
            if (!mod || mod.name === "None") return;
            
            pMod += mod.power; 
            eMod += mod.extraction; 
            opInert.push(mod.inert || 0);
            
            // Resistance & Instability are pure multiplicative, so they go straight to the array
            if (mod.resistance) fleetRes.push(mod.resistance); 
            if (mod.instability) fleetInst.push(mod.instability);
            
            // HYBRID STATS: We add them to the seat pool first instead of pushing to the array
            if (mod.optimalWin) seatWin += mod.optimalWin; 
            if (mod.optCharge) seatChg += mod.optCharge;
            if (mod.overcharge) seatOver += mod.overcharge; 
            if (mod.shatter) seatShat += mod.shatter;
            if (mod.cluster) seatClust += mod.cluster;
        });

        // Power & Extraction (Additive to laser)
        tMax += l.powerMax * (1 + pMod/100); 
        tMin += l.powerMin * (1 + pMod/100);
        
        // Resistance & Instability (Pure Multiplicative)
        if (l.resistance) fleetRes.push(l.resistance); 
        if (l.instability) fleetInst.push(l.instability);

        // HYBRID MATH CALCULATIONS 
        // Formula: (1 + LaserBonus) * (1 + SumOfModules) - 1
        
        let finalSeatWin = ((1 + (l.optimalWin || 0)/100) * (1 + seatWin/100)) - 1;
        if (finalSeatWin !== 0) win.push(finalSeatWin * 100);
        
        let finalSeatChg = ((1 + (l.optCharge || 0)/100) * (1 + seatChg/100)) - 1;
        if (finalSeatChg !== 0) chg.push(finalSeatChg * 100);
        
        let finalSeatOver = ((1 + (l.overcharge || 0)/100) * (1 + seatOver/100)) - 1;
        if (finalSeatOver !== 0) over.push(finalSeatOver * 100);
        
        let finalSeatShat = ((1 + (l.shatter || 0)/100) * (1 + seatShat/100)) - 1;
        if (finalSeatShat !== 0) shat.push(finalSeatShat * 100);

        let finalSeatClust = ((1 + (l.cluster || 0)/100) * (1 + seatClust/100)) - 1;
        if (finalSeatClust !== 0) clust.push(finalSeatClust * 100);
        // ------------------------------------

        document.getElementById(`op-ext-${opId}`).innerText = (l.extraction * (1 + eMod/100)).toFixed(1);
        updateStat(`op-inert-${opId}`, calcMulti(opInert), true);
        document.getElementById(`op-optrange-${opId}`).innerText = (l.optRange || 0) + 'm';
        document.getElementById(`op-maxrange-${opId}`).innerText = (l.maxRange || 0) + 'm';
    });

    document.querySelectorAll('.gadget-select').forEach(el => {
        let g = gadgets[el.dataset.value];
        if (g && g.name !== "None") {
            if (g.resistance) gadgetRes.push(g.resistance); 
            if (g.instability) gadgetInst.push(g.instability);
            // Gadgets apply globally to the rock, so they go straight into the final arrays
            if (g.optimalWin) win.push(g.optimalWin); 
            if (g.optCharge) chg.push(g.optCharge);
            if (g.overcharge) over.push(g.overcharge); 
            if (g.shatter) shat.push(g.shatter);
            if (g.cluster) clust.push(g.cluster);
        }
    });

    const totalResMod = calcMulti([...fleetRes, ...gadgetRes]);
    const totalInstMod = calcMulti([...fleetInst, ...gadgetInst]);

    document.getElementById('res-max-power').innerText = Math.round(tMax).toLocaleString();
    document.getElementById('res-min-power').innerText = Math.round(tMin).toLocaleString();
    
    // Final output generation uses your original calcMulti!
    updateStat('res-resistance', totalResMod, true);
    updateStat('res-instability', totalInstMod, true);
    updateStat('res-opt-win', calcMulti(win), false);
    updateStat('res-opt-charge', calcMulti(chg), false);
    updateStat('res-overcharge', calcMulti(over), true);
    updateStat('res-shatter', calcMulti(shat), true);
    updateStat('res-cluster', calcMulti(clust), false);

    const inputMass = safeFloat(document.getElementById('rock-mass').value);
    const inputRes = safeFloat(document.getElementById('rock-res').value);
    const inputInst = safeFloat(document.getElementById('rock-inst').value);
    const scannedWithGadgets = document.getElementById('gadgets-scanned').checked;

    if (inputMass > 0) {
        let resModToApply = scannedWithGadgets ? calcMulti(fleetRes) : totalResMod;
        let effectiveRes = inputRes * (1 + resModToApply / 100);

        const pStatus = document.getElementById('crack-power-status');
        const pReqDisplay = document.getElementById('crack-power-required');

        if (effectiveRes >= 100) {
            pStatus.innerText = "Impossible";
            pStatus.style.backgroundColor = "var(--impossible)";
            pStatus.style.color = "white";
            pReqDisplay.innerText = "Required Power: ∞ (Resist ≥ 100%)";
        } else {
            effectiveRes = Math.max(0, effectiveRes);
            const requiredPower = (inputMass / (1 - (effectiveRes * 0.01))) / 5;
            pReqDisplay.innerText = "Required Power: " + Math.round(requiredPower).toLocaleString();

            if (tMax < requiredPower) {
                pStatus.innerText = "Impossible";
                pStatus.style.backgroundColor = "var(--impossible)";
                pStatus.style.color = "white";
            } else if (tMin > requiredPower) {
                pStatus.innerText = "Too Much Power (Min)";
                pStatus.style.backgroundColor = "var(--overpower)";
                pStatus.style.color = "white";
            } else if (tMax < requiredPower * 1.1 || tMax > requiredPower * 2.5) {
                pStatus.innerText = "Difficult";
                pStatus.style.backgroundColor = "var(--difficult)";
                pStatus.style.color = "black";
            } else {
                pStatus.innerText = "Crackable";
                pStatus.style.backgroundColor = "var(--crackable)";
                pStatus.style.color = "white";
            }
        }

        let instModToApply = scannedWithGadgets ? calcMulti(fleetInst) : totalInstMod;
        let finalInst = Math.max(0, inputInst * (1 + instModToApply / 100));

        const iStatus = document.getElementById('crack-inst-status');
        document.getElementById('crack-inst-final').innerText = "Final Instability: " + Math.round(finalInst).toLocaleString();

        if (finalInst < 101) {
            iStatus.innerText = "Stable";
            iStatus.style.backgroundColor = "var(--crackable)";
            iStatus.style.color = "white";
        } else if (finalInst < 301) {
            iStatus.innerText = "Unstable";
            iStatus.style.backgroundColor = "var(--difficult)";
            iStatus.style.color = "black";
        } else {
            iStatus.innerText = "Extreme";
            iStatus.style.backgroundColor = "var(--impossible)";
            iStatus.style.color = "white";
        }
    } else {
        document.getElementById('crack-power-status').innerText = "Awaiting Input";
        document.getElementById('crack-power-status').style.backgroundColor = "var(--bg-color)";
        document.getElementById('crack-inst-status').innerText = "Awaiting Input";
        document.getElementById('crack-inst-status').style.backgroundColor = "var(--bg-color)";
    }
}

// --- NEW HELPER FUNCTIONS FOR MULTIPLES ---

// 1. Determine Max Cluster Size Based on Rarity
function getMaxMulti(rarity) {
    if(rarity === 'Legendary') return 2;
    if(rarity === 'Epic') return 3;
    if(rarity === 'Rare') return 4;
    if(rarity === 'Uncommon') return 5;
    if(rarity === 'Common') return 6;
    return 1;
}

// 2. Re-use your existing tooltip for the Hover Effect
window.showSignatureTip = (baseSig, rarity) => {
    const max = getMaxMulti(rarity);
    let html = `<div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:8px;">`;
    for(let i=1; i<=max; i++) {
        html += `<span style="background:var(--bg-color); border:1px solid var(--border); padding:4px 8px; border-radius:4px; font-size:0.9em; color:var(--text-main);">${i}x: <span style="color:var(--accent); font-weight:bold;">${baseSig * i}</span></span>`;
    }
    html += `</div>`;
    tooltipEl.innerHTML = `<h4 style="margin-bottom: 5px; border-bottom: none; padding-bottom: 0;">${rarity} Multiples</h4><div style="font-size:0.8em; color:var(--text-muted); border-bottom: 1px solid var(--border); padding-bottom: 5px; margin-bottom: 5px;">Max cluster size: ${max}x</div>${html}`;
    tooltipEl.style.display = 'block';
}

// 3. Click Effect: Opens a row directly underneath
window.toggleSignatureRow = (cell, baseSig, rarity) => {
    const tr = cell.closest('tr');
    const nextTr = tr.nextElementSibling;
    
    // If it's already open, close it
    if (nextTr && nextTr.classList.contains('sig-details-row')) {
        nextTr.remove();
        return;
    }
    
    const max = getMaxMulti(rarity);
    let html = `<div style="display:flex; gap:15px; padding:5px 10px; border-left:3px solid var(--accent); flex-wrap:wrap; align-items: center;">`;
    html += `<span style="color:var(--text-muted); font-size:0.8em; text-transform:uppercase; margin-right:10px;">${rarity} Limits:</span>`;
    for(let i=1; i<=max; i++) {
        html += `<div style="background:var(--bg-color); border:1px solid var(--border); padding:6px 12px; border-radius:6px; text-align:center;">
                    <div style="color:var(--text-muted); font-size:0.75em; text-transform:uppercase;">${i}x Cluster</div>
                    <div style="color:var(--accent); font-weight:bold; font-size:1.1em;">${baseSig * i}</div>
                 </div>`;
    }
    html += `</div>`;

    const detailRow = document.createElement('tr');
    detailRow.className = 'sig-details-row';
    detailRow.innerHTML = `<td colspan="7" style="padding: 15px; border-bottom: 1px solid var(--border);">${html}</td>`;
    tr.after(detailRow);
}


// --- ORE DATABASE GENERATOR (UPDATED) ---
function generateOreTable() {
    const tbody = document.getElementById('ore-table-body');
    if (!tbody || typeof ores === 'undefined') return;

    const colorize = (word) => {
        let cssClass = '';
        if (word === 'Extreme') cssClass = 'rating-extreme';
        else if (word === 'High') cssClass = 'rating-high';
        else if (word === 'Medium') cssClass = 'rating-medium';
        else if (word === 'Low') cssClass = 'rating-low';
        else if (word === 'Very Low') cssClass = 'rating-very-low';
        return `<span class="${cssClass}">${word}</span>`;
    };

    const getInstRating = (val) => colorize(val >= 1000 ? 'Extreme' : val >= 600 ? 'High' : val > 50 ? 'Medium' : 'Low');
    const getResRating = (val) => colorize(val >= 95 ? 'Extreme' : val >= 60 ? 'High' : val >= 30 ? 'Medium' : val >= 10 ? 'Low' : 'Very Low');
    const getDensRating = (val) => val >= 2500 ? 'Very Large' : val >= 1200 ? 'Large' : val >= 800 ? 'Medium' : val >= 300 ? 'Small' : 'Very Small';

    let html = "";

    ores.forEach(ore => {
        if (!ore.rarity) return;

        let subOres = ore.secondary || "-";
        if (ore.tertiary) subOres += `, ${ore.tertiary}`;

        // Added data-rarity to the TR, and hover/click logic to the Signature TD
        html += `
            <tr data-signature="${ore.signature}" data-rarity="${ore.rarity}">
                <td class="rarity-${ore.rarity.toLowerCase()}">${ore.rarity}</td>
                <td class="ore-name-cell" style="font-weight: bold;">${ore.name} ${ore.locationNote ? `<span style="font-size:0.7em; color:var(--accent); display:block;">(${ore.locationNote})</span>` : ''}</td>
                <td class="sig-clickable" style="color: var(--accent); font-weight: bold; font-size: 1.1em;" 
                    onmouseenter="showSignatureTip(${ore.signature}, '${ore.rarity}')" 
                    onmouseleave="hidePreview()" 
                    onclick="toggleSignatureRow(this, ${ore.signature}, '${ore.rarity}')" 
                    title="Click or hover to expand clusters">
                    ${ore.signature}
                </td>
                <td>${getInstRating(ore.instability)} <span style="color: var(--text-muted); font-size: 0.8em;">(${ore.instability})</span></td>
                <td>${getResRating(ore.resistance)} <span style="color: var(--text-muted); font-size: 0.8em;">(${ore.resistance})</span></td>
                <td>${getDensRating(ore.density)} <span style="color: var(--text-muted); font-size: 0.8em;">(${ore.density})</span></td>
                <td style="font-size: 0.85em; color: var(--text-muted);">${subOres}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// --- ROCK READER CALCULATOR (UPDATED) ---
function findOres() {
    const inputSignatureStr = document.getElementById('signatureInput').value;
    const signature = parseInt(inputSignatureStr);
    const tbody = document.getElementById('ore-table-body');
    // Only target main rows, ignore the expanded detail rows so it doesn't break
    const rows = tbody.querySelectorAll('tr[data-signature]');

    // Reset table
    rows.forEach(row => {
        row.classList.remove('highlight-match');
        const badge = row.querySelector('.cluster-badge');
        if (badge) badge.remove();
    });

    if (isNaN(signature) || signature <= 0) return;

    let matchFound = false;

    // Check matches
    rows.forEach(row => {
        const baseSig = parseInt(row.getAttribute('data-signature'));
        const rarity = row.getAttribute('data-rarity');
        const maxMulti = getMaxMulti(rarity);

        if (baseSig && signature % baseSig === 0) {
            const count = signature / baseSig;
            
            // Check if the match is within the valid game limits (e.g. Legendary <= 2)
            if (count <= maxMulti) {
                row.classList.add('highlight-match');
                const nameCell = row.querySelector('.ore-name-cell');
                nameCell.innerHTML += `<span class="cluster-badge">${count}x Cluster</span>`;
                matchFound = true;
            }
        }
    });

    // Optional: Smooth scroll to first match
    if (matchFound) {
        const firstMatch = tbody.querySelector('.highlight-match');
        if (firstMatch) {
            firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

// Ensure the table builds as soon as the page is ready
document.addEventListener('DOMContentLoaded', function() {
    generateOreTable();
});