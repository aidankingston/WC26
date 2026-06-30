const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwJg28FI1maQPvXELfK3kbgM7PNMj-_pQ73w0b11TPkW3jTGdftEhto7OfBu-2Qc5Medg/exec";
let appData = {fixtures:[], sweets:{}};

const KO_GAMES = [
  {id: 74, t1: "Germany", t2: "Paraguay", r: "r32"}, {id: 89, t1: "Winner 74", t2: "Winner 77", r: "r16"}
];

function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-'+id).classList.add('active');
}

function getPts(m) {
  if (m <= 88) return 5;
  if (m <= 96) return 7;
  if (m <= 100) return 10;
  if (m <= 103) return 25;
  return 50;
}

async function init() {
  const res = await fetch(SCRIPT_URL + "?action=getAll");
  const text = await res.text();
  appData = JSON.parse(text.substring(text.indexOf('(')+1, text.lastIndexOf(')')));
  render();
}

function render() {
  const bDiv = document.getElementById('bracket-data');
  bDiv.innerHTML = `<div class="bracket-round"><h4>R32</h4>` + 
    KO_GAMES.filter(g => g.r === 'r32').map(g => `<div class="match-card">${g.t1} v ${g.t2}</div>`).join('') + `</div>`;
  
  const lDiv = document.getElementById('leaderboard-data');
  lDiv.innerHTML = `<table><tr><th>Name</th><th>Sweets</th></tr>` + 
    Object.entries(appData.sweets || {}).map(([n, s]) => `<tr><td>${n}</td><td>${s}</td></tr>`).join('') + `</table>`;
}

init();
