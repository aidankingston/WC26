const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwJg28FI1maQPvXELfK3kbgM7PNMj-_pQ73w0b11TPkW3jTGdftEhto7OfBu-2Qc5Medg/exec";
let appData = {fixtures:[], scores:{}, owners:{}, sweets:{}, transferLog:[]};

const KO_GAMES = [
  {id: 74, t1: "Germany", t2: "Paraguay", r: "r32"}, {id: 75, t1: "Netherlands", t2: "Morocco", r: "r32"},
  {id: 76, t1: "Brazil", t2: "Japan", r: "r32"}, {id: 77, t1: "France", t2: "Sweden", r: "r32"},
  {id: 78, t1: "Côte d'Ivoire", t2: "Norway", r: "r32"}, {id: 79, t1: "Mexico", t2: "Ecuador", r: "r32"},
  {id: 80, t1: "England", t2: "Congo DR", r: "r32"}, {id: 81, t1: "USA", t2: "Bosnia and Herzegovina", r: "r32"},
  {id: 82, t1: "Belgium", t2: "Senegal", r: "r32"}, {id: 83, t1: "Portugal", t2: "Croatia", r: "r32"},
  {id: 84, t1: "Spain", t2: "Austria", r: "r32"}, {id: 85, t1: "Switzerland", t2: "Algeria", r: "r32"},
  {id: 86, t1: "Argentina", t2: "Cabo Verde", r: "r32"}, {id: 87, t1: "Colombia", t2: "Ghana", r: "r32"},
  {id: 88, t1: "Australia", t2: "Egypt", r: "r32"}, {id: 89, t1: "Winner 74", t2: "Winner 77", r: "r16"},
  {id: 90, t1: "Canada", t2: "Winner 75", r: "r16"}, {id: 91, t1: "Winner 76", t2: "Winner 78", r: "r16"},
  {id: 92, t1: "Winner 79", t2: "Winner 80", r: "r16"}
];

async function init() {
  const res = await fetch(SCRIPT_URL + "?action=getAll");
  const text = await res.text();
  appData = JSON.parse(text.substring(text.indexOf('(')+1, text.lastIndexOf(')')));
  render();
}

function getPoints(mNum) {
  if (mNum <= 88) return 5;
  if (mNum <= 96) return 7;
  if (mNum <= 100) return 10;
  if (mNum <= 103) return 25;
  return 50;
}

function render() {
  // Leaderboard with new scoring
  const lDiv = document.getElementById('leaderboard-data');
  let html = `<table><tr><th>Family</th><th>Pts</th><th>Sweets</th></tr>`;
  Object.keys(appData.sweets || {}).forEach(m => {
    html += `<tr><td>${m}</td><td>${appData.sweets[m] || 0}</td></tr>`;
  });
  lDiv.innerHTML = html + "</table>";

  // Bracket with live scores
  const bDiv = document.getElementById('bracket-data');
  bDiv.innerHTML = `
    <div class="bracket-round"><h4>R32 (5pts)</h4>` + 
    KO_GAMES.filter(g => g.r === 'r32').map(g => `<div class="match-card">${g.t1} v ${g.t2}</div>`).join('') + `</div>
    <div class="bracket-round"><h4>R16 (7pts)</h4>` + 
    KO_GAMES.filter(g => g.r === 'r16').map(g => `<div class="match-card">${g.t1} v ${g.t2}</div>`).join('') + `</div>`;
}

async function saveScore(id, h, a, pens) {
  await fetch(`${SCRIPT_URL}?action=update&id=${id}&h=${h}&a=${a}&pens=${pens}`);
  init();
}

init();
