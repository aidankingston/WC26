window.addEventListener('error', function(e) {
    const d = document.getElementById('debug-console');
    if(d) { d.innerHTML += `<span style="color:red;">CRITICAL JS ERROR: ${e.message}</span><br>`; }
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

// All 48 Official Flags
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

function getFlag(team) { return FLAGS[team] || "🏁"; }

function getStandardName(name) {
    if (!name) return "";
    let n = name.toString().trim();
    if(n.length <= 3) return n; 
    const map = {
        "usa": "United States", "korea republic": "South Korea", 
        "bosnia and herzegovina": "Bosnia & Herzegovina", "türkiye": "Turkiye", 
        "côte d'ivoire": "Ivory Coast", "curaçao": "Curacao", "cabo verde": "Cape Verde", 
        "congo dr": "DR Congo", "ir iran": "Iran"
    };
    return map[n.toLowerCase()] || n;
}

// Global Team Formatter: Guarantees Flag and Owner everywhere
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
    
    // Auto-Scroll to Next Match
    if(id === 'fixtures') {
        setTimeout(() => {
            let el = document.getElementById('current-match');
            if(el) {
                el.scrollIntoView({behavior: 'smooth', block: 'center'});
            }
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
    } catch(e) {
        console.error(e);
    }
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
            body: JSON.stringify({ matchId: matchId, hG: hG, aG: aG, pHome: pHome, pAway: pAway })
        });
        
        let existing = appData.scores.find(m => parseInt(m._key || findKey(m, ['match', 'id'])) == matchId);
        if (!existing) {
            appData.scores.push({ _key: matchId, hS: hG, aS: aG, pens: pHome + "-" + pAway });
        } else {
            existing.hS = hG; existing.aS = aG; existing.pens = pHome + "-" + pAway;
        }
        
        btn.innerText = "SAVED!";
        btn.style.background = "#27ae60";
        setTimeout(() => { processDataEngine(); }, 500); 
    } catch(e) {
        alert("Save failed. Check console.");
        btn.innerText = "SAVE RESULT";
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
                        <input type="number" id="ag-${mId}" class="score-box-input" value="${aG}" onchange="updateManualScore(${mId}, '
