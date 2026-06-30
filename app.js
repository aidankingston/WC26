const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwJg28FI1maQPvXELfK3kbgM7PNMj-_pQ73w0b11TPkW3jTGdftEhto7OfBu-2Qc5Medg/exec";

// Default state structures
let appData = {
    scores: [],     // Array of row objects from Scores.csv
    fixtures: [],   // Array of row objects from Fixtures.csv
    config: [],     // Array of row objects from Config.csv (Team to Owner map)
    sweets: [],     // Array of row objects from Sweets.csv
    transfers: []   // Array of row objects from TransferLog.csv
};

// Derived state
let teamStats = {};      // Aggregated points, GD, GF, GA for each team
let familyStats = {};    // Total points and sweets for each family member
let eliminatedTeams = new Set();

// Fixed Knockout Paths (Match 73 to 104)
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

// UI Navigation
function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-'+id).classList.add('active');
}

// 1. Fetch & Initialize
async function init() {
    try {
        const res = await fetch(SCRIPT_URL + "?action=getAll");
        const raw = await res.text();
        // Assuming Google Apps Script returns { scores: [...], config: [...], ... }
        appData = JSON.parse(raw.substring(raw.indexOf('(')+1, raw.lastIndexOf(')')));
        processDataEngine();
        render();
    } catch(e) {
        document.getElementById('sync-status').innerText = "Sync Failed. Check SCRIPT_URL.";
        console.error(e);
    }
}

// 2. The Data Engine: Calculate EVERYTHING locally
function processDataEngine() {
    teamStats = {};
    familyStats = {};
    eliminatedTeams = new Set();
    
    // Setup Teams & Owners
    const getOwner = (team) => {
        const conf = appData.config?.find(c => c.Team === team);
        return conf ? conf.Owner : "Unassigned";
    };

    appData.config?.forEach(c => {
        teamStats[c.Team] = { pld: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, owner: c.Owner };
        if (!familyStats[c.Owner]) familyStats[c.Owner] = { totalPts: 0, sweetsTaken: 0 };
    });

    // Populate Sweets Taken
    appData.sweets?.forEach(s => {
        if (familyStats[s.FamilyMember]) familyStats[s.FamilyMember].sweetsTaken = parseInt(s.SweetsTaken) || 0;
    });

    // Process Scores
    appData.scores?.forEach(match => {
        const h = match.HomeTeam;
        const a = match.AwayTeam;
        const hG = parseInt(match.HomeScore);
        const aG = parseInt(match.AwayScore);
        const matchId = parseInt(match.MatchID);

        if (isNaN(hG) || isNaN(aG) || !teamStats[h] || !teamStats[a]) return;

        // Base Stats Update
        teamStats[h].pld++; teamStats[a].pld++;
        teamStats[h].gf += hG; teamStats[a].gf += aG;
        teamStats[h].ga += aG; teamStats[a].ga += hG;
        teamStats[h].gd = teamStats[h].gf - teamStats[h].ga;
        teamStats[a].gd = teamStats[a].gf - teamStats[a].ga;

        // Group Stage Points (Match 1-72)
        if (matchId <= 72) {
            if (hG > aG) { teamStats[h].w++; teamStats[h].pts += 3; teamStats[a].l++; }
            else if (hG < aG) { teamStats[a].w++; teamStats[a].pts += 3; teamStats[h].l++; }
            else { teamStats[h].d++; teamStats[a].d++; teamStats[h].pts += 1; teamStats[a].pts += 1; }
        }
        
        // Knockout Stage Points (5, 7, 10, 25, 50)
        if (matchId >= 73) {
            let ptsAwarded = 0;
            if (matchId <= 88) ptsAwarded = 5;       // R32
            else if (matchId <= 96) ptsAwarded = 7;  // R16
            else if (matchId <= 100) ptsAwarded = 10; // QF
            else if (matchId <= 103) ptsAwarded = 25; // SF
            else ptsAwarded = 50;                     // Final

            // Handle Knockout winners/losers
            let winner, loser;
            if (hG > aG) { winner = h; loser = a; }
            else if (hG < aG) { winner = a; loser = h; }
            else {
                // Determine by penalties if available
                const hP = parseInt(match.PenaltiesHome) || 0;
                const aP = parseInt(match.PenaltiesAway) || 0;
                if (hP > aP) { winner = h; loser = a; }
                else { winner = a; loser = h; }
            }

            teamStats[winner].pts += ptsAwarded;
            eliminatedTeams.add(loser); // Grey them out!
        }
    });

    // Calculate Family Totals (1 Point = 1 Sweet Earned)
    Object.keys(teamStats).forEach(team => {
        const owner = teamStats[team].owner;
        if (familyStats[owner]) {
            familyStats[owner].totalPts += teamStats[team].pts;
        }
    });
}

// 3. Render Functions
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
    let html = `<div class="table-container"><table>
        <tr><th>Family Member</th><th>Pts Earned</th><th>Sweets Eaten</th><th>Remaining Balance</th></tr>`;
    
    // Sort by points
    const sorted = Object.entries(familyStats).sort((a, b) => b[1].totalPts - a[1].totalPts);
    
    sorted.forEach(([name, stats]) => {
        const balance = stats.totalPts - stats.sweetsTaken;
        html += `<tr>
            <td><strong>${name}</strong></td>
            <td>${stats.totalPts}</td>
            <td>${stats.sweetsTaken}</td>
            <td style="color:${balance > 0 ? 'green' : (balance < 0 ? 'red' : 'inherit')}; font-weight:700;">${balance}</td>
        </tr>`;
    });
    div.innerHTML = html + `</table></div>`;
}

function renderGroups() {
    const div = document.getElementById('groups-data');
    // Group teams by their Group letter (assuming Fixtures or Config has it. We'll group by Config if it exists)
    // If not explicitly provided, we'll just list all teams sorted by points for now.
    let html = `<div class="table-container"><table>
        <tr><th>Team</th><th>Owner</th><th>Pld</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr>`;
    
    const sortedTeams = Object.entries(teamStats).sort((a, b) => {
        if (b[1].pts !== a[1].pts) return b[1].pts - a[1].pts;
        return b[1].gd - a[1].gd; // GD Tiebreaker
    });

    sortedTeams.forEach(([name, st]) => {
        const gdClass = st.gd > 0 ? 'positive-gd' : (st.gd < 0 ? 'negative-gd' : '');
        html += `<tr>
            <td><strong>${name}</strong></td>
            <td>${st.owner}</td>
            <td>${st.pld}</td><td>${st.w}</td><td>${st.d}</td><td>${st.l}</td>
            <td class="${gdClass}">${st.gd > 0 ? '+'+st.gd : st.gd}</td>
            <td><strong>${st.pts}</strong></td>
        </tr>`;
    });
    div.innerHTML = html + `</table></div>`;
}

function renderBracket() {
    const div = document.getElementById('bracket-data');
    const rounds = [
        {key: "R32", title: "Round of 32 (5pts)"},
        {key: "R16", title: "Round of 16 (7pts)"},
        {key: "QF", title: "Quarter-Finals (10pts)"},
        {key: "SF", title: "Semi-Finals (25pts)"},
        {key: "FINAL", title: "The Final (50pts)"}
    ];

    let html = "";
    // Build active bracket map
    let activeMatches = {};
    appData.fixtures?.filter(f => f.MatchID >= 73).forEach(f => {
        activeMatches[f.MatchID] = { h: f.HomeTeam, a: f.AwayTeam };
    });

    // Pass winners through local logic
    KO_PATHS.forEach(path => {
        const score = appData.scores?.find(s => s.MatchID == path.id);
        if (score && path.next) {
            const hG = parseInt(score.HomeScore); const aG = parseInt(score.AwayScore);
            const winner = hG > aG ? activeMatches[path.id].h : (aG > hG ? activeMatches[path.id].a : null); // Simplify for now
            if (winner) {
                if (!activeMatches[path.next]) activeMatches[path.next] = {h: "TBD", a: "TBD"};
                if (path.isHome) activeMatches[path.next].h = winner;
                else activeMatches[path.next].a = winner;
            }
        }
    });

    rounds.forEach(r => {
        html += `<div class="bracket-round"><div class="round-title">${r.title}</div>`;
        KO_PATHS.filter(p => p.r === r.key).forEach(p => {
            const matchData = activeMatches[p.id] || {h: "TBD", a: "TBD"};
            const score = appData.scores?.find(s => s.MatchID == p.id) || {HomeScore: "-", AwayScore: "-"};
            
            html += `
            <div class="match-card">
                <div class="match-id">${p.id}</div>
                <div class="match-team">
                    <span>${matchData.h}</span><span class="score-box">${score.HomeScore}</span>
                </div>
                <div class="match-team">
                    <span>${matchData.a}</span><span class="score-box">${score.AwayScore}</span>
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
    
    for (const owner of Object.keys(familyStats)) {
        html += `<h3>${owner}'s Squad</h3><div class="squad-list">`;
        const myTeams = Object.keys(teamStats).filter(t => teamStats[t].owner === owner);
        myTeams.forEach(team => {
            const isOut = eliminatedTeams.has(team) ? "eliminated" : "";
            html += `<div class="squad-card ${isOut}">
                <span class="team-name">${team}</span>
                <span class="points">${teamStats[team].pts} Pts Earned</span>
            </div>`;
        });
        html += `</div>`;
    }
    div.innerHTML = html;
}

function renderTransfers() {
    const div = document.getElementById('history-data');
    let teamOptions = `<option value="">-- Select Team --</option>`;
    Object.keys(teamStats).forEach(t => {
        teamOptions += `<option value="${t}">${t} (Owned by ${teamStats[t].owner})</option>`;
    });

    let html = `
    <div class="transfer-card">
        <h3>Execute a Swap</h3>
        <select id="trade-team-1" class="transfer-select">${teamOptions}</select>
        <div style="text-align:center;">🔄</div>
        <select id="trade-team-2" class="transfer-select">${teamOptions}</select>
        <button class="btn-trade" onclick="alert('Trade function ready to link to Apps Script!')">Confirm Transfer</button>
    </div>
    <h3>Transfer History</h3>
    <div class="table-container"><table><tr><th>Date</th><th>Traded</th><th>For</th></tr>`;
    
    appData.transfers?.forEach(t => {
        html += `<tr><td>${t.Date}</td><td>${t.Member1} gets ${t.Team2}</td><td>${t.Member2} gets ${t.Team1}</td></tr>`;
    });
    
    div.innerHTML = html + `</table></div>`;
}

init();
