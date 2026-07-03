window.addEventListener('error', function(e) {
    const d = document.getElementById('debug-console');
    if(d) { d.style.display = 'block'; d.innerHTML += `<span style="color:red;">CRITICAL JS ERROR: ${e.message}</span><br>`; }
});

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwJg28FI1maQPvXELfK3kbgM7PNMj-_pQ73w0b11TPkW3jTGdftEhto7OfBu-2Qc5Medg/exec";

let appData = { scores: [], fixtures: [], config: [], sweets: [], transfers: [] };
let manualScores = {}; 
let teamStats = {};      
let familyStats = {};    
let eliminatedTeams = {};
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

const FLAGS = {
    "Mexico":"🇲🇽", "South Africa":"🇿🇦", "South Korea":"🇰🇷", "Czechia":"🇨🇿",
    "Switzerland":"🇨🇭", "Canada":"🇨🇦", "Bosnia & Herzegovina":"🇧🇦", "Qatar":"🇶🇦",
    "Brazil":"🇧🇷", "Morocco":"🇲🇦", "Australia":"🇦🇺", "Turkiye":"🇹🇷",
    "Germany":"🇩🇪", "Ivory Coast":"🇨🇮", "Ecuador":"🇪🇨", "Curacao":"🇨🇼",
    "Netherlands":"🇳🇱", "Japan":"🇯🇵", "Sweden":"🇸🇪", "Tunisia":"🇹🇳",
    "Belgium":"🇧🇪", "Egypt":"🇪🇬", "Iran":"🇮🇷", "New Zealand":"🇳🇿",
    "Spain":"🇪🇸", "Cape Verde":"🇨🇻", "Saudi Arabia":"🇸🇦", "Uruguay":"🇺🇾",
    "France":"🇫🇷", "Norway":"🇳🇴", "Senegal":"🇸🇳", "Iraq":"🇮🇶",
    "Argentina":"🇦🇷", "Austria":"🇦🇹", "Algeria":"🇩🇿", "Jordan":"🇯🇴",
    "Colombia":"🇨🇴", "Portugal":"🇵🇹", "DR Congo":"🇨🇩", "Uzbekistan":"🇺🇿",
    "Panama":"🇵🇦", "Haiti":"🇭🇹", "Ghana":"🇬🇭", "Croatia":"🇭🇷", "United States":"🇺🇸",
    "England":"🇬🇧", "Scotland":"🇬🇧" 
};

// Case-Insensitive Flag Matcher
function getFlag(team) {
    if(!team) return "🏁";
    let tLower = team.toLowerCase().trim();
    for(let key in FLAGS) {
        if(key.toLowerCase() === tLower) return FLAGS[key];
    }
    return "🏁";
}

function getStandardName(name) {
    if (!name) return "";
    let n = name.toString().trim();
    // Protect bracket placeholders (1A, 2B, etc.) but allow 'USA' to normalize
    if (/^[1-3][A-L]$/i.test(n)) return n.toUpperCase(); 
    
    const lowerN = n.toLowerCase();
    const map = {
        "usa": "United States", "korea republic": "South Korea", 
        "bosnia and herzegovina": "Bosnia & Herzegovina", "türkiye": "Turkiye", 
        "côte d'ivoire": "Ivory Coast", "curaçao": "Curacao", "cabo verde": "Cape Verde", 
        "congo dr": "DR Congo", "ir iran": "Iran"
    };
    if (map[lowerN]) return map[lowerN];
    return n;
}

function formatTeam(teamName, includeOwner = true) {
    if (!teamName || teamName === "TBD") return "TBD";
    const actualTeam = groupRankings[teamName] || teamName;
    const owner = teamStats[actualTeam] ? teamStats[actualTeam].owner : "?";
    
    if (includeOwner) {
        return `<span style="white-space:nowrap; display:inline-flex; align-items:center; gap:5px;">
                    <span style="font-size:18px;">${getFlag(actualTeam)}</span>
                    <span><strong>${actualTeam}</strong> <span style="font-size:0.8em; color:#888;">(${owner})</span></span>
                </span>`;
    }
    return `<span style="white-space:nowrap; display:inline-flex; align-items:center; gap:5px;">
                <span style="font-size:18px;">${getFlag(actualTeam)}</span>
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

function findKey(obj, keywords) {
    if (!obj || typeof obj !== 'object') return undefined;
    let keys = Object.keys(obj);
    for (let kw of keywords) {
        let exactMatch = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === kw.toLowerCase().replace(/[^a-z0-9]/g, ''));
        if (exactMatch) return obj[exactMatch];
    }
    return undefined;
}

window.callback = function(parsedData) {
    try {
        appData.scores = normalizeData(parsedData.Scores || parsedData.scores);
        appData.fixtures = normalizeData(parsedData.Fixtures || parsedData.fixtures);
        appData.config = normalizeData(parsedData.Owners || parsedData.owners || parsedData.Config || parsedData.config);
        appData.sweets = normalizeData(parsedData.Sweets || parsedData.sweets);
        appData.transfers = normalizeData(parsedData.TransferLog || parsedData.transferLog || parsedData.Transfers || parsedData.transfers);
        
        processDataEngine();
        document.getElementById('sync-status').innerText = `Data Live!`;
    } catch(e) { console.error(e); }
};

function init() {
    document.getElementById('sync-status').innerText = "Downloading Google Sheet...";
    const script = document.createElement('script');
    script.src = SCRIPT_URL + "?action=getAll";
    script.onerror = () => { document.getElementById('sync-status').innerText = "Network Error."; };
    document.body.appendChild(script);
}

async function saveScore(matchId) {
    let btn = document.getElementById('btn-save-' + matchId);
    let hG = document.getElementById('hg-' + matchId).value;
    let aG = document.getElementById('ag-' + matchId).value;
    let pHome = document.getElementById('ph-' + matchId) ? document.getElementById('ph-' + matchId).value : "";
    let pAway = document.getElementById('pa-' + matchId) ? document.getElementById('pa-' + matchId).value : "";
    
    if(hG === "" || aG === "") { alert("Please enter both scores."); return; }
    
    btn.innerText = "SAVING...";
    btn.classList.add('loading');
    
    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'score', matchId: matchId, hG: hG, aG: aG, pHome: pHome, pAway: pAway })
        });
        
        let existing = appData.scores.find(m => parseInt(m._key || findKey(m, ['match', 'id'])) == matchId);
        if (!existing) appData.scores.push({ _key: matchId, hS: hG, aS: aG, pens: pHome + "-" + pAway });
        else { existing.hS = hG; existing.aS = aG; existing.pens = pHome + "-" + pAway; }
        
        btn.innerText = "SAVED!";
        btn.style.background = "#27ae60";
        setTimeout(() => { processDataEngine(); }, 500); 
    } catch(e) {
        alert("Save failed. Check network.");
        btn.innerText = "SAVE RESULT";
        btn.classList.remove('loading');
    }
}

// FULLY FUNCTIONAL TRANSFER EXECUTION
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
        
        // Update Local State for immediate UI refresh
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

function updateManualScore(matchId, field, value) {
    if (!manualScores[matchId]) manualScores[matchId] = { hG: "", aG: "", pHome: "", pAway: "" };
    manualScores[matchId][field] = value;
    processDataEngine();
}

function processDataEngine() {
    teamStats = {}; familyStats = {}; matchTeamsMap = {}; groupRankings = {};
    
    appData.config.forEach(c => {
        let teamName = getStandardName(c.Team || c.team || findKey(c, ['team']) || c._key);
        let ownerName = c.Owner || c.owner || findKey(c, ['owner']) || c._value;
        if(teamName && teamName.length > 3) {
            teamStats[teamName] = { pld: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, owner: ownerName || "Unassigned", group: "", status: "Active" };
            if (ownerName && !familyStats[ownerName]) familyStats[ownerName] = { totalPts: 0, sweetsTaken: 0 };
        }
    });

    appData.sweets.forEach(s => {
        let member = s._key || findKey(s, ['member', 'name']);
        let taken = s._value || findKey(s, ['awarded', 'sweets', 'taken']);
        if (member && familyStats[member]) familyStats[member].sweetsTaken = parseInt(taken) || 0;
    });

    let sortedFixtures = [...appData.fixtures].sort((a, b) => new Date(findKey(a, ['date']) || 0) - new Date(findKey(b, ['date']) || 0));

    sortedFixtures.forEach(f => {
        let mId = parseInt(findKey(f, ['match', 'id']));
        let stage = findKey(f, ['stage', 'round', 'group']);
        let t1 = getStandardName(findKey(f, ['team1', 'home']));
        let t2 = getStandardName(findKey(f, ['team2', 'away']));

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
            let existing = processedMatches.find(m => parseInt(m._key || findKey(m, ['match', 'id'])) == mId);
            if (!existing) processedMatches.push({ _key: mId, hS: man.hG, aS: man.aG, pens: man.pHome + "-" + man.pAway });
            else { existing.hS = man.hG; existing.aS = man.aG; existing.pens = man.pHome + "-" + man.pAway; }
        }
    });

    processedMatches.forEach(match => {
        let mId = parseInt(match._key || findKey(match, ['match', 'id']));
        let hG_raw = match.hS !== undefined ? match.hS : findKey(match, ['homescore', 'hg']);
        let aG_raw = match.aS !== undefined ? match.aS : findKey(match, ['awayscore', 'ag']);
        
        let pensStr = String(match.pens || "");
        let pHome = parseInt(findKey(match, ['penaltieshome', 'homepen', 'penhome'])) || 0;
        let pAway = parseInt(findKey(match, ['penaltiesaway', 'awaypen', 'penaway'])) || 0;
        if (pensStr.includes('-')) { let parts = pensStr.split('-'); pHome = parseInt(parts[0])||0; pAway = parseInt(parts[1])||0; }

        if (!mId || hG_raw === "" || aG_raw === "" || hG_raw == null || aG_raw == null) return;
        
        let tMap = matchTeamsMap[mId];
        if (!tMap) return; 
        
        let h = tMap.h, a = tMap.a;
        h = groupRankings[h] || h; 
        a = groupRankings[a] || a;
        
        let hG = parseInt(hG_raw), aG = parseInt(aG_raw);
        if (isNaN(hG) || isNaN(aG)) return;

        if(teamStats[h]) { teamStats[h].pld++; teamStats[h].gf += hG; teamStats[h].ga += aG; teamStats[h].gd = teamStats[h].gf - teamStats[h].ga; }
        if(teamStats[a]) { teamStats[a].pld++; teamStats[a].gf += aG; teamStats[a].ga += hG; teamStats[a].gd = teamStats[a].gf - teamStats[a].ga; }

        if (mId <= 72) {
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
            let ptsAwarded = mId <= 88 ? 5 : mId <= 96 ? 7 : mId <= 100 ? 10 : mId <= 103 ? 25 : 50;                     
            let winner = (hG > aG || pHome > pAway) ? h : a;
            let loser = winner === h ? a : h;
            
            if(teamStats[winner]) { teamStats[winner].pts += ptsAwarded; teamStats[winner].status = tMap.stage; }
            if(teamStats[loser]) { teamStats[loser].status = "Out (" + tMap.stage + ")"; }
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
        if (familyStats[owner]) familyStats[owner].totalPts += teamStats[team].pts;
    });

    render(sortedFixtures, processedMatches);
}

function render(sortedFixtures, processedMatches) {
    renderLeaderboard(); renderGroups(); renderBracket(processedMatches); renderFixtures(sortedFixtures, processedMatches); renderTeams(); renderTransfers();
}

function renderLeaderboard() {
    const div = document.getElementById('leaderboard-data');
    let html = `<div class="table-container"><table><tr><th>Member</th><th>Pts Earned</th><th>Sweets</th><th>Balance</th></tr>`;
    const sorted = Object.entries(familyStats).sort((a, b) => (b[1].totalPts - b[1].sweetsTaken) - (a[1].totalPts - a[1].sweetsTaken));
    sorted.forEach(([name, stats]) => {
        const balance = stats.totalPts - stats.sweetsTaken;
        html += `<tr><td><strong>${name}</strong></td><td>${stats.totalPts}</td><td>${stats.sweetsTaken}</td><td style="color:${balance > 0 ? 'green' : (balance < 0 ? 'red' : 'inherit')}; font-weight:900; font-size:16px;">${balance}</td></tr>`;
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
        html += `<h4 style="margin:20px 0 5px 0; color:var(--primary);">${g}</h4><div class="table-container"><table><tr><th>Team</th><th>Pld</th><th>GD</th><th>Pts</th></tr>`;
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
        let mId = parseInt(findKey(f, ['match', 'id']));
        if(!mId) return;
        
        let stage = findKey(f, ['stage', 'round']) || "";
        let loc = findKey(f, ['location', 'venue', 'stadium']) || "";
        let dateRaw = findKey(f, ['date']);
        let dateStr = dateRaw ? new Date(dateRaw).toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'}) : "";
        
        let t1Raw = getStandardName(findKey(f, ['team1', 'home']));
        let t2Raw = getStandardName(findKey(f, ['team2', 'away']));
        
        let t1 = groupRankings[t1Raw] || t1Raw;
        let t2 = groupRankings[t2Raw] || t2Raw;

        let o1 = teamStats[t1] ? teamStats[t1].owner : "?";
        let o2 = teamStats[t2] ? teamStats[t2].owner : "?";
        
        let score = processedMatches.find(s => parseInt(s._key || findKey(s, ['match', 'id'])) === mId);
        let man = manualScores[mId] || { hG: "", aG: "", pHome: "", pAway: "" };

        let hG = score && score.hS !== undefined && score.hS !== "" ? score.hS : man.hG;
        let aG = score && score.aS !== undefined && score.aS !== "" ? score.aS : man.aG;
        
        let pHome = man.pHome || ""; let pAway = man.pAway || "";
        if (score) {
            let pensStr = String(score.pens || "");
            if (pensStr.includes('-')) { let pts = pensStr.split('-'); pHome = pts[0]; pAway = pts[1]; }
            else { pHome = findKey(score, ['penaltieshome', 'homepen', 'penhome']) || pHome; pAway = findKey(score, ['penaltiesaway', 'awaypen', 'penaway']) || pAway; }
        }

        let isNextId = ""; let badgeHtml = "";
        if (hG === "" && !foundNext) { isNextId = `id="current-match" class="match-row-horizontal next-unplayed-match"`; foundNext = true; badgeHtml = `<span class="next-unplayed-badge">NEXT</span>`; }
        else { isNextId = `class="match-row-horizontal"`; }

        let penInputs = mId > 72 ? `<input type="number" class="pen-input" id="ph-${mId}" value="${pHome}" placeholder="p" onchange="updateManualScore(${mId}, 'pHome', this.value)"><input type="number" class="pen-input" id="pa-${mId}" value="${pAway}" placeholder="p" onchange="updateManualScore(${mId}, 'pAway', this.value)">` : ``;

        html += `
        <div ${isNextId}>
            <div class="match-meta-header">
                <div><strong>Match ${mId}</strong> | ${dateStr}</div>
                <div>${badgeHtml} ${stage} | ${loc}</div>
            </div>
            <div class="match-teams-container">
                <div class="team-block home">
                    <span class="team-flag">${getFlag(t1)}</span>
                    <span class="team-name">${t1}</span>
                    <span class="team-owner">${o1}</span>
                </div>
                <div class="score-center">
                    <div class="score-inputs">
                        <input type="number" id="hg-${mId}" class="score-box-input" value="${hG}" onchange="updateManualScore(${mId}, 'hG', this.value)">
                        <span class="score-dash">-</span>
                        <input type="number" id="ag-${mId}" class="score-box-input" value="${aG}" onchange="updateManualScore(${mId}, 'aG', this.value)">
                    </div>
                    <div class="pen-inputs">${penInputs}</div>
                </div>
                <div class="team-block away">
                    <span class="team-flag">${getFlag(t2)}</span>
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
        const score = processedMatches.find(s => parseInt(s._key || findKey(s, ['match', 'id'])) === path.id);
        if (score && path.next) {
            let tempH = score.hS !== undefined ? score.hS : findKey(score, ['homescore', 'team1score', 'score1', 'hg']);
            let tempA = score.aS !== undefined ? score.aS : findKey(score, ['awayscore', 'team2score', 'score2', 'ag']);
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
            const score = processedMatches.find(s => parseInt(s._key || findKey(s, ['match', 'id'])) === p.id);
            
            let hG = "-", aG = "-";
            if (score) {
                let tempH = score.hS !== undefined ? score.hS : findKey(score, ['homescore', 'team1score', 'score1', 'hg']);
                let tempA = score.aS !== undefined ? score.aS : findKey(score, ['awayscore', 'team2score', 'score2', 'ag']);
                if (tempH !== "" && tempH !== undefined) hG = tempH;
                if (tempA !== "" && tempA !== undefined) aG = tempA;
            }

            let finalH = groupRankings[matchData.h] || matchData.h;
            let finalA = groupRankings[matchData.a] || matchData.a;

            html += `<div class="match-card">
                <div style="font-size:10px; color:#666; text-align:center; border-bottom:1px solid #eee; padding-bottom:4px; margin-bottom:6px;">Match ${p.id}</div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    ${formatTeam(finalH, true)} <span class="score-box">${hG}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    ${formatTeam(finalA, true)} <span class="score-box">${aG}</span>
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
            <div class="table-container"><table><tr><th>Team</th><th>Pld</th><th>GD</th><th>Pts</th><th>Status</th></tr>`;
        
        let memberTeams = Object.keys(teamStats).filter(t => teamStats[t].owner === owner).sort((a,b) => teamStats[b].pts - teamStats[a].pts);
        
        memberTeams.forEach(t => {
            let st = teamStats[t];
            let statusColor = st.status.includes("Out") ? "red" : "green";
            html += `<tr>
                <td>${formatTeam(t, false)}</td>
                <td>${st.pld}</td>
                <td>${st.gd > 0 ? '+'+st.gd : st.gd}</td>
                <td><strong>${st.pts}</strong></td>
                <td style="color:${statusColor}; font-size:11px; font-weight:bold;">${st.status}</td>
            </tr>`;
        });
        html += `</table></div></div>`;
    });
    div.innerHTML = html;
}

function renderTransfers() {
    const div = document.getElementById('history-data');
    
    // Build active team options
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

    html += `<h3>Transfer History</h3><div class="table-container"><table><tr><th>Date</th><th>Traded</th><th>For</th></tr>`;
    if(!appData.transfers || appData.transfers.length === 0) {
        html += `<tr><td colspan="3" style="text-align:center;">No previous transfers recorded.</td></tr>`;
    } else {
        appData.transfers.forEach(t => { 
            const d = findKey(t, ["date", "timestamp"]);
            const p1 = findKey(t, ["person1", "member1"]);
            const t1 = findKey(t, ["team1"]);
            const p2 = findKey(t, ["person2", "member2"]);
            const t2 = findKey(t, ["team2"]);
            if(d && p1) html += `<tr><td style="font-size:11px;">${d}</td><td><strong>${p1}</strong> gets<br>${formatTeam(t2, false)}</td><td><strong>${p2}</strong> gets<br>${formatTeam(t1, false)}</td></tr>`; 
        });
    }
    div.innerHTML = html + `</table></div>`;
}

init();
