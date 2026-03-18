const NUM_SETUPS = 3; 
let lasers = [], modules = [], gadgets = [];
let gadgetOptionsHtml = "";

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
                shatter: safeFloat(l['Shatter Damage']), optRange: safeFloat(l['Optimal Range']), maxRange: safeFloat(l['Maximum Range']), size: l.Size
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

        gadgetOptionsHtml = gadgets.map((g, i) => `<div class="cs-option" data-val="${i}" onmouseenter="showPreview(${i}, 'gadget')" onmouseleave="hidePreview()" onclick="selectCSOption(event, this, 'gadget')">${g.name}</div>`).join('');

        document.getElementById('loading').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        initUI();
    } catch (e) { console.error(e); }
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
    
    if (headerElement.classList.contains('active')) {
        contentElement.style.display = 'block';
    } else {
        contentElement.style.display = 'none';
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
            matches.push({
                name: ore.name,
                count: count
            });
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

// Safely attach the Enter key listener after the page loads
document.addEventListener('DOMContentLoaded', function() {
    const sigInput = document.getElementById('signatureInput');
    if (sigInput) {
        sigInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault(); // Stops the page from accidentally refreshing
                findOres();
            }
        });
    }
});

function initUI() {
    let laserOptions = `<div class="cs-option" data-val="0" onclick="selectCSOption(event, this, 'laser')">None</div>`;
    [2, 1, 0].forEach(s => {
        let f = lasers.map((l, i) => ({l, i})).filter(o => o.l.size == s && o.l.name !== "None");
        if (f.length) {
            laserOptions += `<div class="cs-optgroup">Size ${s} Lasers</div>`;
            f.forEach(o => laserOptions += `<div class="cs-option" data-val="${o.i}" onmouseenter="showPreview(${o.i}, 'laser')" onmouseleave="hidePreview()" onclick="selectCSOption(event, this, 'laser')">${o.l.name}</div>`);
        }
    });

    let modOptions = `<div class="cs-option" data-val="0" onclick="selectCSOption(event, this, 'module')">None</div>`;
    let actives = modules.map((m, i) => ({m, i})).filter(o => o.m.uses > 0);
    let passives = modules.map((m, i) => ({m, i})).filter(o => o.m.uses === 0 && o.m.name !== "None");
    if (actives.length) { modOptions += `<div class="cs-optgroup">Active Modules</div>`; actives.forEach(o => modOptions += `<div class="cs-option" data-val="${o.i}" onmouseenter="showPreview(${o.i}, 'module')" onmouseleave="hidePreview()" onclick="selectCSOption(event, this, 'module')">${o.m.name}</div>`); }
    if (passives.length) { modOptions += `<div class="cs-optgroup">Passive Modules</div>`; passives.forEach(o => modOptions += `<div class="cs-option" data-val="${o.i}" onmouseenter="showPreview(${o.i}, 'module')" onmouseleave="hidePreview()" onclick="selectCSOption(event, this, 'module')">${o.m.name}</div>`); }

    const container = document.getElementById('setups-container');
    for (let i = 0; i < NUM_SETUPS; i++) {
        const card = document.createElement('div');
        card.className = 'setup-card'; card.id = `card-${i}`;
        card.innerHTML = `
            <div class="card-header"><h3>Operator ${i + 1}</h3><label class="switch"><input type="checkbox" checked onchange="toggleOperator(${i}, this.checked)"><span class="slider"></span></label></div>
            <div class="form-group"><label>Laser Head</label><div class="custom-select" id="cs-laser-${i}" data-value="0" onclick="toggleCS(this)"><div class="cs-display">None</div><div class="cs-options">${laserOptions}</div></div></div>
            ${[1,2,3].map(m => `<div class="form-group"><label>Module ${m}</label><div class="custom-select disabled" id="cs-mod${m}-${i}" data-value="0" onclick="toggleCS(this)"><div class="cs-display">None</div><div class="cs-options">${modOptions}</div></div></div>`).join('')}
            <div class="operator-results">
                <div class="local-stat"><span class="label">Local Ext.</span><span class="value" id="op-ext-${i}">0.0</span></div>
                <div class="local-stat"><span class="label">Local Inert</span><span class="value" id="op-inert-${i}">0%</span></div>
                <div class="local-stat"><span class="label">Opt. Range</span><span class="value" id="op-optrange-${i}">0m</span></div>
                <div class="local-stat"><span class="label">Max Range</span><span class="value" id="op-maxrange-${i}">0m</span></div>
            </div>`;
        container.appendChild(card);
    }
}

function toggleOperator(i, state) { document.getElementById(`card-${i}`).classList.toggle('off', !state); calculate(); }

function handleLaserChange(i) {
    let l = lasers[document.getElementById(`cs-laser-${i}`).dataset.value];
    for (let m=1; m<=3; m++) {
        let el = document.getElementById(`cs-mod${m}-${i}`);
        if (m <= l.slots) el.classList.remove('disabled');
        else { el.classList.add('disabled'); el.dataset.value = 0; el.querySelector('.cs-display').innerText = 'None'; }
    }
    calculate();
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

    for (let i=0; i<NUM_SETUPS; i++) {
        const card = document.getElementById(`card-${i}`);
        if (!card || card.classList.contains('off')) {
            const extEl = document.getElementById(`op-ext-${i}`);
            const inertEl = document.getElementById(`op-inert-${i}`);
            if (extEl) extEl.innerText = '0.0';
            if (inertEl) inertEl.innerText = '0%';
            continue;
        }
        let l = lasers[document.getElementById(`cs-laser-${i}`).dataset.value];
        if (!l || l.name === "None") continue;

        let pMod = 0, eMod = 0, opInert = [l.inert || 0];
        [1,2,3].forEach(m => {
            let mod = modules[document.getElementById(`cs-mod${m}-${i}`).dataset.value];
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

        document.getElementById(`op-ext-${i}`).innerText = (l.extraction * (1 + eMod/100)).toFixed(1);
        updateStat(`op-inert-${i}`, calcMulti(opInert), true);
        document.getElementById(`op-optrange-${i}`).innerText = (l.optRange || 0) + 'm';
        document.getElementById(`op-maxrange-${i}`).innerText = (l.maxRange || 0) + 'm';
    }

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

window.onclick = (e) => { if (!e.target.closest('.custom-select')) document.querySelectorAll('.custom-select').forEach(el => { el.classList.remove('open'); el.querySelector('.cs-options').style.display='none'; }); };
window.onload = loadData;