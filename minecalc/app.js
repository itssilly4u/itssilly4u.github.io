let lasers = [], modules = [], gadgets = [];
let gadgetOptionsHtml = "";
let modOptionsHtml = "";
let importMode = ""; // Tracks if we are importing a fleet or ship

// Dynamic dropdown cache
let laserOptionsS1 = ""; // Size 0 & 1
let laserOptionsS2 = ""; // Size 2 only

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
    // Generate S1 (Size 1 only) and S2 (Size 2 only) drop downs
    laserOptionsS1 = `<div class="cs-option" data-val="0" onclick="selectCSOption(event, this, 'laser')">None</div>`;
    laserOptionsS2 = `<div class="cs-option" data-val="0" onclick="selectCSOption(event, this, 'laser')">None</div>`;
    
    [2, 1, 0].forEach(s => {
        let f = lasers.map((l, i) => ({l, i})).filter(o => o.l.size === s && o.l.name !== "None");
        if (f.length) {
            let groupHtml = `<div class="cs-optgroup">Size ${s} Lasers</div>`;
            f.forEach(o => groupHtml += `<div class="cs-option" data-val="${o.i}" onmouseenter="showPreview(${o.i}, 'laser')" onmouseleave="hidePreview()" onclick="selectCSOption(event, this, 'laser')">${o.l.name}</div>`);
            
            // Strict filtering so S0 doesn't bleed into S1
            if (s === 2) laserOptionsS2 += groupHtml;
            if (s === 1) laserOptionsS1 += groupHtml; 
        }
    });

    modOptionsHtml = `<div class="cs-option" data-val="0" onclick="selectCSOption(event, this, 'module')">None</div>`;
    let actives = modules.map((m, i) => ({m, i})).filter(o => o.m.uses > 0);
    let passives = modules.map((m, i) => ({m, i})).filter(o => o.m.uses === 0 && o.m.name !== "None");
    if (actives.length) { modOptionsHtml += `<div class="cs-optgroup">Active Modules</div>`; actives.forEach(o => modOptionsHtml += `<div class="cs-option" data-val="${o.i}" onmouseenter="showPreview(${o.i}, 'module')" onmouseleave="hidePreview()" onclick="selectCSOption(event, this, 'module')">${o.m.name}</div>`); }
    if (passives.length) { modOptionsHtml += `<div class="cs-optgroup">Passive Modules</div>`; passives.forEach(o => modOptionsHtml += `<div class="cs-option" data-val="${o.i}" onmouseenter="showPreview(${o.i}, 'module')" onmouseleave="hidePreview()" onclick="selectCSOption(event, this, 'module')">${o.m.name}</div>`); }

    gadgetOptionsHtml = gadgets.map((g, i) => `<div class="cs-option" data-val="${i}" onmouseenter="showPreview(${i}, 'gadget')" onmouseleave="hidePreview()" onclick="selectCSOption(event, this, 'gadget')">${g.name}</div>`).join('');

    // Start with a MOLE as the default ship
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

function addShip(type, loadConfig = null) {
    const container = document.getElementById('fleet-container');
    const shipId = generateId();
    const shipDiv = document.createElement('div');
    shipDiv.className = 'ship-container';
    shipDiv.id = `ship-${shipId}`;
    shipDiv.dataset.type = type;

    // MAGICAL SORTING: Force ships into perfect groups based on type
    if (type === 'MOLE') {
        shipDiv.style.order = '1';
    } else if (type === 'PROSPECTOR') {
        shipDiv.style.order = '2';
    } else if (type === 'GOLEM') {
        shipDiv.style.order = '3';
    }

    // Set Manufacturer Colors
    let headerIcon = type === 'MOLE' ? '🟧' : (type === 'PROSPECTOR' ? '🟦' : '🟨');
    
    let operatorsHtml = "";
    let operatorIds = [];

    if (type === 'MOLE') {
        let seats = ['Center Seat', 'Port Seat', 'Starboard Seat'];
        seats.forEach(seat => {
            let opId = generateId();
            operatorIds.push(opId);
            operatorsHtml += createOperatorHtml(opId, seat, laserOptionsS2);
        });
    } else {
        let opId = generateId();
        operatorIds.push(opId);
        operatorsHtml += createOperatorHtml(opId, 'Pilot Seat', laserOptionsS1);
    }

    shipDiv.innerHTML = `
        <div class="ship-header">
            <h2>${headerIcon} ${type}</h2>
            <div class="ship-header-controls">
                <button class="btn btn-export" onclick="exportShip('${shipId}')">Export</button>
                <button class="btn btn-remove" onclick="removeShip('${shipId}')">Remove</button>
            </div>
        </div>
        <div class="setups-grid">${operatorsHtml}</div>
    `;

    container.appendChild(shipDiv);

    if (loadConfig) { applyShipConfig(operatorIds, loadConfig); }
    calculate();
}

function removeShip(shipId) {
    document.getElementById(`ship-${shipId}`).remove();
    calculate();
}

// --- IMPORT / EXPORT LOGIC ---

function triggerImport(mode) {
    importMode = mode;
    document.getElementById('import-file').click();
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            // --- SECURITY CHECK ---
            if (!data._hash) {
                alert("❌ Invalid File: Missing security signature. Please ensure you are uploading a valid MineCalc config.");
                return;
            }

            // Save the provided hash, then delete it from the object to check the original data
            const providedHash = data._hash;
            delete data._hash; 
            
            // Recalculate the hash
            const calculatedHash = generateHash(JSON.stringify(data));
            
            if (providedHash !== calculatedHash) {
                alert("❌ Corrupted File: The file contents have been modified, broken, or tampered with.");
                return;
            }
            // --- END SECURITY CHECK ---

            if (data.type === 'FLEET' || (importMode === 'FLEET' && data.ships)) {
                if (confirm("Importing a Fleet will overwrite your current setup. Continue?")) {
                    document.getElementById('fleet-container').innerHTML = '';
                    data.ships.forEach(s => addShip(s.type, s.operators));
                }
            } else if (data.type === 'SHIP' || importMode === 'SHIP') {
                let t = data.shipType || (data.operators && data.operators.length > 1 ? 'MOLE' : 'PROSPECTOR');
                addShip(t, data.operators);
            }
        } catch (err) { 
            alert("❌ Invalid JSON file format!"); 
        }
        event.target.value = ""; // Reset input so you can upload the same file again if needed
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
    downloadJsonWithHash(data, `minecalc-${data.shipType.toLowerCase()}.json`);
}

function downloadJsonWithHash(obj, filename) {
    // 1. Turn the pure data into a string
    const jsonString = JSON.stringify(obj);
    
    // 2. Generate the unique signature
    const hash = generateHash(jsonString);
    
    // 3. Attach the signature to the object
    obj._hash = hash; 
    
    // 4. Download it
    const finalStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj, null, 2));
    const el = document.createElement('a');
    el.setAttribute("href", finalStr);
    el.setAttribute("download", filename);
    document.body.appendChild(el);
    el.click();
    el.remove();
}

function extractShipData(shipDiv) {
    let data = { shipType: shipDiv.dataset.type, operators: [] };
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
        handleLaserChange(opId); // unlock module slots
        setSelect(`cs-mod1-${opId}`, conf.m1, modules);
        setSelect(`cs-mod2-${opId}`, conf.m2, modules);
        setSelect(`cs-mod3-${opId}`, conf.m3, modules);
    });
}

function downloadJson(obj, filename) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj, null, 2));
    const el = document.createElement('a');
    el.setAttribute("href", dataStr);
    el.setAttribute("download", filename);
    document.body.appendChild(el);
    el.click();
    el.remove();
}

// --- STANDARD UI LOGIC ---

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

    // Loop through ALL active operator cards on the page dynamically
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
        [1,2,3].forEach(m => {
            let mod = modules[document.getElementById(`cs-mod${m}-${opId}`).dataset.value];
            if (!mod || mod.name === "None") return;
            pMod += mod.power; eMod += mod.extraction; opInert.push(mod.inert || 0);
            if (mod.resistance) fleetRes.push(mod.resistance); 
            if (mod.instability) fleetInst.push(mod.instability);
            if (mod.optimalWin) win.push(mod.optimalWin); 
            if (mod.optCharge) chg.push(mod.optCharge);
            if (mod.overcharge) over.push(mod.overcharge); 
            if (mod.shatter) shat.push(mod.shatter);
        });

        tMax += l.powerMax * (1 + pMod/100); 
        tMin += l.powerMin * (1 + pMod/100);
        if (l.resistance) fleetRes.push(l.resistance); 
        if (l.instability) fleetInst.push(l.instability);
        if (l.optimalWin) win.push(l.optimalWin); 
        if (l.optCharge) chg.push(l.optCharge);
        if (l.overcharge) over.push(l.overcharge); 
        if (l.shatter) shat.push(l.shatter);

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

// RockReader Logic
function findOres() {
    const inputSignatureStr = document.getElementById('signatureInput').value;
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = "";

    const signature = parseInt(inputSignatureStr);
    if (isNaN(signature) || signature <= 0) {
        resultsDiv.innerHTML = "<div style='color:#ff6b6b; text-align:center; padding: 10px;'>❌ Please enter a valid number.</div>";
        return;
    }

    let matches = [];
    for (const ore of ores) {
        if (signature % ore.signature === 0) {
            const count = signature / ore.signature;
            matches.push({ name: ore.name, count: count });
        }
    }

    if (matches.length > 0) {
        resultsDiv.innerHTML = "<div class='stat-title' style='margin-bottom: 12px;'>Possible Matches:</div>" +
            matches.map(m => `
                <div class="match-item">
                    <span class="match-name">${m.name}</span>
                    <span class="match-count">${m.count}x node cluster</span>
                </div>
            `).join('');
    } else {
        resultsDiv.innerHTML = `
            <div style='text-align:center; padding: 20px;'>
                <div class='stat-title'>No perfect matches found.</div>
                <div style='color: #a1a6b0; font-size:0.9rem; margin-top: 5px;'>The initial signature may not be perfectly precise, or it's a mixed cluster.</div>
            </div>`;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const sigInput = document.getElementById('signatureInput');
    if (sigInput) {
        sigInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault(); 
                findOres();
            }
        });
    }
});

window.onclick = (e) => { if (!e.target.closest('.custom-select')) document.querySelectorAll('.custom-select').forEach(el => { el.classList.remove('open'); el.querySelector('.cs-options').style.display='none'; }); };
window.onload = loadData;

// --- SECURITY & VALIDATION ---
function generateHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    // Return as a positive hex string for a clean look
    return Math.abs(hash).toString(16); 
}