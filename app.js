window.addEventListener('error', function(e) {
    const d = document.getElementById('debug-console');
    if(d) { d.innerHTML += `<span style="color:red;">CRITICAL JS ERROR: ${e.message}</span><br>`; }
});

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwJg28FI1maQPvXELfK3kbgM7PNMj-_pQ73w0b11TPkW3jTGdftEhto7OfBu-2Qc5Medg/exec";

let appData = { scores: [], fixtures: [], config: [], sweets: [], transfers: [] };
let manualScores = {}; 
let teamStats = {};      
let familyStats = {};    
let matchTeamsMap = {}; 
let groupRankings = {};

const KO_PATHS = [
    {id: 73, r: "R32", next: 89, isHome: true}, {id: 74, r: "R32", next: 89, isHome: false},
    {id: 75, r: "R32", next: 90, isHome: true}, {id: 76, r: "R32", next: 90, isHome: false},
    {id: 77, r: "R32", next: 91, isHome: true}, {id: 78, r: "R32", next: 91, isHome: false},
    {id: 79, r: "R32", next: 92, isHome: true}, {id: 80, r: "R32", next: 92, isHome: false},
    {id: 81, r: "R32", next: 93, isHome: true}, {id: 82, r: "R32", next: 93, isHome: false},
    {id: 83, r: "R32", next: 94, isHome: true}, {id: 84, r: "R32", next: 94, isHome: false},
    {id: 85, r: "R32", next: 95, isHome: true}, {id: 86, r: "R32", next: 95, isHome: false},
    {id: 87, r: "R32", next: 96, isHome: true}, {id: 88, r: "R32", next: 96, isHome: false},
    {id: 89, r: "R16", next: 97, isHome: true}, {id: 90, r: "R16", next: 97, isHome: false},
    {id: 91, r: "R16", next: 98, isHome: true}, {id: 92, r: "R16", next: 98, isHome: false},
    {id: 93, r: "R16", next: 99, isHome: true}, {id: 94, r: "R16", next: 99, isHome: false},
    {id: 95, r: "R16", next: 100, isHome: true}, {id: 96, r: "R16", next: 100, isHome: false},
    {id: 97, r: "QF", next: 101, isHome: true}, {id: 98, r: "QF", next: 101, isHome: false},
    {id: 99, r: "QF", next: 102, isHome: true}, {id: 100, r: "QF", next: 102, isHome: false},
    {id: 101, r: "SF", next: 104, isHome: true}, {id: 102, r: "SF", next: 104, isHome: false},
    {id: 104, r: "FINAL", next: null, isHome: null}
];

const ISO_CODES = {
    "mexico":"mx", "southafrica":"za", "southkorea":"kr", "czechia":"cz",
    "switzerland":"ch", "canada":"ca", "bosniaandherzegovina":"ba", "bosniaherzegovina":"ba",
    "qatar":"qa", "brazil":"br", "morocco":"ma", "australia":"au", "turkiye":"tr",
    "germany":"de", "ivorycoast":"ci", "ecuador":"ec", "curacao":"cw",
    "netherlands":"nl", "japan":"jp", "sweden":"se", "tunisia":"tn",
    "belgium":"be", "egypt":"eg", "iran":"ir", "newzealand":"nz",
    "spain":"es", "capeverde":"cv", "saudiarabia":"sa", "uruguay":"uy",
    "france":"fr", "norway":"no", "senegal":"sn", "iraq":"iq",
    "argentina":"ar", "austria":"at", "algeria":"dz", "jordan":"jo",
    "colombia":"co", "portugal":"pt", "drcongo":"cd", "uzbekistan":"uz",
    "panama":"pa", "haiti":"ht", "ghana":"gh", "croatia":"hr", "unitedstates":"us",
    "england":"gb-eng", "scotland":"gb-sct", "paraguay":"py"
};

function getFlag(team) {
    if(!team || team === "TBD") return "🏁";
    let tStr = String(team).toLowerCase().replace(/[^a-z]/g, '');
    let iso = ISO_CODES[tStr];
    if(iso) return `<img src="https://flagcdn.com/w40/${iso}.png" class="cdn-flag" alt="${team}">`;
    return "🏁";
}

function getStandardName(name) {
    if (!name) return "";
    let n = String(name).trim();
    if (/^[1-3][A-L]$/i.test(n)) return n.toUpperCase(); 
    const map = {
        "usa": "United States", "korea republic": "South Korea", 
        "bosnia and herzegovina": "Bosnia & Herzegovina", "türkiye": "Turkiye", 
        "côte d'ivoire": "Ivory Coast", "curaçao": "Curacao", "cabo verde": "Cape Verde", 
        "congo dr": "DR Congo", "ir iran": "Iran"
    };
    return map[n.toLowerCase()] || n;
}

function formatTeam(teamName, includeOwner = true) {
    if (!teamName || teamName === "TBD") return `<span style="white-space:nowrap; display:inline-flex; align-items:center; gap:6px;">🏁 <strong>TBD</strong></span>`;
    const actualTeam = groupRankings[teamName] || teamName;
    const owner = teamStats[actualTeam] ? teamStats[actualTeam].owner : "?";
    
    if (includeOwner) {
        return `<span style="white-space:nowrap; display:inline-flex; align-items:center; gap:6px;">
                    ${getFlag(actualTeam)}
                    <span><strong>${actualTeam}</strong> <span style="font-size:0.8em; color:#888;">(${owner})</span></span>
                </span>`;
    }
    return `<span style="white-space:nowrap; display:inline-flex; align-items:center; gap:6px;">
                ${getFlag(actualTeam)}
                <strong>${actualTeam}</strong>
            </span>`;
}

function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-'+id).classList.add('active');
    
    if(id === 'fixtures') {
        setTimeout(() => {
            let el = document.getElementById('current-match');
            if(el) el.scrollIntoView({behavior: 'smooth', block: 'center'});
        }, 150);
    }
}

function normalizeData(data) {
    if (!data) return [];
    if (typeof data === 'string') { try { data = JSON.parse(data); } catch(e) { return []; } }
    if (Array.isArray(data)) return data;
    if (typeof data === 'object') return Object.keys(data).map(k => ({ ...data[k], _key: k, _value: data[k] }));
    return [];
}

// V38: Upgraded Smart Key Finder (handles partial matches like "Match ID" perfectly)
function findKey(obj, keywords) {
    if (!obj || typeof obj !== 'object') return undefined;
    let keys = Object.keys(obj);
    
    // 1. Try Exact Matches first (safest)
    for (let kw of keywords) {
        let exactMatch = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === kw.toLowerCase().replace(/[^a-z0-9]/g, ''));
        if (exactMatch) return obj[exactMatch];
    }
    
    // 2. Try Partial Matches (handles "Match ID", "Home Score", etc.)
    for (let kw of keywords) {
        let cleanKw = kw.toLowerCase().replace(/[^a-z0-9]/g, '');
        let partialMatch = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanKw));
        if (partialMatch) return obj[partialMatch];
    }
    return undefined;
}

function logDebug(msg) {
    const d = document.getElementById('debug-console');
    if (d) { d.innerHTML += `> ${msg}<br>`; }
}

window.callback = function(parsedData) {
    logDebug("<span style='color:lime;'>SUCCESS: V38 Payload Intercepted!</span>");
    try {
        appData.scores = normalizeData(parsedData.Scores || parsedData.scores);
        appData.fixtures = normalizeData(parsedData.Fixtures || parsedData.fixtures);
        appData.config = normalizeData(parsedData.Owners || parsedData.owners || parsedData.Config || parsedData.config);
        appData.sweets = normalizeData(parsedData.Sweets || parsedData.sweets);
        appData.transfers = normalizeData(parsedData.TransferLog || parsedData.transferLog || parsedData.Transfers || parsedData.transfers);
        
        logDebug("<span style='color:cyan;'>--- DATA LOAD CHECKS ---</span>");
        logDebug(`CONFIG TAB: ${appData.config.length} rows.`);
        logDebug(`FIXTURES TAB: ${appData.fixtures.length} rows.`);
        logDebug(`SCORES TAB: ${appData.scores.length} rows.`);
        
        // Output Row 0 to verify the column headers being passed
        if(appData.scores.length > 0) {
            logDebug(`SCORES ROW 0 HEADERS SEEN: ${JSON.stringify(Object.keys(appData.scores[0]))}`);
        }
        
        logDebug("<span style='color:cyan;'>------------------------</span>");

        processDataEngine();
        document.getElementById('sync-status').innerText = `Data Live!`;
    } catch(e) { 
        logDebug(`<span style='color:red;'>PARSE ERROR: ${e.message}</span>`);
        console.error(e); 
    }
};

function init() {
    logDebug("Firing network request to Google Apps Script...");
    document.getElementById('sync-status').innerText = "Downloading Google Sheet...";
    const script = document.createElement('script');
    
    script.src = SCRIPT_URL + "?action=getAll&nocache=" + new Date().getTime();
    
    script.onload = () => { logDebug("Network request complete. Awaiting JSONP execution..."); };
    script.onerror = () => { 
        logDebug("<span style='color:red;'>🚨 FATAL ERROR: The Google Apps Script refused to load!</span>");
        document.getElementById('sync-status').innerText = "Network Error."; 
    };
    
    document.body.appendChild(script);
}

async function saveScore(matchId) {
    let btn = document.getElementById('btn-save-' + matchId);
    let hG = document.getElementById('hg-' + matchId).value;
    let aG = document.getElementById('ag-' + matchId).value;
    let isAet = document.getElementById('aet-' + matchId)?.checked || false;
    let pHome = document.getElementById('ph-' + matchId)?.value || "";
    let pAway = document.getElementById('pa-' + matchId)?.value || "";
    
    if(hG === "" || aG === "") { alert("Please enter both scores."); return; }
    
    btn.innerText = "SAVING...";
    btn.classList.add('loading');
    
    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'score', matchId: matchId, hG: hG, aG: aG, isAet: isAet, pHome: pHome, pAway: pAway })
        });
        
        // Find existing match key in our expanded array
        let existing = appData.scores.find(m => parseInt(m._key || findKey(m, ['matchid', 'match', 'id'])) == matchId);
        if (!existing) appData.scores.push({ _key: matchId, hS: hG, aS: aG, pens: pHome + "-" + pAway, aet: isAet });
        else { existing.hS = hG; existing.aS = aG; existing.pens = pHome + "-" + pAway; existing.aet = isAet; }
        
        btn.innerText = "SAVED!";
        btn.style.background = "#27ae60";
        setTimeout(() => { processDataEngine(); }, 500); 
    } catch(e) {
        alert("Save failed. Check network.");
        btn.innerText = "SAVE RESULT";
        btn.classList.remove('loading');
    }
}

async function executeTransfer() {
    const sel1 = document.getElementById('transfer-team-1');
    const sel2 = document.getElementById('transfer-team-2');
    const btn = document.getElementById('btn-exec-transfer');
    
    const t1 = sel1.value; const t2 = sel2.value;
    if(!t1 || !t2 || t1 === t2) { alert("Please select two different teams."); return; }
    
    const p1 = teamStats[t1].owner; const p2 = teamStats[t2].owner;
    if(!confirm(`Trade ${t1} (${p1}) for ${t2} (${p2})?`)) return;
    
    btn.innerText = "SWAPPING...";
    btn.classList.add('loading');
    
    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'transfer', t1: t1, p1: p1, t2: t2, p2: p2 })
        });
        
        let c1 = appData.config.find(c => getStandardName(c.Team || c.team || c._key) === t1);
        let c2 = appData.config.find(c => getStandardName(c.Team || c.team || c._key) === t2);
        if(c1) { c1.Owner = p2; c1._value = p2; }
        if(c2) { c2.Owner = p1; c2._value = p1; }
        
        let dStr = new Date().toISOString().split('T')[0];
        appData.transfers.push({ date: dStr, person1: p1, team1: t1, person2: p2, team2: t2 });
        
        btn.innerText = "TRADE COMPLETE!";
        btn.style.background = "#27ae60";
        setTimeout(() => { 
            btn.innerText = "Confirm Transfer"; 
            btn.style.background = "var(--primary)";
            btn.classList.remove('loading');
            sel1.value = ""; sel2.value = "";
            processDataEngine(); 
        }, 1500); 
    } catch(e) {
        alert("Transfer failed.");
        btn.innerText = "Confirm Transfer";
        btn.classList.remove('loading');
    }
}

async function adjustSweets(member, change) {
    if(!familyStats[member]) return;
    let current = familyStats[member].sweetsTaken;
    let newVal = current + change;
    if(newVal < 0) newVal = 0;
    
    familyStats[member].sweetsTaken = newVal;
    document.getElementById(`sweet-val-${member}`).innerText = newVal;
    renderLeaderboard();
    
    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'sweets', member: member, val: newVal })
        });
    } catch(e) { console.error("Sweets sync failed."); }
}

function updateManualScore(matchId, field, value) {
    if (!manualScores[matchId]) manualScores[matchId] = { hG: "", aG: "", pHome: "", pAway: "", aet: false };
    if (field === 'aet') manualScores[matchId][field] = value.checked;
    else manualScores[matchId][field] = value;
    processDataEngine();
}

function processDataEngine() {
    teamStats = {}; familyStats = {}; matchTeamsMap = {}; groupRankings = {};
    
    appData.config.forEach(c => {
        let teamName = getStandardName(c.Team || c.team || findKey(c, ['team']) || c._key);
        let ownerName = c.Owner || c.owner || findKey(c, ['owner']) || c._value;
        if(teamName && teamName.length > 3) {
            teamStats[teamName] = { pld: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, owner: ownerName || "Unassigned", group: "", status: "Active" };
            if (ownerName && !familyStats[ownerName]) {
                familyStats[ownerName] = { ptsGroups: 0, ptsR32: 0, ptsR16: 0, ptsQF: 0, ptsSF: 0, ptsFinal: 0, totalPts: 0, sweetsTaken: 0 };
            }
        }
    });

    appData.sweets.forEach(s => {
        let member = s._key || findKey(s, ['member', 'name']);
        let taken = s._value || findKey(s, ['awarded', 'sweets', 'taken']);
        if (member && familyStats[member]) familyStats[member].sweetsTaken = parseInt(taken) || 0;
    });

    let sortedFixtures = [...appData.fixtures].sort((a, b) => new Date(findKey(a, ['date']) || 0) - new Date(findKey(b, ['date']) || 0));

    sortedFixtures.forEach(f => {
        let mId = parseInt(findKey(f, ['matchid', 'match', 'id']));
        let stage = findKey(f, ['stage', 'round', 'group']);
        let t1 = getStandardName(findKey(f, ['hometeam', 'team1', 'home']));
        let t2 = getStandardName(findKey(f, ['awayteam', 'team2', 'away']));

        if (stage && String(stage).toLowerCase().includes("group")) {
            let grp = String(stage).trim();
            if (teamStats[t1]) teamStats[t1].group = grp;
            if (teamStats[t2]) teamStats[t2].group = grp;
        }
        if(mId && t1 && t2) matchTeamsMap[mId] = { h: t1, a: t2, stage: stage };
    });

    let processedMatches = [];
    appData.scores.forEach(match => processedMatches.push(match));

    Object.keys(manualScores).forEach(mId => {
        let man = manualScores[mId];
        if (man.hG !== "" && man.aG !== "") {
            let existing = processedMatches.find(m => parseInt(m._key || findKey(m, ['matchid', 'match', 'id'])) == mId);
            if (!existing) processedMatches.push({ _key: mId, hS: man.hG, aS: man.aG, pens: man.pHome + "-" + man.pAway, aet: man.aet });
            else { existing.hS = man.hG; existing.aS = man.aG; existing.pens = man.pHome + "-" + man.pAway; existing.aet = man.aet; }
        }
    });

    processedMatches.forEach(match => {
        let mId = parseInt(match._key || findKey(match, ['matchid', 'match', 'id']));
        let hG_raw = match.hS !== undefined ? match.hS : findKey(match, ['homescore', 'score1', 'hg', 'home']);
        let aG_raw = match.aS !== undefined ? match.aS : findKey(match, ['awayscore', 'score2', 'ag', 'away']);
        
        let pensStr = String(match.pens || "");
        let pHome = parseInt(findKey(match, ['penaltieshome', 'homepen', 'penhome', 'ph'])) || 0;
        let pAway = parseInt(findKey(match, ['penaltiesaway', 'awaypen', 'penaway', 'pa'])) || 0;
        if (pensStr.includes('-')) { let parts = pensStr.split('-'); pHome = parseInt(parts[0])||0; pAway = parseInt(parts[1])||0; }

        if (!mId || hG_raw === "" || aG_raw === "" || hG_raw == null || aG_raw == null) return;
        
        let tMap = matchTeamsMap[mId];
        if (!tMap) return; 
        
        let h = tMap.h, a = tMap.a;
        h = groupRankings[h] || h; 
        a = groupRankings[a] || a;
        
        let hG = parseInt(hG_raw), aG = parseInt(aG_raw);
        if (isNaN(hG) || isNaN(aG)) return;

        // Group Stage Restrictions (1-72)
        if (mId <= 72) {
            if(teamStats[h]) { teamStats[h].pld++; teamStats[h].gf += hG; teamStats[h].ga += aG; teamStats[h].gd = teamStats[h].gf - teamStats[h].ga; }
            if(teamStats[a]) { teamStats[a].pld++; teamStats[a].gf += aG; teamStats[a].ga += hG; teamStats[a].gd = teamStats[a].gf - teamStats[a].ga; }

            if (hG > aG) {
                if(teamStats[h]) { teamStats[h].w++; teamStats[h].pts += 3; }
                if(teamStats[a]) { teamStats[a].l++; }
            } else if (hG < aG) {
                if(teamStats[a]) { teamStats[a].w++; teamStats[a].pts += 3; }
                if(teamStats[h]) { teamStats[h].l++; }
            } else {
                if(teamStats[h]) { teamStats[h].d++; teamStats[h].pts += 1; }
                if(teamStats[a]) { teamStats[a].d++; teamStats[a].pts += 1; }
            }
        } else {
            // Knockout Stages
            let ptsAwarded = mId <= 88 ? 5 : mId <= 96 ? 7 : mId <= 100 ? 10 : mId <= 102 ? 25 : 50;                     
            let winner = (hG > aG || pHome > pAway) ? h : (aG > hG || pAway > pHome ? a : null);
            let loser = winner === h ? a : h;
            
            if(winner && teamStats[winner]) {
                teamStats[winner].status = tMap.stage;
                let owner = teamStats[winner].owner;
                if(familyStats[owner]) {
                    if(mId <= 88) familyStats[owner].ptsR32 += ptsAwarded;
                    else if(mId <= 96) familyStats[owner].ptsR16 += ptsAwarded;
                    else if(mId <= 100) familyStats[owner].ptsQF += ptsAwarded;
                    else if(mId <= 102) familyStats[owner].ptsSF += ptsAwarded;
                    else familyStats[owner].ptsFinal += ptsAwarded;
                    familyStats[owner].totalPts += ptsAwarded;
                }
            }
            if(loser && teamStats[loser]) { teamStats[loser].status = "Out (" + tMap.stage + ")"; }
        }
    });

    const groupNames = ["Group A", "Group B", "Group C", "Group D", "Group E", "Group F", "Group G", "Group H", "Group I", "Group J", "Group K", "Group L"];
    groupNames.forEach(g => {
        let letter = g.replace("Group ", "");
        let gTeams = Object.keys(teamStats).filter(t => teamStats[t].group === g);
        gTeams.sort((a, b) => {
            if (teamStats[b].pts !== teamStats[a].pts) return teamStats[b].pts - teamStats[a].pts;
            if (teamStats[b].gd !== teamStats[a].gd) return teamStats[b].gd - teamStats[a].gd;
            return teamStats[b].gf - teamStats[a].gf;
        });
        if(gTeams.length > 0 && teamStats[gTeams[0]].pld > 0) groupRankings["1" + letter] = gTeams[0];
        if(gTeams.length > 1 && teamStats[gTeams[1]].pld > 0) groupRankings["2" + letter] = gTeams[1];
        if(gTeams.length > 2 && teamStats[gTeams[2]].pld > 0) groupRankings["3" + letter] = gTeams[2];
    });

    Object.keys(teamStats).forEach(team => {
        const owner = teamStats[team].owner;
        if (familyStats[owner]) {
            familyStats[owner].ptsGroups += teamStats[team].pts;
            familyStats[owner].totalPts += teamStats[team].pts;
        }
    });

    render(sortedFixtures, processedMatches);
}

function render(sortedFixtures, processedMatches) {
    renderLeaderboard(); renderGroups(); renderBracket(processedMatches); renderFixtures(sortedFixtures, processedMatches); renderTeams(); renderTransfers();
}

function renderLeaderboard() {
    const div = document.getElementById('leaderboard-data');
    let html = `<div class="table-container"><table><tr>
        <th style="width:25%;">Member</th><th>Grps</th><th>R32</th><th>R16</th><th>QF</th><th>SF</th><th>Fin</th><th>Pts</th><th>Sweets</th><th>Bal</th>
    </tr>`;
    
    const sorted = Object.entries(familyStats).sort((a, b) => (b[1].totalPts - b[1].sweetsTaken) - (a[1].totalPts - a[1].sweetsTaken));
    
    sorted.forEach(([name, stats]) => {
        const balance = stats.totalPts - stats.sweetsTaken;
        html += `<tr>
            <td><strong>${name}</strong></td>
            <td>${stats.ptsGroups}</td><td>${stats.ptsR32}</td><td>${stats.ptsR16}</td>
            <td>${stats.ptsQF}</td><td>${stats.ptsSF}</td><td>${stats.ptsFinal}</td>
            <td style="font-weight:bold;">${stats.totalPts}</td>
            <td>
                <div class="sweets-ctrl">
                    <button class="sweets-btn" onclick="adjustSweets('${name}', -1)">-</button>
                    <span id="sweet-val-${name}" style="min-width:15px; display:inline-block; text-align:center;">${stats.sweetsTaken}</span>
                    <button class="sweets-btn" onclick="adjustSweets('${name}', 1)">+</button>
                </div>
            </td>
            <td style="color:${balance > 0 ? 'green' : (balance < 0 ? 'red' : 'inherit')}; font-weight:900; font-size:14px;">${balance}</td>
        </tr>`;
    });
    div.innerHTML = html + `</table></div>`;
}

function renderGroups() {
    const div = document.getElementById('groups-data');
    let html = "";
    ["Group A", "Group B", "Group C", "Group D", "Group E", "Group F", "Group G", "Group H", "Group I", "Group J", "Group K", "Group L"].forEach(g => {
        let gTeams = Object.keys(teamStats).filter(t => teamStats[t].group === g);
        if (gTeams.length === 0) return;
        gTeams.sort((a, b) => {
            if (teamStats[b].pts !== teamStats[a].pts) return teamStats[b].pts - teamStats[a].pts;
            if (teamStats[b].gd !== teamStats[a].gd) return teamStats[b].gd - teamStats[a].gd;
            return teamStats[b].gf - teamStats[a].gf;
        });
        html += `<h4 style="margin:20px 0 5px 0; color:var(--primary);">${g}</h4><div class="table-container"><table><tr><th style="width:40%;">Team</th><th>Pld</th><th>GD</th><th>Pts</th></tr>`;
        gTeams.forEach(t => {
            let st = teamStats[t];
            html += `<tr><td>${formatTeam(t, true)}</td><td>${st.pld}</td><td>${st.gd > 0 ? '+'+st.gd : st.gd}</td><td><strong>${st.pts}</strong></td></tr>`;
        });
        html += `</table></div>`;
    });
    div.innerHTML = html;
}

function renderFixtures(sortedFixtures, processedMatches) {
    const div = document.getElementById('fixtures-data');
    let html = ``;
    let foundNext = false;
    
    sortedFixtures.forEach(f => {
        let mId = parseInt(findKey(f, ['matchid', 'match', 'id']));
        if(!mId) return;
        
        let stage = findKey(f, ['stage', 'round']) || "";
        let loc = findKey(f, ['location', 'venue', 'stadium']) || "";
        let dateRaw = findKey(f, ['date']);
        
        let dateStr = ""; let timeStr = "";
        if (dateRaw) {
            let dObj = new Date(dateRaw);
            dateStr = dObj.toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'});
            timeStr = dObj.toLocaleTimeString(undefined, {hour:'2-digit', minute:'2-digit'});
            if(timeStr === "00:00" || timeStr.includes("12:00 AM")) timeStr = ""; 
        }
        
        let t1Raw = getStandardName(findKey(f, ['hometeam', 'team1', 'home']));
        let t2Raw = getStandardName(findKey(f, ['awayteam', 'team2', 'away']));
        
        let t1 = groupRankings[t1Raw] || t1Raw;
        let t2 = groupRankings[t2Raw] || t2Raw;

        let o1 = teamStats[t1] ? teamStats[t1].owner : "?";
        let o2 = teamStats[t2] ? teamStats[t2].owner : "?";
        
        let score = processedMatches.find(s => parseInt(s._key || findKey(s, ['matchid', 'match', 'id'])) === mId);
        let man = manualScores[mId] || { hG: "", aG: "", pHome: "", pAway: "", aet: false };

        let hG = score && score.hS !== undefined && score.hS !== "" ? score.hS : man.hG;
        let aG = score && score.aS !== undefined && score.aS !== "" ? score.aS : man.aG;
        let aet = score && score.aet !== undefined ? score.aet : man.aet;
        
        let pHome = man.pHome || ""; let pAway = man.pAway || "";
        if (score) {
            let pensStr = String(score.pens || "");
            if (pensStr.includes('-')) { let pts = pensStr.split('-'); pHome = pts[0]; pAway = pts[1]; }
            else { pHome = findKey(score, ['penaltieshome', 'homepen', 'penhome', 'ph']) || pHome; pAway = findKey(score, ['penaltiesaway', 'awaypen', 'penaway', 'pa']) || pAway; }
        }

        let isNextId = ""; let badgeHtml = "";
        if (hG === "" && !foundNext) { isNextId = `id="current-match"`; foundNext = true; badgeHtml = `<span style="background:red;color:white;padding:2px 4px;border-radius:3px;">NEXT</span>`; }
        
        let knockoutInput = mId > 72 ? `
            <div class="knockout-controls">
                <label class="aet-toggle"><input type="checkbox" id="aet-${mId}" ${aet ? 'checked':''} onchange="updateManualScore(${mId}, 'aet', this)"> AET</label>
                <div class="pen-inputs">
                    <input type="number" class="pen-input" id="ph-${mId}" value="${pHome}" placeholder="p" onchange="updateManualScore(${mId}, 'pHome', this.value)">
                    <input type="number" class="pen-input" id="pa-${mId}" value="${pAway}" placeholder="p" onchange="updateManualScore(${mId}, 'pAway', this.value)">
                </div>
            </div>` : "";

        html += `
        <div class="match-row-horizontal" ${isNextId}>
            <div class="match-meta-header">
                <div><strong>Match ${mId}</strong> | ${dateStr} ${timeStr ? '- '+timeStr : ''}</div>
                <div>${badgeHtml} ${stage} | ${loc}</div>
            </div>
            <div class="match-teams-container">
                <div class="team-block home">
                    <span class="team-name">${t1}</span>
                    <span class="team-owner">${o1}</span>
                </div>
                <div class="score-center">
                    <div class="score-inputs">
                        <input type="number" id="hg-${mId}" class="score-box-input" value="${hG}" onchange="updateManualScore(${mId}, 'hG', this.value)">
                        <span>-</span>
                        <input type="number" id="ag-${mId}" class="score-box-input" value="${aG}" onchange="updateManualScore(${mId}, 'aG', this.value)">
                    </div>
                    ${knockoutInput}
                </div>
                <div class="team-block away">
                    <span class="team-name">${t2}</span>
                    <span class="team-owner">${o2}</span>
                </div>
            </div>
            <button id="btn-save-${mId}" class="btn-save" onclick="saveScore(${mId})">Save Result</button>
        </div>`;
    });
    div.innerHTML = html;
}

function renderBracket(processedMatches) {
    const div = document.getElementById('bracket-data');
    const rounds = [ {key: "R32", title: "R32"}, {key: "R16", title: "R16"}, {key: "QF", title: "QF"}, {key: "SF", title: "SF"}, {key: "FINAL", title: "Final"} ];
    let activeMatches = { ...matchTeamsMap }; 

    KO_PATHS.forEach(path => {
        const score = processedMatches.find(s => parseInt(s._key || findKey(s, ['matchid', 'match', 'id'])) === path.id);
        if (score && path.next) {
            let tempH = score.hS !== undefined ? score.hS : findKey(score, ['homescore', 'score1', 'hg']);
            let tempA = score.aS !== undefined ? score.aS : findKey(score, ['awayscore', 'score2', 'ag']);
            const hG = parseInt(tempH); const aG = parseInt(tempA);
            
            let pensStr = String(score.pens || "");
            let pHome = parseInt(findKey(score, ['penaltieshome', 'homepen', 'penhome'])) || 0;
            let pAway = parseInt(findKey(score, ['penaltiesaway', 'awaypen', 'penaway'])) || 0;
            if (pensStr.includes('-')) { let parts = pensStr.split('-'); pHome = parseInt(parts[0])||0; pAway = parseInt(parts[1])||0; }

            let tMap = matchTeamsMap[path.id];
            let actualH = groupRankings[tMap?.h] || tMap?.h;
            let actualA = groupRankings[tMap?.a] || tMap?.a;

            const winner = (hG > aG || pHome > pAway) ? actualH : (aG > hG || pAway > pHome ? actualA : null); 
            if (winner) {
                if (!activeMatches[path.next]) activeMatches[path.next] = {h: "TBD", a: "TBD"};
                if (path.isHome) activeMatches[path.next].h = winner;
                else activeMatches[path.next].a = winner;
            }
        }
    });

    let html = "";
    rounds.forEach(r => {
        html += `<div class="bracket-round"><div class="round-title">${r.title}</div>`;
        KO_PATHS.filter(p => p.r === r.key).forEach(p => {
            const matchData = activeMatches[p.id] || {h: "TBD", a: "TBD"};
            const score = processedMatches.find(s => parseInt(s._key || findKey(s, ['matchid', 'match', 'id'])) === p.id);
            
            let hG = "-", aG = "-";
            if (score) {
                let tempH = score.hS !== undefined ? score.hS : findKey(score, ['homescore', 'score1', 'hg']);
                let tempA = score.aS !== undefined ? score.aS : findKey(score, ['awayscore', 'score2', 'ag']);
                if (tempH !== "" && tempH !== undefined) hG = tempH;
                if (tempA !== "" && tempA !== undefined) aG = tempA;
            }

            let finalH = groupRankings[matchData.h] || matchData.h;
            let finalA = groupRankings[matchData.a] || matchData.a;

            html += `<div class="match-card" style="background:#fff; border-radius:6px; padding:10px; margin-bottom:10px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size:10px; color:#666; text-align:center; border-bottom:1px solid #eee; padding-bottom:4px; margin-bottom:6px;">Match ${p.id}</div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    ${formatTeam(finalH, true)} <span style="font-weight:bold;">${hG}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    ${formatTeam(finalA, true)} <span style="font-weight:bold;">${aG}</span>
                </div>
            </div>`;
        });
        html += `</div>`;
    });
    div.innerHTML = html;
}

function renderTeams() {
    const div = document.getElementById('team-tables');
    let html = "";
    
    Object.keys(familyStats).forEach(owner => {
        html += `<div class="family-squad-section">
            <h3>${owner}'s Squad</h3>
            <div class="table-container"><table><tr><th style="width:40%;">Team</th><th>Pld</th><th>GD</th><th>Pts</th><th>Status</th></tr>`;
        
        let memberTeams = Object.keys(teamStats).filter(t => teamStats[t].owner === owner).sort((a,b) => teamStats[b].pts - teamStats[a].pts);
        
        memberTeams.forEach(t => {
            let st = teamStats[t];
            let statusColor = st.status.includes("Out") ? "red" : "green";
            html += `<tr>
                <td>${formatTeam(t, false)}</td>
                <td>${st.pld}</td>
                <td>${st.gd > 0 ? '+'+st.gd : st.gd}</td>
                <td><strong>${st.pts}</strong></td>
                <td style="color:${statusColor}; font-weight:bold;">${st.status}</td>
            </tr>`;
        });
        html += `</table></div></div>`;
    });
    div.innerHTML = html;
}

function renderTransfers() {
    const div = document.getElementById('history-data');
    
    let teamOptions = `<option value="">-- Select Team --</option>`;
    let sortedTeams = Object.keys(teamStats).sort((a,b) => teamStats[a].owner.localeCompare(teamStats[b].owner));
    sortedTeams.forEach(t => { teamOptions += `<option value="${t}">${t} (Owned by ${teamStats[t].owner})</option>`; });
    
    let html = `
    <div class="family-squad-section">
        <h3>Execute a Swap</h3>
        <select id="transfer-team-1" class="transfer-select">${teamOptions}</select>
        <div style="text-align:center; padding:5px; font-size:20px;">🔄</div>
        <select id="transfer-team-2" class="transfer-select">${teamOptions}</select>
        <button id="btn-exec-transfer" class="btn-save" onclick="executeTransfer()">Confirm Transfer</button>
    </div>`;

    html += `<h3>Transfer History</h3><div class="table-container"><table><tr><th style="width:20%">Date</th><th style="width:40%">Traded</th><th style="width:40%">For</th></tr>`;
    if(!appData.transfers || appData.transfers.length === 0) {
        html += `<tr><td colspan="3" style="text-align:center;">No previous transfers recorded.</td></tr>`;
    } else {
        appData.transfers.forEach(t => { 
            const d = findKey(t, ["date", "timestamp"]);
            const p1 = findKey(t, ["person1", "member1"]);
            const t1 = findKey(t, ["team1"]);
            const p2 = findKey(t, ["person2", "member2"]);
            const t2 = findKey(t, ["team2"]);
            if(d && p1) html += `<tr><td>${d}</td><td><strong>${p1}</strong> gets<br>${formatTeam(t2, false)}</td><td><strong>${p2}</strong> gets<br>${formatTeam(t1, false)}</td></tr>`; 
        });
    }
    div.innerHTML = html + `</table></div>`;
}

init();
