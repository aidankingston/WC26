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

const WC_TEAMS = new Set(["mexico", "south africa", "south korea", "korea republic", "czechia", "canada", "bosnia and herzegovina", "bosnia & herzegovina", "paraguay", "united states", "usa", "qatar", "switzerland", "brazil", "morocco", "haiti", "scotland", "australia", "turkiye", "türkiye", "germany", "curacao", "curaçao", "netherlands", "japan", "ivory coast", "côte d'ivoire", "ecuador", "sweden", "tunisia", "spain", "cape verde", "cabo verde", "belgium", "egypt", "saudi arabia", "uruguay", "iran", "ir iran", "new zealand", "france", "senegal", "iraq", "norway", "argentina", "algeria", "austria", "jordan", "portugal", "dr congo", "congo dr", "england", "croatia", "ghana", "panama", "uzbekistan", "colombia"]);

function formatTeam(teamName) {
    if (!teamName || teamName === "TBD") return "TBD";
    const owner = teamStats[teamName] ? teamStats[teamName].owner : "?";
    return `<span style="white-space:nowrap;"><strong>${teamName}</strong> <span style="font-size:0.8em; color:#666; font-weight:normal;">(${owner})</span></span>`;
}

function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-'+id).classList.add('active');
}

function logDebug(msg) {
    const d = document.getElementById('debug-console');
    if (d) { d.style.display = 'block'; d.innerHTML += `> ${msg}<br>`; }
    console.log("DEBUG:", msg);
}

function normalizeData(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'object') return Object.keys(data).map(k => ({ ...data[k], _key: k }));
    return [];
}

function findVal(obj, searchStrings, fallbackIndex) {
    if (!obj) return "";
    if (Array.isArray(obj)) {
        for (let s of searchStrings) { if (typeof s === 'number' && obj[s] !== undefined) return obj[s]; }
        return fallbackIndex !== undefined ? obj[fallbackIndex] : "";
    }
    for (let k of Object.keys(obj)) {
        let cleanK = String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
        for (let s of searchStrings) {
            if (typeof s === 'string') {
                let cleanS = s.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (cleanK.includes(cleanS)) return obj[k];
            }
        }
    }
    if (fallbackIndex !== undefined) {
        let keys = Object.keys(obj);
        if (keys[fallbackIndex]) return obj[keys[fallbackIndex]];
    }
    return obj._key || obj._value || "";
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

window.callback = function(parsedData) {
    logDebug("<span style='color:lime;'>SUCCESS: V21 Intercepted!</span>");
    try {
        appData.scores = normalizeData(parsedData.Scores || parsedData.scores);
        appData.fixtures = normalizeData(parsedData.Fixtures || parsedData.fixtures);
        appData.config = normalizeData(parsedData.Owners || parsedData.owners || parsedData.Config || parsedData.config);
        appData.sweets = normalizeData(parsedData.Sweets || parsedData.sweets);
        appData.transfers = normalizeData(parsedData.TransferLog || parsedData.transferLog || parsedData.Transfers || parsedData.transfers);
        
        // CRITICAL DEBUG: Print the exact shape of row 0 so we have absolute proof if it fails
        if(appData.config.length > 0) logDebug(`🔍 RAW CONFIG[0]: ${JSON.stringify(appData.config[0])}`);
        if(appData.scores.length > 0) logDebug(`🔍 RAW SCORES[0]: ${JSON.stringify(appData.scores[0])}`);

        processDataEngine();
        render();
        
        logDebug(`<strong>✅ MAPPED DATA:</strong> ${Object.keys(teamStats).length} Teams, ${Object.keys(matchTeamsMap).length} Fixtures.`);
        document.getElementById('sync-status').innerText = `Data Live! Loaded ${Object.keys(teamStats).length} Teams.`;
    } catch(e) {
        logDebug(`<span style='color:red;'>PARSE ERROR: ${e.message}</span>`);
    }
};

function init() {
    logDebug("App.js (v21). Injecting JSONP...");
    document.getElementById('sync-status').innerText = "Downloading Google Sheet (JSONP)...";
    const script = document.createElement('script');
    script.src = SCRIPT_URL + "?action=getAll";
    script.onerror = function() {
        logDebug("<span style='color:red;'>🚨 SCRIPT LOAD FAILED</span>");
        document.getElementById('sync-status').innerText = "Network Error.";
    };
    document.body.appendChild(script);
}

function processDataEngine() {
    teamStats = {}; familyStats = {}; eliminatedTeams = new Set(); matchTeamsMap = {}; 
    
    // 1. CONFIGS (AI Heuristic Search)
    appData.config.forEach((c, i) => {
        if (Array.isArray(c) && i === 0) return;
        let teamName = "";
        let ownerName = "";
        
        Object.values(c).forEach(v => {
            let s = String(v).trim();
            if (WC_TEAMS.has(s.toLowerCase())) {
                teamName = getStandardName(s);
            } else if (s && !/^\d+$/.test(s) && !s.toLowerCase().includes("team") && !s.toLowerCase().includes("owner")) {
                if (!ownerName) ownerName = s; // Grabs the first non-team, non-number string
            }
        });

        if(teamName) {
            teamStats[teamName] = { pld: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, owner: ownerName || "Unassigned", group: "" };
            if (ownerName && !familyStats[ownerName]) familyStats[ownerName] = { totalPts: 0, sweetsTaken: 0 };
        }
    });

    // 2. Sweets 
    appData.sweets.forEach((s, i) => {
        if (Array.isArray(s) && i === 0) return;
        let member = findVal(s, ["member", "name", "owner", "person"], 0);
        let taken = findVal(s, ["awarded", "sweetstaken", "taken", "sweets"], 1);
        if (member && familyStats[member]) familyStats[member].sweetsTaken = parseInt(taken) || 0;
    });

    // 3. Fixtures (Unchanged, worked perfectly last time)
    appData.fixtures.forEach((f, i) => {
        if (Array.isArray(f) && i === 0) return;
        let mId = parseInt(findVal(f, ["match", "id", "matchno"], 4));
        let stage = findVal(f, ["stage", "round", "group"], 0);
        let t1 = findVal(f, ["team1", "home", "hometeam"], 2);
        let t2 = findVal(f, ["team2", "away", "awayteam"], 3);

        if (stage && String(stage).toLowerCase().includes("group")) {
            let grp = String(stage).trim();
            if (teamStats[getStandardName(t1)]) teamStats[getStandardName(t1)].group = grp;
            if (teamStats[getStandardName(t2)]) teamStats[getStandardName(t2)].group = grp;
        }
        if(mId && t1 && t2) matchTeamsMap[mId] = { h: getStandardName(t1), a: getStandardName(t2) };
    });

    // 4. Scores (Mathematical Heuristic to beat Zero Bug)
    appData.scores.forEach((match, i) => {
        if (Array.isArray(match) && (i === 0 || String(match[0]).toLowerCase().includes('id'))) return;
        
        // Extract all valid numbers from the row
        let nums = [];
        Object.values(match).forEach(v => {
            let s = String(v).trim();
            if (/^\d+$/.test(s)) nums.push(parseInt(s, 10));
        });

        // We know Match IDs are exactly 1 through 104
        let mIdIndex = nums.findIndex(n => n > 0 && n <= 104);
        
        let mId, hG, aG, pHome=0, pAway=0;
        if (mIdIndex !== -1 && nums.length >= mIdIndex + 3) {
            // Found mathematically
            mId = nums[mIdIndex];
            hG = nums[mIdIndex + 1];
            aG = nums[mIdIndex + 2];
            if (nums.length > mIdIndex + 3) pHome = nums[mIdIndex + 3];
            if (nums.length > mIdIndex + 4) pAway = nums[mIdIndex + 4];
        } else {
            // Fallback to strict column matching
            mId = parseInt(findVal(match, ["matchid", "match", "id"], 0));
            let hG_raw = findVal(match, ["homescore", "home", "hg", "score1"], 1);
            let aG_raw = findVal(match, ["awayscore", "away", "ag", "score2"], 2);
            if (hG_raw === "" || aG_raw === "") return;
            hG = parseInt(hG_raw);
            aG = parseInt(aG_raw);
            pHome = parseInt(findVal(match, ["penaltieshome", "penhome"], 3)) || 0;
            pAway = parseInt(findVal(match, ["penaltiesaway", "penaway"], 4)) || 0;
        }

        if (!mId || isNaN(hG) || isNaN(aG)) return;
        
        let tMap = matchTeamsMap[mId];
        if (!tMap) return; 
        
        let h = tMap.h, a = tMap.a;
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
}

function renderLeaderboard() {
    const div = document.getElementById('leaderboard-data');
    let html = `<div class="table-container"><table><tr><th>Member</th><th>Pts Earned</th><th>Sweets Taken</th><th>Balance</th></tr>`;
    const sorted = Object.entries(familyStats).sort((a, b) => b[1].totalPts - a[1].totalPts);
    sorted.forEach(([name, stats]) => {
        const balance = stats.totalPts - stats.sweetsTaken;
        html += `<tr><td><strong>${name}</strong></td><td>${stats.totalPts}</td><td>${stats.sweetsTaken}</td><td style="color:${balance > 0 ? 'green' : (balance < 0 ? 'red' : 'inherit')}; font-weight:700;">${balance}</td></tr>`;
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
            html += `<tr><td>${formatTeam(t)}</td><td>${st.pld}</td><td>${st.w}</td><td>${st.d}</td><td>${st.l}</td><td class="${gdClass}">${st.gd > 0 ? '+'+st.gd : st.gd}</td><td><strong>${st.pts}</strong></td></tr>`;
        });
        html += `</table></div>`;
    });
    div.innerHTML = html;
}

function renderFixtures() {
    const div = document.getElementById('fixtures-data');
    let html = `<div class="table-container"><table><tr><th>M#</th><th>Stage</th><th>Matchup</th></tr>`;
    
    appData.fixtures.forEach((f, i) => {
        if (Array.isArray(f) && i===0) return;
        
        let mId = parseInt(findVal(f, ["match", "id", "matchno"], 4));
        if(!mId) return;
        
        let stage = findVal(f, ["stage", "round", "group"], 0);
        let t1 = getStandardName(findVal(f, ["team1", "home", "hometeam"], 2));
        let t2 = getStandardName(findVal(f, ["team2", "away", "awayteam"], 3));
        
        let scoreText = "v";
        const score = appData.scores.find((s, si) => {
            if(Array.isArray(s) && si===0) return false;
            
            let nums = [];
            Object.values(s).forEach(v => { if (/^\d+$/.test(String(v).trim())) nums.push(parseInt(v, 10)); });
            let mIdIndex = nums.findIndex(n => n > 0 && n <= 104);
            if (mIdIndex !== -1) return nums[mIdIndex] === mId;
            return parseInt(findVal(s, ["matchid", "match", "id"], 0)) === mId;
        });

        if (score) {
            let nums = [];
            Object.values(score).forEach(v => { if (/^\d+$/.test(String(v).trim())) nums.push(parseInt(v, 10)); });
            let mIdIndex = nums.findIndex(n => n > 0 && n <= 104);
            
            let hG, aG;
            if (mIdIndex !== -1 && nums.length >= mIdIndex + 3) {
                hG = nums[mIdIndex + 1];
                aG = nums[mIdIndex + 2];
            } else {
                hG = findVal(score, ["homescore", "home", "hg", "score1"], 1);
                aG = findVal(score, ["awayscore", "away", "ag", "score2"], 2);
            }
            
            if (hG !== undefined && hG !== "" && aG !== undefined && aG !== "") {
                scoreText = `<span style="background:var(--primary);color:white;padding:3px 8px;border-radius:6px; font-weight:bold;">${hG} - ${aG}</span>`;
            }
        }

        html += `<tr><td style="font-size:11px;color:#888;">${mId}</td><td style="font-size:11px;">${stage||""}</td><td style="text-align:center;">${formatTeam(t1)} <br><div style="margin:8px 0;">${scoreText}</div> ${formatTeam(t2)}</td></tr>`;
    });
    div.innerHTML = html + `</table></div>`;
}

function renderBracket() {
    const div = document.getElementById('bracket-data');
    const rounds = [ {key: "R32", title: "R32"}, {key: "R16", title: "R16"}, {key: "QF", title: "QF"}, {key: "SF", title: "SF"}, {key: "FINAL", title: "Final"} ];
    let activeMatches = { ...matchTeamsMap }; 

    KO_PATHS.forEach(path => {
        const score = appData.scores.find((s, i) => {
            if(Array.isArray(s) && i===0) return false
