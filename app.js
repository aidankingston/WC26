// GLOBAL ERROR CATCHER
window.addEventListener('error', function(e) {
    const d = document.getElementById('debug-console');
    if(d) d.innerHTML += `<span style="color:red;">CRITICAL JS ERROR: ${e.message}</span><br>`;
});

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwJg28FI1maQPvXELfK3kbgM7PNMj-_pQ73w0b11TPkW3jTGdftEhto7OfBu-2Qc5Medg/exec";

let appData = { scores: [], fixtures: [], config: [], sweets: [], transfers: [] };
let teamStats = {};      
let familyStats = {};    
let eliminatedTeams = new Set();

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
    if (d) d.innerHTML += `> ${msg}<br>`;
    console.log("DEBUG:", msg);
}

// THE FIX: Data Normalizer forces any weird Google Sheet formats into clean Arrays
function normalizeData(data) {
    if (!data) return [];
    if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch(e) { return []; }
    }
    if (Array.isArray(data)) return data;
    if (typeof data === 'object') {
        return Object.keys(data).map(k => {
            if (typeof data[k] === 'object') return { ...data[k], _key: k };
            return { _key: k, value: data[k] };
        });
    }
    return [];
}

async function init() {
    logDebug("App.js Loaded. Starting init()...");
    document.getElementById('sync-status').innerText = "Fetching data...";
    
    try {
        const res = await fetch(SCRIPT_URL + "?action=getAll");
        if (!res.ok) throw new Error(`HTTP Status: ${res.status}`);

        const raw = await res.text();
        let parsedData;
        try {
            parsedData = JSON.parse(raw);
        } catch(err) {
            parsedData = JSON.parse(raw.substring(raw.indexOf('(')+1, raw.lastIndexOf(')')));
        }

        logDebug(`Tabs found: ${Object.keys(parsedData).join(', ')}`);

        // Apply Normalizer to prevent ".forEach is not a function" crashes
        appData.scores = normalizeData(parsedData.Scores || parsedData.scores);
        appData.fixtures = normalizeData(parsedData.Fixtures || parsedData.fixtures);
        appData.config = normalizeData(parsedData.Owners || parsedData.owners || parsedData.Config || parsedData.config);
        appData.sweets = normalizeData(parsedData.Sweets || parsedData.sweets);
        appData.transfers = normalizeData(parsedData.TransferLog || parsedData.transferLog || parsedData.Transfers || parsedData.transfers);

        logDebug(`Data Ready: ${appData.config.length} Configs, ${appData.scores.length} Scores, ${appData.sweets.length} Sweets.`);

        processDataEngine();
        render();
        logDebug("<span style='color:lime;'>RENDER COMPLETE. No errors!</span>");
    } catch(e) {
        logDebug(`<span style='color:red;'>FETCH ERROR: ${e.message}</span>`);
        document.getElementById('sync-status').innerHTML = "Sync Failed. See console.";
    }
}

function processDataEngine() {
    teamStats = {};
    familyStats = {};
    eliminatedTeams = new Set();
    
    // Process Config / Owners (Supports Object Arrays and 2D Arrays)
    appData.config.forEach((c, i) => {
        let teamName, ownerName;
        if (Array.isArray(c)) {
            if (i === 0 && String(c[0]).toLowerCase() === 'team') return; // Skip headers
            teamName = c[0]; ownerName = c[1];
        } else {
            teamName = c.Team || c.team || c.TEAM || c._key;
            ownerName = c.Owner || c.owner || c.FamilyMember || c.Name || c.value || "Unassigned";
        }

        if(teamName) {
            teamStats[teamName] = { pld: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, owner: ownerName };
            if (!familyStats[ownerName]) familyStats[ownerName] = { totalPts: 0, sweetsTaken: 0 };
        }
    });

    // Process Sweets
    appData.sweets.forEach((s, i) => {
        let member, taken;
        if (Array.isArray(s)) {
            if (i === 0 && String(s[0]).toLowerCase().includes('name')) return;
            member = s[0]; taken = s[1];
        } else {
            member = s.FamilyMember || s.Name || s.Owner || s._key;
            taken = s.SweetsTaken || s.Sweets || s.Taken || s.value;
        }
        
        if (member && familyStats[member]) {
            familyStats[member].sweetsTaken = parseInt(taken) || 0;
        }
    });

    // Process Scores
    appData.scores.forEach((match, i) => {
        let h, a, hG, aG, matchId, pHome, pAway;
        if (Array.isArray(match)) {
            if (i === 0 && String(match[0]).toLowerCase().includes('id')) return;
            matchId = match[0]; h = match[1]; a = match[2]; hG = match[3]; aG = match[4]; pHome = match[5]; pAway = match[6];
        } else {
            h = match.HomeTeam || match.Home;
            a = match.AwayTeam || match.Away;
            hG = match.HomeScore || match.HG;
            aG = match.AwayScore || match.AG;
            matchId = match.MatchID || match.ID;
            pHome = match.PenaltiesHome || match.PenHome;
            pAway = match.PenaltiesAway || match.PenAway;
        }

        hG = parseInt(hG); aG = parseInt(aG); matchId = parseInt(matchId);

        if (isNaN(hG) || isNaN(aG) || !teamStats[h] || !teamStats[a]) return;

        teamStats[h].pld++; teamStats[a].pld++;
        teamStats[h].gf += hG; teamStats[a].gf += aG;
        teamStats[h].ga += aG; teamStats[a].ga += hG;
        teamStats[h].gd = teamStats[h].gf - teamStats[h].ga;
        teamStats[a].gd = teamStats[a].gf - teamStats[a].ga;

        if (matchId <= 72) {
            if (hG > aG) { teamStats[h].w++; teamStats[h].pts += 3; teamStats[a].l++; }
            else if (hG < aG) { teamStats[a].w++; teamStats[a].pts += 3; teamStats[h].l++; }
            else { teamStats[h].d++; teamStats[a].d++; teamStats[h].pts += 1; teamStats[a].pts += 1; }
        }
        
        if (matchId >= 73) {
            let ptsAwarded = 0;
            if (matchId <= 88) ptsAwarded = 5;       
            else if (matchId <= 96) ptsAwarded = 7;  
            else if (matchId <= 100) ptsAwarded = 10; 
            else if (matchId <= 103) ptsAwarded = 25; 
            else ptsAwarded = 50;                     

            let winner, loser;
            if (hG > aG) { winner = h; loser = a; }
            else if (hG < aG) { winner = a; loser = h; }
            else {
                const hP = parseInt(pHome) || 0;
                const aP = parseInt(pAway) || 0;
                if (hP > aP) { winner = h; loser = a; }
                else { winner = a; loser = h; }
            }
            if(teamStats[winner]) teamStats[winner].pts += ptsAwarded;
            eliminatedTeams.add(loser); 
        }
    });

    Object.keys(teamStats).forEach(team => {
        const owner = teamStats[team].owner;
        if (familyStats[owner]) {
            familyStats[owner].totalPts += teamStats[team].pts;
        }
    });
}

function render() {
    renderLeaderboard();
    renderGroups();
    renderBracket();
    renderTeams();
    renderTransfers();
    document.getElementById('sync-status').innerText = "Data Live. Last Sync: " + new Date().toLocaleTimeString();
}

function renderLeaderboard() {
    const div = document.getElementById('leaderboard-data');
    let html = `<div class="table-container"><table><tr><th>Family Member</th><th>Pts Earned</th><th>Sweets Eaten</th><th>Remaining Balance</th></tr>`;
    const sorted = Object.entries(familyStats).sort((a, b) => b[1].totalPts - a[1].totalPts);
    if(sorted.length === 0) html += `<tr><td colspan="4">No Data Available</td></tr>`;
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
    if(sortedTeams.length === 0) html += `<tr><td colspan="8">No Data Available</td></tr>`;
    sortedTeams.forEach(([name, st]) => {
        const gdClass = st.gd > 0 ? 'positive-gd' : (st.gd < 0 ? 'negative-gd' : '');
        html += `<tr><td><strong>${name}</strong></td><td>${st.owner}</td><td>${st.pld}</td><td>${st.w}</td><td>${st.d}</td><td>${st.l}</td><td class="${gdClass}">${st.gd > 0 ? '+'+st.gd : st.gd}</td><td><strong>${st.pts}</strong></td></tr>`;
    });
    div.innerHTML = html + `</table></div>`;
}

function renderBracket() {
    const div = document.getElementById('bracket-data');
    const rounds = [
        {key: "R32", title: "Round of 32 (5pts)"}, {key: "R16", title: "Round of 16 (7pts)"},
        {key: "QF", title: "Quarter-Finals (10pts)"}, {key: "SF", title: "Semi-Finals (25pts)"},
        {key: "FINAL", title: "The Final (50pts)"}
    ];

    let activeMatches = {};
    appData.fixtures.filter(f => parseInt(f.MatchID || f.ID || (Array.isArray(f) ? f[0] : 0)) >= 73).forEach(f => {
        const id = f.MatchID || f.ID || f[0];
        activeMatches[id] = { h: f.HomeTeam || f.Home || f[1], a: f.AwayTeam || f.Away || f[2] };
    });

    KO_PATHS.forEach(path => {
        const score = appData.scores.find(s => parseInt(s.MatchID || s.ID || (Array.isArray(s) ? s[0] : 0)) == path.id);
        if (score && path.next) {
            const hG = parseInt(score.HomeScore || score.HG || (Array.isArray(score) ? score[3] : NaN)); 
            const aG = parseInt(score.AwayScore || score.AG || (Array.isArray(score) ? score[4] : NaN));
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
        const matchesForRound = KO_PATHS.filter(p => p.r === r.key);
        if(matchesForRound.length === 0) html += `<div>No matches mapped</div>`;
        matchesForRound.forEach(p => {
            const matchData = activeMatches[p.id] || {h: "TBD", a: "TBD"};
            const score = appData.scores.find(s => parseInt(s.MatchID || s.ID || (Array.isArray(s) ? s[0] : 0)) == p.id);
            const hG = score ? (score.HomeScore || score.HG || (Array.isArray(score) ? score[3] : "-")) : "-";
            const aG = score ? (score.AwayScore || score.AG || (Array.isArray(score) ? score[4] : "-")) : "-";
            html += `<div class="match-card"><div class="match-id">${p.id}</div><div class="match-team"><span>${matchData.h}</span><span class="score-box">${hG}</span></div><div class="match-team"><span>${matchData.a}</span><span class="score-box">${aG}</span></div></div>`;
        });
        html += `</div>`;
    });
    div.innerHTML = html;
}

function renderTeams() {
    const div = document.getElementById('team-tables');
    let html = "";
    const owners = Object.keys(familyStats);
    if(owners.length === 0) html = "<p>No teams assigned yet.</p>";
    for (const owner of owners) {
        html += `<h3>${owner}'s Squad</h3><div class="squad-list">`;
        const myTeams = Object.keys(teamStats).filter(t => teamStats[t].owner === owner);
        myTeams.forEach(team => {
            const isOut = eliminatedTeams.has(team) ? "eliminated" : "";
            html += `<div class="squad-card ${isOut}"><span class="team-name">${team}</span><span class="points">${teamStats[team].pts} Pts</span></div>`;
        });
        html += `</div>`;
    }
    div.innerHTML = html;
}

function renderTransfers() {
    const div = document.getElementById('history-data');
    let teamOptions = `<option value="">-- Select Team --</option>`;
    Object.keys(teamStats).forEach(t => { teamOptions += `<option value="${t}">${t} (Owned by ${teamStats[t].owner})</option>`; });
    let html = `<div class="transfer-card"><h3>Execute a Swap</h3><select class="transfer-select">${teamOptions}</select><div style="text-align:center; padding:10px;">🔄</div><select class="transfer-select">${teamOptions}</select><button class="btn-trade" onclick="alert('Trade function ready to link to Apps Script!')">Confirm Transfer</button></div>`;
    html += `<h3>Transfer History</h3><div class="table-container"><table><tr><th>Date</th><th>Traded</th><th>For</th></tr>`;
    if(!appData.transfers || appData.transfers.length === 0) {
        html += `<tr><td colspan="3">No previous transfers (or tab missing from JSON)</td></tr>`;
    } else {
        appData.transfers.forEach(t => { html += `<tr><td>${t.Date}</td><td>${t.Member1} gets ${t.Team2}</td><td>${t.Member2} gets ${t.Team1}</td></tr>`; });
    }
    div.innerHTML = html + `</table></div>`;
}

// Start application
init();
