window.addEventListener('error', function(e) {
    const d = document.getElementById('debug-console');
    if(d) d.innerHTML += `<span style="color:red;">CRITICAL JS ERROR: ${e.message}</span><br>`;
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
    if (d) d.innerHTML += `> ${msg}<br>`;
    console.log("DEBUG:", msg);
}

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
    logDebug("App.js (v13 - INNER JOIN ACTIVE). Fetching...");
    
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

        logDebug(`Processing ${appData.config.length} Teams, ${appData.fixtures.length} Fixtures, ${appData.scores.length} Scores...`);
        
        processDataEngine();
        render();
        logDebug("<span style='color:lime;'>RENDER COMPLETE. Matches successfully mapped!</span>");
    } catch(e) {
        logDebug(`<span style='color:red;'>ERROR: ${e.message}</span>`);
    }
}

function processDataEngine() {
    teamStats = {};
    familyStats = {};
    eliminatedTeams = new Set();
    matchTeamsMap = {}; 
    
    appData.config.forEach((c, i) => {
        let teamName, ownerName;
        if (Array.isArray(c)) {
            if (i === 0 && String(c[0]).toLowerCase() === 'team') return; 
            teamName = c[0]; ownerName = c[1];
        } else {
            teamName = c.Team || c.team || c._key;
            ownerName = c.Owner || c.owner || c.FamilyMember || c._value || "Unassigned";
        }
        teamName = getStandardName(teamName);
        if(teamName) {
            teamStats[teamName] = { pld: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, owner: ownerName };
            if (!familyStats[ownerName]) familyStats[ownerName] = { totalPts: 0, sweetsTaken: 0 };
        }
    });

    appData.sweets.forEach((s, i) => {
        let member, taken;
        if (Array.isArray(s)) {
            if (i === 0) return; member = s[0]; taken = s[1];
        } else {
            member = s.FamilyMember || s.Member || s.Name || s._key;
            taken = s.SweetsTaken || s.Awarded || s.Sweets || s._value;
        }
        if (member && familyStats[member]) familyStats[member].sweetsTaken = parseInt(taken) || 0;
    });

    appData.fixtures.forEach((f, i) => {
        let mId, t1, t2;
        if (Array.isArray(f)) {
            if (i === 0) return; mId = f[4]; t1 = f[2]; t2 = f[3];
        } else {
            mId = f["Match #"] || f.MatchID || f.ID || f._key;
            t1 = f["Team 1"] || f.Team1;
            t2 = f["Team 2"] || f.Team2;
        }
        mId = parseInt(mId);
        if(mId && t1 && t2) matchTeamsMap[mId] = { h: getStandardName(t1), a: getStandardName(t2) };
    });

    appData.scores.forEach((match, i) => {
        let hG, aG, matchId, pHome, pAway;
        if (Array.isArray(match)) {
            if (i === 0 && String(match[0]).toLowerCase().includes('id')) return;
            matchId = match[0]; hG = match[1]; aG = match[2]; pHome = match[3]; pAway = match[4];
        } else {
            hG = match.HomeScore || match.HG;
            aG = match.AwayScore || match.AG;
            matchId = match.MatchID || match.ID || match._key;
            pHome = match.PenaltiesHome || match.PenHome;
            pAway = match.PenaltiesAway || match.PenAway;
        }

        matchId = parseInt(matchId);
        if (!matchTeamsMap[matchId]) return; 
        
        let h = matchTeamsMap[matchId].h;
        let a = matchTeamsMap[matchId].a;

        hG = parseInt(hG); aG = parseInt(aG);
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
            let ptsAwarded = matchId <= 88 ? 5 : matchId <= 96 ? 7 : matchId <= 100 ? 10 : matchId <= 103 ? 25 : 50;                     
            let winner, loser;
            if (hG > aG) { winner = h; loser = a; }
            else if (hG < aG) { winner = a; loser = h; }
            else {
                if ((parseInt(pHome)||0) > (parseInt(pAway)||0)) { winner = h; loser = a; }
                else { winner = a; loser = h; }
            }
            if(teamStats[winner]) teamStats[winner].pts += ptsAwarded;
            eliminatedTeams.add(loser); 
        }
    });

    Object.keys(teamStats).forEach(team => {
        const owner = teamStats[team].owner;
        if (familyStats[owner]) familyStats[owner].totalPts += teamStats[team].pts;
    });
}

function render() {
    renderLeaderboard(); renderGroups(); renderBracket(); renderTeams(); renderTransfers();
}

function renderLeaderboard() {
    const div = document.getElementById('leaderboard-data');
    let html = `<div class="table-container"><table><tr><th>Member</th><th>Pts Earned</th><th>Sweets Taken</th><th>Balance</th></tr>`;
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

function renderBracket() {
    const div = document.getElementById('bracket-data');
    const rounds = [
        {key: "R32", title: "R32 (5pts)"}, {key: "R16", title: "R16 (7pts)"},
        {key: "QF", title: "QF (10pts)"}, {key: "SF", title: "SF (25pts)"}, {key: "FINAL", title: "Final (50pts)"}
    ];

    let activeMatches = { ...matchTeamsMap }; 

    KO_PATHS.forEach(path => {
        const score = appData.scores.find(s => parseInt(s.MatchID || s.ID || s._key || (Array.isArray(s) ? s[0] : 0)) == path.id);
        if (score && path.next) {
            const hG = parseInt(score.HomeScore || (Array.isArray(score) ? score[1] : NaN)); 
            const aG = parseInt(score.AwayScore || (Array.isArray(score) ? score[2] : NaN));
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
            const score = appData.scores.find(s => parseInt(s.MatchID || s.ID || s._key || (Array.isArray(s) ? s[0] : 0)) == p.id);
            const hG = score ? (score.HomeScore || (Array.isArray(score) ? score[1] : "-")) : "-";
            const aG = score ? (score.AwayScore || (Array.isArray(score) ? score[2] : "-")) : "-";
            html += `<div class="match-card"><div class="match-id">${p.id}</div><div class="match-team"><span>${matchData.h}</span><span class="score-box">${hG}</span></div><div class="match-team"><span>${matchData.a}</span><span class="score-box">${aG}</span></div></div>`;
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
        appData.transfers.forEach(t => { 
            const d = t.Timestamp || t.Date || (Array.isArray(t) ? t[0] : "");
            const p1 = t["Person 1"] || t.Member1 || (Array.isArray(t) ? t[1] : "");
            const t1 = t["Team 1"] || t.Team1 || (Array.isArray(t) ? t[2] : "");
            const p2 = t["Person 2"] || t.Member2 || (Array.isArray(t) ? t[3] : "");
            const t2 = t["Team 2"] || t.Team2 || (Array.isArray(t) ? t[4] : "");
            if(d && p1) html += `<tr><td>${d}</td><td>${p1} gets ${t2}</td><td>${p2} gets ${t1}</td></tr>`; 
        });
    }
    div.innerHTML = html + `</table></div>`;
}

init();
