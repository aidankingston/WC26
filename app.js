window.addEventListener('error', function(e) {
    const d = document.getElementById('debug-console');
    if(d) { d.style.display = 'block'; d.innerHTML += `<span style="color:red;">CRITICAL JS ERROR: ${e.message}</span><br>`; }
});

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwJg28FI1maQPvXELfK3kbgM7PNMj-_pQ73w0b11TPkW3jTGdftEhto7OfBu-2Qc5Medg/exec";

let appData = { scores: [], fixtures: [], config: [], sweets: [], transfers: [] };
let teamStats = {};      
let familyStats = {};    
let eliminatedTeams = new Set();
let matchTeamsMap = {}; 

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

function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-'+id).classList.add('active');
}

function logDebug(msg) {
    const d = document.getElementById('debug-console');
    if (d) { d.style.display = 'block'; d.innerHTML += `> ${msg}<br>`; }
    console.log("DEBUG:", msg);
}

// Resilient Data Normalizer
function normalizeData(data) {
    if (!data) return [];
    if (typeof data === 'string') { try { data = JSON.parse(data); } catch(e) { return []; } }
    if (Array.isArray(data)) return data;
    if (typeof data === 'object') {
        return Object.keys(data).map(k => {
            const val = data[k];
            if (val !== null && typeof val === 'object' && !Array.isArray(val)) { return { ...val, _key: k }; }
            return { _key: k, _value: val };
        });
    }
    return [];
}

// Indestructible Property Finder (Bypasses Google Sheets formatting issues)
function getProp(obj, aliases) {
    if (!obj) return undefined;
    if (Array.isArray(obj)) {
        for (let a of aliases) { if (typeof a === 'number' && obj[a] !== undefined) return obj[a]; }
        return undefined;
    }
    if (typeof obj === 'object') {
        for (let k of Object.keys(obj)) {
            let cleanK = String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
            for (let a of aliases) {
                if (typeof a === 'string') {
                    let cleanA = a.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (cleanK === cleanA) return obj[k];
                }
            }
        }
        for (let k of Object.keys(obj)) {
            let cleanK = String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
            for (let a of aliases) {
                if (typeof a === 'string') {
                    let cleanA = a.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (cleanK.includes(cleanA)) return obj[k];
                }
            }
        }
    }
    return obj._key || obj._value || undefined;
}

function getStandardName(name) {
    if (!name) return "";
    let n = name.toString().trim();
    const map = {
        "usa": "United States", "korea republic": "South Korea", 
        "bosnia and herzegovina": "Bosnia & Herzegovina", "türkiye": "Turkiye", 
        "côte d'ivoire": "Ivory Coast", "curaçao": "Curacao", "cabo verde": "Cape Verde", 
        "congo dr": "DR Congo", "ir iran": "Iran"
    };
    return map[n.toLowerCase()] || n;
}

async function init() {
    logDebug("App.js (v14). Fetching data...");
    document.getElementById('sync-status').innerText = "Downloading Google Sheet...";
    
    try {
        const res = await fetch(SCRIPT_URL + "?action=getAll");
        if (!res.ok) throw new Error(`HTTP Status: ${res.status}`);
        const raw = await res.text();
        
        let parsedData;
        try { parsedData = JSON.parse(raw); } 
        catch(err) { parsedData = JSON.parse(raw.substring(raw.indexOf('(')+1, raw.lastIndexOf(')'))); }

        appData.scores = normalizeData(parsedData.Scores || parsedData.scores);
        appData.fixtures = normalizeData(parsedData.Fixtures || parsedData.fixtures);
        appData.config = normalizeData(parsedData.Owners || parsedData.owners || parsedData.Config || parsedData.config);
        appData.sweets = normalizeData(parsedData.Sweets || parsedData.sweets);
        appData.transfers = normalizeData(parsedData.TransferLog || parsedData.transferLog || parsedData.Transfers || parsedData.transfers);

        logDebug(`Data Sizes -> Fixtures: ${appData.fixtures.length}, Scores: ${appData.scores.length}, Configs: ${appData.config.length}`);
        
        processDataEngine();
        render();
        logDebug("<span style='color:lime;'>RENDER COMPLETE. Matches and Maths linked!</span>");
        setTimeout(() => { document.getElementById('debug-console').style.display = 'none'; }, 5000); // Hides debug box after success
    } catch(e) {
        logDebug(`<span style='color:red;'>ERROR: ${e.message}</span>`);
        document.getElementById('sync-status').innerText = "Sync Failed. Check Debug Box.";
    }
}

function processDataEngine() {
    teamStats = {};
    familyStats = {};
    eliminatedTeams = new Set();
    matchTeamsMap = {}; 
    
    // 1. Setup Owners
    appData.config.forEach((c, i) => {
        if (Array.isArray(c) && i === 0) return;
        let teamName = getStandardName(getProp(c, [0, "team", "country"]));
        let ownerName = getProp(c, [1, "owner", "name", "familymember", "member", "person"]);
        if(teamName) {
            teamStats[teamName] = { pld: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, owner: ownerName || "Unassigned" };
            if (ownerName && !familyStats[ownerName]) familyStats[ownerName] = { totalPts: 0, sweetsTaken: 0 };
        }
    });

    // 2. Sweets Economy
    appData.sweets.forEach((s, i) => {
        if (Array.isArray(s) && i === 0) return;
        let member = getProp(s, [0, "member", "familymember", "name", "owner", "person"]);
        let taken = getProp(s, [1, "awarded", "sweetstaken", "sweets", "taken"]);
        if (member && familyStats[member]) familyStats[member].sweetsTaken = parseInt(taken) || 0;
    });

    // 3. Build Fixture Map (INNER JOIN PREP)
    appData.fixtures.forEach((f, i) => {
        if (Array.isArray(f) && i === 0) return;
        let mId = parseInt(getProp(f, [4, "match", "matchid", "id", "matchno"]));
        let t1 = getProp(f, [2, "team1", "home", "hometeam"]);
        let t2 = getProp(f, [3, "team2", "away", "awayteam"]);
        if(mId && t1 && t2) matchTeamsMap[mId] = { h: getStandardName(t1), a: getStandardName(t2) };
    });

    // 4. Score Math & Points
    appData.scores.forEach((match, i) => {
        if (Array.isArray(match) && i === 0) return;
        let mId = parseInt(getProp(match, [0, "matchid", "match", "id"]));
        let hG = getProp(match, [1, "homescore", "homegoals", "hg"]);
        let aG = getProp(match, [2, "awayscore", "awaygoals", "ag"]);
        let pHome = getProp(match, [3, "penaltieshome", "penhome"]);
        let pAway = getProp(match, [4, "penaltiesaway", "penaway"]);

        if (!mId || hG === undefined || hG === "" || aG === undefined || aG === "") return;
        
        let tMap = matchTeamsMap[mId];
        if (!tMap) return; 
        
        let h = tMap.h;
        let a = tMap.a;
        hG = parseInt(hG); aG = parseInt(aG);
        
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
            let winner, loser;
            if (hG > aG) { winner = h; loser = a; }
            else if (hG < aG) { winner = a; loser = h; }
            else {
                if ((parseInt(pHome)||0) > (parseInt(pAway)||0)) { winner = h; loser = a; }
                else { winner = a; loser = h; }
            }
            if(teamStats[winner]) teamStats[winner].pts += ptsAwarded;
            if(loser) eliminatedTeams.add(loser); 
        }
    });

    Object.keys(teamStats).forEach(team => {
        const owner = teamStats[team].owner;
        if (familyStats[owner]) familyStats[owner].totalPts += teamStats[team].pts;
    });
}

function render() {
    renderLeaderboard(); renderGroups(); renderBracket(); renderFixtures(); renderTeams(); renderTransfers();
    document.getElementById('sync-status').innerText = "Data Live. Last Sync: " + new Date().toLocaleTimeString();
}

function renderLeaderboard() {
    const div = document.getElementById('leaderboard-data');
    let html = `<div class="table-container"><table><tr><th>Member</th><th>Pts Earned</th><th>Sweets</th><th>Balance</th></tr>`;
    const sorted = Object.entries(familyStats).sort((a, b) => b[1].totalPts - a[1].totalPts);
    if(sorted.length === 0) html += `<tr><td colspan="4">No Data</td></tr>`;
    sorted.forEach(([name, stats]) => {
        const balance = stats.totalPts - stats.sweetsTaken;
        html += `<tr><td><strong>${name}</strong></td><td>${stats.totalPts}</td><td>${stats.sweetsTaken}</td><td style="color:${balance > 0 ? 'green' : (balance < 0 ? 'red' : 'inherit')}; font-weight:700;">${balance}</td></tr>`;
    });
    div.innerHTML = html + `</table></div>`;
}

function renderGroups() {
    const div = document.getElementById('groups-data');
    let html = `<div class="table-container"><table><tr><th>Team</th><th>Owner</th><th>Pld</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr>`;
    const sortedTeams = Object.entries(teamStats).sort((a, b) => {
        if (b[1].pts !== a[1].pts) return b[1].pts - a[1].pts;
        return b[1].gd - a[1].gd;
    });
    sortedTeams.forEach(([name, st]) => {
        const gdClass = st.gd > 0 ? 'positive-gd' : (st.gd < 0 ? 'negative-gd' : '');
        html += `<tr><td><strong>${name}</strong></td><td>${st.owner}</td><td>${st.pld}</td><td>${st.w}</td><td>${st.d}</td><td>${st.l}</td><td class="${gdClass}">${st.gd > 0 ? '+'+st.gd : st.gd}</td><td><strong>${st.pts}</strong></td></tr>`;
    });
    div.innerHTML = html + `</table></div>`;
}

// RESTORED MATCHES VIEW
function renderFixtures() {
    const div = document.getElementById('fixtures-data');
    let html = `<div class="table-container"><table><tr><th>M#</th><th>Stage</th><th>Date</th><th>Result</th></tr>`;
    
    if (!appData.fixtures || appData.fixtures.length === 0) {
        html += `<tr><td colspan="4">No Matches Loaded</td></tr>`;
    } else {
        appData.fixtures.forEach((f, i) => {
            if (Array.isArray(f) && i===0) return;
            let mId = parseInt(getProp(f, [4, "match", "matchid", "id"]));
            if(!mId) return;
            let stage = getProp(f, [0, "stage", "round", "group"]);
            let dt = getProp(f, [1, "date", "datetime", "time"]);
            let t1 = getStandardName(getProp(f, [2, "team1", "home"]));
            let t2 = getStandardName(getProp(f, [3, "team2", "away"]));
            
            let scoreText = "v";
            const score = appData.scores.find((s, si) => {
                if(Array.isArray(s) && si===0) return false;
                return parseInt(getProp(s, [0, "matchid", "match", "id"])) === mId;
            });

            if (score) {
                let hG = getProp(score, [1, "homescore", "hg"]);
                let aG = getProp(score, [2, "awayscore", "ag"]);
                if (hG !== undefined && hG !== "" && aG !== undefined && aG !== "") {
                    scoreText = `<span style="background:var(--primary);color:white;padding:2px 6px;border-radius:4px;">${hG} - ${aG}</span>`;
                }
            }

            html += `<tr><td style="font-size:10px;color:#888;">${mId}</td><td style="font-size:11px;">${stage||""}</td><td style="font-size:10px;">${dt||""}</td><td><strong>${t1||"TBD"}</strong> &nbsp;${scoreText}&nbsp; <strong>${t2||"TBD"}</strong></td></tr>`;
        });
    }
    div.innerHTML = html + `</table></div>`;
}

function renderBracket() {
    const div = document.getElementById('bracket-data');
    const rounds = [
        {key: "R32", title: "R32 (5pts)"}, {key: "R16", title: "R16 (7pts)"},
        {key: "QF", title: "QF (10pts)"}, {key: "SF", title: "SF (25pts)"}, {key: "FINAL", title: "Final (50pts)"}
    ];

    let activeMatches = { ...matchTeamsMap }; 

    KO_PATHS.forEach(path => {
        const score = appData.scores.find((s, i) => {
            if(Array.isArray(s) && i===0) return false;
            return parseInt(getProp(s, [0, "matchid", "match", "id"])) === path.id;
        });
        if (score && path.next) {
            const hG = parseInt(getProp(score, [1, "homescore", "hg"])); 
            const aG = parseInt(getProp(score, [2, "awayscore", "ag"]));
            const winner = hG > aG ? activeMatches[path.id]?.h : (aG > hG ? activeMatches[path.id]?.a : null); 
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
            const score = appData.scores.find((s, i) => {
                if(Array.isArray(s) && i===0) return false;
                return parseInt(getProp(s, [0, "matchid", "match", "id"])) === p.id;
            });
            const hG = score ? (getProp(score, [1, "homescore", "hg"]) || "-") : "-";
            const aG = score ? (getProp(score, [2, "awayscore", "ag"]) || "-") : "-";
            
            // Extract Match Info directly from fixtures for the header
            const fix = appData.fixtures.find((f, i) => {
                if(Array.isArray(f) && i===0) return false;
                return parseInt(getProp(f, [4, "match", "matchid", "id"])) === p.id;
            });
            let dt = fix ? getProp(fix, [1, "date", "datetime", "time"]) : "";
            if (dt && dt.length > 20) dt = dt.substring(0, 20) + "...";

            html += `<div class="match-card">
                <div style="font-size:10px; color:#666; text-align:center; border-bottom:1px solid #eee; padding-bottom:4px; margin-bottom:6px;">Match ${p.id} ${dt ? `<br>${dt}` : ''}</div>
                <div class="match-team"><span>${matchData.h}</span><span class="score-box">${hG}</span></div>
                <div class="match-team"><span>${matchData.a}</span><span class="score-box">${aG}</span></div>
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
        html += `<h3>${owner}'s Squad</h3><div class="squad-list">`;
        Object.keys(teamStats).filter(t => teamStats[t].owner === owner).forEach(team => {
            const isOut = eliminatedTeams.has(team) ? "eliminated" : "";
            html += `<div class="squad-card ${isOut}"><span class="team-name">${team}</span><span class="points">${teamStats[team].pts} Pts</span></div>`;
        });
        html += `</div>`;
    });
    div.innerHTML = html;
}

function renderTransfers() {
    const div = document.getElementById('history-data');
    let teamOptions = `<option value="">-- Select Team --</option>`;
    Object.keys(teamStats).forEach(t => { teamOptions += `<option value="${t}">${t} (Owned by ${teamStats[t].owner})</option>`; });
    let html = `<div class="transfer-card"><h3>Execute a Swap</h3><select class="transfer-select">${teamOptions}</select><div style="text-align:center; padding:10px;">🔄</div><select class="transfer-select">${teamOptions}</select><button class="btn-trade" onclick="alert('Trade function ready to link to Apps Script!')">Confirm Transfer</button></div>`;
    html += `<h3>Transfer History</h3><div class="table-container"><table><tr><th>Date</th><th>Traded</th><th>For</th></tr>`;
    if(!appData.transfers || appData.transfers.length === 0) {
        html += `<tr><td colspan="3">No previous transfers recorded.</td></tr>`;
    } else {
        appData.transfers.forEach((t, i) => { 
            if (Array.isArray(t) && i === 0) return;
            const d = getProp(t, [0, "timestamp", "date"]);
            const p1 = getProp(t, [1, "person1", "member1"]);
            const t1 = getProp(t, [2, "team1"]);
            const p2 = getProp(t, [3, "person2", "member2"]);
            const t2 = getProp(t, [4, "team2"]);
            if(d && p1) html += `<tr><td>${d}</td><td>${p1} gets ${t2}</td><td>${p2} gets ${t1}</td></tr>`; 
        });
    }
    div.innerHTML = html + `</table></div>`;
}

init();
