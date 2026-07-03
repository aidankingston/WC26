<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>WC26 | Family Hub</title>
    <link rel="stylesheet" href="style.css">
    <style>
        /* V26 UI Enhancements */
        .match-row-horizontal { display: flex; justify-content: space-between; align-items: center; background: #fff; border-radius: 8px; padding: 10px; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .match-meta { flex: 1; font-size: 10px; color: #666; text-align: left; }
        .match-teams { flex: 3; display: flex; justify-content: center; align-items: center; gap: 10px; }
        .match-action { flex: 1; text-align: right; }
        .team-box { display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1; }
        .score-input-group { display: flex; flex-direction: column; align-items: center; }
        .score-input { width: 35px; height: 35px; text-align: center; border: 2px solid #ddd; border-radius: 6px; font-weight: bold; font-size: 16px; margin: 0 5px; }
        .pen-input { width: 25px; height: 20px; text-align: center; border: 1px dashed #aaa; border-radius: 3px; font-size: 10px; background: #f9f9f9; margin-top: 2px; }
        .btn-save { background: var(--primary); color: white; border: none; padding: 5px 10px; border-radius: 4px; font-size: 11px; cursor: pointer; }
        .btn-save.loading { background: #ccc; }
        .family-squad-section { margin-bottom: 25px; background: #fdfdfd; padding: 15px; border-radius: 8px; border: 1px solid #eee; }
        .family-squad-section h3 { margin-top: 0; color: var(--primary); border-bottom: 2px solid var(--primary); padding-bottom: 5px; display: inline-block; }
        .next-match { border: 2px solid var(--primary); box-shadow: 0 0 10px rgba(0, 51, 102, 0.2); }
    </style>
</head>
<body>
    <div class="header" onclick="show('home')">WORLD Cup 2026™</div>

    <div id="debug-console" style="display:none; background:#111; color:#0f0; padding:15px; margin:10px auto; max-width:900px; font-family:monospace; font-size:12px; border-radius:8px; overflow-x:auto; max-height: 200px; overflow-y: auto; text-align:left; line-height:1.5;">
        <strong style="color:#fff;">[SYSTEM DIAGNOSTICS - V26]</strong><br>
    </div>
    
    <div id="screen-home" class="screen active">
        <div class="tile-grid">
            <div class="tile" onclick="show('leaderboard')">🏆 Leaderboard</div>
            <div class="tile" onclick="show('groups')">📊 Group Standings</div>
            <div class="tile" onclick="show('bracket')">🎯 Knockouts</div>
            <div class="tile" onclick="show('fixtures')">⚽ Matches & Results</div>
            <div class="tile" onclick="show('teams')">👥 Family Squads</div>
            <div class="tile" onclick="show('transfers')">🔄 Transfers</div>
        </div>
        <div id="sync-status" style="text-align:center; margin-top:20px; font-size:13px; font-weight:bold; color:var(--primary);">Initializing System...</div>
    </div>
    
    <div id="screen-leaderboard" class="screen"><button class="btn-back" onclick="show('home')">← Back</button><div id="leaderboard-data"></div></div>
    <div id="screen-groups" class="screen"><button class="btn-back" onclick="show('home')">← Back</button><div id="groups-data"></div></div>
    <div id="screen-bracket" class="screen"><button class="btn-back" onclick="show('home')">← Back</button><div id="bracket-data" class="bracket-container"></div></div>
    <div id="screen-fixtures" class="screen"><button class="btn-back" onclick="show('home')">← Back</button><div id="fixtures-data"></div></div>
    <div id="screen-teams" class="screen"><button class="btn-back" onclick="show('home')">← Back</button><div id="team-tables"></div></div>
    <div id="screen-transfers" class="screen"><button class="btn-back" onclick="show('home')">← Back</button><div id="history-data"></div></div>

    <nav class="nav-bar">
        <div class="nav-btn" onclick="show('home')">🏠<br>Home</div>
        <div class="nav-btn" onclick="show('groups')">📊<br>Groups</div>
        <div class="nav-btn" onclick="show('bracket')">🎯<br>Bracket</div>
        <div class="nav-btn" onclick="show('fixtures')">⚽<br>Matches</div>
        <div class="nav-btn" onclick="show('teams')">👥<br>Squads</div>
    </nav>

    <script src="app.js?v=26"></script>
</body>
</html>
