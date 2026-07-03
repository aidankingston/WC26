window.addEventListener('error', function(e) {
    const d = document.getElementById('debug-console');
    if(d) { d.style.display = 'block'; d.innerHTML += `<span style="color:red;">CRITICAL JS ERROR: ${e.message}</span><br>`; }
});

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwJg28FI1maQPvXELfK3kbgM7PNMj-_pQ73w0b11TPkW3jTGdftEhto7OfBu-2Qc5Medg/exec";

let appData = { scores: [], fixtures: [], config: [], sweets: [], transfers: [] };
let teamStats = {};      
let familyStats = {};    
let matchTeamsMap = {}; 
let groupRankings = {}; // Tracks 1A, 2B, etc.

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

function getFlag(team) { return FLAGS[team] || "🏁"; }

function formatTeam(teamName, includeOwner = true, stacked = false) {
    if (!teamName || teamName === "TBD") return "TBD";
    
    // Auto-Bracket Translator (e.g. converts "1A" to "Brazil")
    let translatedTeam = groupRankings[teamName] || teamName; 
    const owner = teamStats[translatedTeam] ? teamStats[translatedTeam].owner : "?";
    
    if (stacked) {
        return `<div style="text-align:center;"><span style="font-size:24px;">${getFlag(translatedTeam)}</span><br><strong>${translatedTeam}</strong><br><span style="font-size:0.8em; color:#666;">(${owner})</span></div>`;
    }
    
    if (includeOwner) {
        return `<span style="white-space:nowrap;">${getFlag(translatedTeam)} <strong>${translatedTeam}</strong> <span style="font-size:0.8em; color:#666;">(${owner})</span></span>`;
    }
    return `<span style="white-space:nowrap;">${getFlag(translatedTeam)} <strong>${translatedTeam}</strong></span>`;
}

function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-'+id).classList.add('active');
    
    if(id === 'fixtures') {
        setTimeout(() => {
            let el = document.querySelector('.next-match');
            if(el) el.scrollIntoView({behavior: 'smooth', block: 'center'});
        }, 100);
    }
}

function logDebug(msg) {
    const d = document.getElementById('debug-console');
    if (d) { d.innerHTML += `> ${msg}<br>`; }
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

function getStandardName(name) {
    if (!name) return "";
    let n = name.toString().trim();
    if(n.length <= 3) return n; // Preserve '1A', '2B' placeholders
    const map = {
        "usa": "United States", "korea republic": "South Korea", 
        "bosnia and herzegovina": "Bosnia & Herzegovina", "türkiye": "Turkiye", 
        "côte d'ivoire": "Ivory Coast", "curaçao": "Curacao", "cabo verde": "Cape Verde", 
        "congo dr": "DR Congo", "ir iran": "Iran"
    };
    return map[n.toLowerCase()] || n;
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
        logDebug(`<span style='color:red;'>PARSE ERROR: ${e.message}</span>`);
    }
};

function init() {
    document.getElementById('sync-status').innerText = "Downloading Google Sheet...";
    const script = document.createElement('script');
    script.src = SCRIPT_URL + "?action=getAll";
    script.onerror = () => { document.getElementById('sync-status').innerText = "Network Error."; };
    document.body.appendChild(script);
}

// Backend Save Function
async function saveScore(matchId) {
    let btn = document.getElementById('btn-save-' + matchId);
    let hG = document.getElementById('hg-' + matchId).value;
    let aG = document.getElementById('ag-' + matchId).value;
    let pHome = document.getElementById('ph-' + matchId) ? document.getElementById('ph-' + matchId).value : "";
    let pAway = document.getElementById('pa-' + matchId) ? document.getElementById('pa-' + matchId).value : "";
    
    if(hG === "" || aG === "") { alert("Please enter both scores."); return; }
    
    btn.innerText = "Saving...";
    btn.classList.add('loading');
    
    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matchId: matchId, hG: hG, aG: aG, pHome: pHome, pAway: pAway })
        });
        
        // Update local arrays for immediate visual feedback
        let existing = appData.scores.find(m => parseInt(m._key || findKey(m, ['match', 'id'])) == matchId);
        if (!existing) {
            appData.scores.push({ _key: matchId, hS: hG, aS: aG, pens: pHome + "-" + pAway });
        } else {
            existing.hS = hG; existing.aS = aG; existing.pens = pHome + "-" + pAway;
        }
        
        btn.innerText = "Saved!";
        btn.style.background = "green";
        setTimeout(() => { processDataEngine(); }, 500); // Recalculate everything!
    } catch(e) {
        alert("Save failed. Check console.");
        btn.innerText = "Save";
        btn.classList.remove('loading');
    }
}

function processDataEngine() {
    teamStats = {}; familyStats = {}; matchTeamsMap = {}; groupRankings = {};
    
    // 1. CONFIGS
    appData.config.forEach(c => {
        let teamName = getStandardName(c.Team || c.team || c._key);
        let ownerName = c.Owner || c.owner || c._value;
        if(teamName && teamName.length > 3) {
            teamStats[teamName] = { pld: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, owner: ownerName || "Unassigned", group: "", status: "Active" };
            if (ownerName && !familyStats[ownerName]) familyStats[ownerName] = { totalPts: 0, sweetsTaken: 0 };
        }
    });

    // 2. SWEETS
    appData.sweets.forEach(s => {
        let member = s._key || findKey(s, ['member', 'name']);
        let taken = s._value || findKey(s, ['awarded', 'sweets', 'taken']);
        if (member && familyStats[member]) familyStats[member].sweetsTaken = parseInt(taken) || 0;
    });

    // 3. FIXTURES
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

    // 4. SCORES 
    appData.scores.forEach(match => {
        let mId = parseInt(match._key || findKey(match, ['match', 'id']));
        let hG_raw = match.hS !== undefined ? match.hS : findKey(match, ['homescore', 'hg']);
        let aG_raw = match.aS !== undefined ? match.aS : findKey(match, ['awayscore', 'ag']);
        let pens = match.pens || "";
        let pHome = 0, pAway = 0;
        if (pens && pens.includes('-')) { let parts = pens.split('-'); pHome = parseInt(parts[0])||0; pAway = parseInt(parts[1])||0; }

        if (!mId || hG_raw === "" || aG_raw === "" || hG_raw == null || aG_raw == null) return;
        
        let tMap = matchTeamsMap[mId];
        if (!tMap) return; 
        
        let h = tMap.h, a = tMap.a;
        h = groupRankings[h] || h; // Translate if it's a KO match
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

    // 5. Build Group Rankings mapping for Auto-Bracket (e.g. 1A, 2B)
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

    render(sortedFixtures, appData.scores);
}

function render(sortedFixtures, processedMatches) {
    renderLeaderboard(); renderGroups(); renderBracket(processedMatches); renderFixtures(sortedFixtures, processedMatches); renderTeams(); renderTransfers();
}

function renderLeaderboard() {
    const div = document.getElementById('leaderboard-data');
    let html = `<div class="table-container"><table><tr><th>Member</th><th>Pts Earned</th><th>Sweets Taken</th><th>Balance</th></tr>`;
    const sorted = Object.entries(familyStats).sort((a, b) => (b[1].totalPts - b[1].sweetsTaken) - (a[1].totalPts - a[1].sweetsTaken));
    sorted.forEach(([name, stats]) => {
        const balance = stats.totalPts - stats.sweetsTaken;
        html += `<tr><td><strong>${name}</strong></td><td>${stats.totalPts}</td><td>${stats.sweetsTaken}</td><td style="color:${balance > 0 ? 'green' : (balance < 0 ? 'red' : 'inherit')}; font-weight:900; font-size:16px;">${balance}</td></tr>`;
    });
    div.innerHTML = html + `</table></div>`;
}

function renderGroups() {
    const div = document.getElementById('groups-data');
    const groupNames = ["Group A", "Group B", "Group C", "Group D", "Group E", "Group F", "Group G", "Group H", "Group I", "Group J", "Group K", "Group L"];
    let html = "";
    
    groupNames.forEach(g => {
        let gTeams = Object.keys(teamStats).filter(t => teamStats[t].group === g);
        if (gTeams.length === 0) return;
        
        gTeams.sort((a, b) => {
            if (teamStats[b].pts !== teamStats[a].pts) return teamStats[b].pts - teamStats[a].pts;
            if (teamStats[b].gd !== teamStats[a].gd) return teamStats[b].gd - teamStats[a].gd;
            return teamStats[b].gf - teamStats[a].gf;
        });

        html += `<h4 style="margin:20px 0 5px 0; color:var(--primary);">${g}</h4>
                 <div class="table-container"><table><tr><th>Team</th><th>Pld</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr>`;
        gTeams.forEach(t => {
            let st = teamStats[t];
            let gdClass = st.gd > 0 ? 'positive-gd' : (st.gd < 0 ? 'negative-gd' : '');
            html += `<tr><td>${formatTeam(t, true)}</td><td>${st.pld}</td><td>${st.w}</td><td>${st.d}</td><td>${st.l}</td><td class="${gdClass}">${st.gd > 0 ? '+'+st.gd : st.gd}</td><td><strong>${st.pts}</strong></td></tr>`;
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
        
        let stage = findKey(f, ['stage', 'round']);
        let loc = findKey(f, ['location', 'venue', 'stadium']) || "";
        let dateRaw = findKey(f, ['date']);
        let dateStr = dateRaw ? new Date(dateRaw).toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'}) : "";
        
        let t1 = getStandardName(findKey(f, ['team1', 'home']));
        let t2 = getStandardName(findKey(f, ['team2', 'away']));
        
        let score = processedMatches.find(s => parseInt(s._key || findKey(s, ['match', 'id'])) === mId);

        let hG = score && score.hS !== undefined ? score.hS : "";
        let aG = score && score.aS !== undefined ? score.aS : "";
        let pens = score ? score.pens || "" : "";
        let pHome = "", pAway = "";
        if (pens.includes('-')) { let pts = pens.split('-'); pHome = pts[0]; pAway = pts[1]; }

        let isNextClass = "";
        if (hG === "" && !foundNext) { isNextClass = "next-match"; foundNext = true; }

        let penInputs = mId > 72 ? `<input type="number" class="pen-input" id="ph-${mId}" value="${pHome}" placeholder="p"><input type="number" class="pen-input" id="pa-${mId}" value="${pAway}" placeholder="p">` : `<span style="display:none;"></span><span style="display:none;"></span>`;

        html += `
        <div class="match-row-horizontal ${isNextClass}">
            <div class="match-meta">
                <strong>Match ${mId}</strong><br>
                ${dateStr}<br>
                ${stage}<br>
                <span style="font-size:8px;">${loc}</span>
            </div>
            <div class="match-teams">
                <div class="team-box">${formatTeam(t1, true, true)}</div>
                <div class="score-input-group">
                    <div style="display:flex;">
                        <input type="number" id="hg-${mId}" class="score-input" value="${hG}">
                        <span style="font-size:18px; line-height:35px;">-</span>
                        <input type="number" id="ag-${mId}" class="score-input" value="${aG}">
                    </div>
                    <div style="display:flex; gap:12px;">${penInputs}</div>
                </div>
                <div class="team-box">${formatTeam(t2, true, true)}</div>
            </div>
            <div class="match-action">
                <button id="btn-save-${mId}" class="btn-save" onclick="saveScore(${mId})">Save</button>
            </div>
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
            const hG = parseInt(score.hS); const aG = parseInt(score.aS);
            let pens = score.pens || "";
            let pHome = 0, pAway = 0;
            if (pens.includes('-')) { let parts = pens.split('-'); pHome = parseInt(parts[0])||0; pAway = parseInt(parts[1])||0; }

            const winner = (hG > aG || pHome > pAway) ? activeMatches[path.id]?.h : (aG > hG || pAway > pHome ? activeMatches[path.id]?.a : null); 
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
            if (score && score.hS !== undefined && score.hS !== "") hG = score.hS;
            if (score && score.aS !== undefined && score.aS !== "") aG = score.aS;

            html += `<div class="match-card">
                <div style="font-size:10px; color:#666; text-align:center; border-bottom:1px solid #eee; padding-bottom:4px; margin-bottom:6px;">Match ${p.id}</div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">${formatTeam(matchData.h, true)}<span class="score-box">${hG}</span></div>
                <div style="display:flex; justify-content:space-between; align-items:center;">${formatTeam(matchData.a, true)}<span class="score-box">${aG}</span></div>
            </div>`;
        });
        html += `</div>`;
    });
    div.innerHTML = html;
}

function renderTeams() {
    const div = document.getElementById('team-tables');
    let html = "";
    
    // Group Teams by Family Member
    Object.keys(familyStats).forEach(owner => {
        html += `<div class="family-squad-section">
            <h3>${owner}'s Squad</h3>
            <div class="table-container"><table><tr><th>Team</th><th>Pld</th><th>GD</th><th>Pts</th><th>Status</th></tr>`;
        
        let memberTeams = Object.keys(teamStats).filter(t => teamStats[t].owner === owner).sort((a,b) => teamStats[b].pts - teamStats[a].pts);
        
        memberTeams.forEach(t => {
            let st = teamStats[t];
            let statusColor = st.status.includes("Out") ? "red" : "green";
            let gdClass = st.gd > 0 ? 'positive-gd' : (st.gd < 0 ? 'negative-gd' : '');
            html += `<tr>
                <td>${formatTeam(t, false)}</td>
                <td>${st.pld}</td>
                <td class="${gdClass}">${st.gd > 0 ? '+'+st.gd : st.gd}</td>
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
    let teamOptions = `<option value="">-- Select Team --</option>`;
    Object.keys(teamStats).forEach(t => { teamOptions += `<option value="${t}">${t} (Owned by ${teamStats[t].owner})</option>`; });
    let html = `<div class="transfer-card"><h3>Execute a Swap</h3><select class="transfer-select">${teamOptions}</select><div style="text-align:center; padding:10px;">🔄</div><select class="transfer-select">${teamOptions}</select><button class="btn-trade">Confirm Transfer</button></div>`;
    html += `<h3>Transfer History</h3><div class="table-container"><table><tr><th>Date</th><th>Traded</th><th>For</th></tr>`;
    if(!appData.transfers || appData.transfers.length === 0) {
        html += `<tr><td colspan="3">No previous transfers recorded.</td></tr>`;
    } else {
        appData.transfers.forEach(t => { 
            const d = findKey(t, ["date", "timestamp"]);
            const p1 = findKey(t, ["person1", "member1"]);
            const t1 = findKey(t, ["team1"]);
            const p2 = findKey(t, ["person2", "member2"]);
            const t2 = findKey(t, ["team2"]);
            if(d && p1) html += `<tr><td>${d}</td><td>${p1} gets ${formatTeam(t2, false)}</td><td>${p2} gets ${formatTeam(t1, false)}</td></tr>`; 
        });
    }
    div.innerHTML = html + `</table></div>`;
}

init();
