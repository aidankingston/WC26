const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwJg28FI1maQPvXELfK3kbgM7PNMj-_pQ73w0b11TPkW3jTGdftEhto7OfBu-2Qc5Medg/exec";
let appData = {fixtures:[], scores:{}, owners:{}, sweets:{}};

const KO_GAMES = [
  {id: 74, t1: "Germany", t2: "Paraguay", r: "r32"}, {id: 89, t1: "Winner 74", t2: "Winner 77", r: "r16"}
  // Add your full list here as we discussed...
];

function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-'+id).classList.add('active');
}

async function init() {
  try {
    const res = await fetch(SCRIPT_URL + "?action=getAll");
    const text = await res.text();
    appData = JSON.parse(text.substring(text.indexOf('(')+1, text.lastIndexOf(')')));
    render();
  } catch(e) { console.error("Init Error", e); }
}

function render() {
  // Logic to populate #bracket-data and #leaderboard-data
  document.getElementById('bracket-data').innerHTML = KO_GAMES.map(g => `<div class="match-card">${g.t1} v ${g.t2}</div>`).join('');
}

init();
