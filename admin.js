const firebaseConfig = {
  apiKey: "YOUR_GEMINI_API_KEY",
  authDomain: "chatsphere-c26f5.firebaseapp.com",
  projectId: "chatsphere-c26f5",
  storageBucket: "chatsphere-c26f5.appspot.com",
  messagingSenderId: "420186186951",
  appId: "1:420186186951:web:e131eabb49c9286e33cae2"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

const adminApp = document.getElementById("admin-app");
const authGuard = document.getElementById("auth-guard");

auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  // STRICT ADMIN VERIFICATION
  if (user.email !== "jarvis@stark.local") {
    alert("SECURITY BREACH: UNAUTHORIZED ACCESS. Redirecting field agent.");
    window.location.href = "index.html";
    return;
  }
  
  authGuard.style.display = "none";
  adminApp.style.display = "block";
  loadData();
  startSystemMetrics();
});

function escapeHTML(str) {
  if (!str) return "";
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag])
  );
}

async function loadData() {
  const snapshot = await db.collection("comms_core").orderBy("time", "desc").get();
  
  let total = 0;
  let today = 0;
  let jarvis = 0;
  let friday = 0;
  
  const now = new Date();
  const logBody = document.getElementById("log-body");
  logBody.innerHTML = "";
  
  snapshot.forEach(doc => {
    const data = doc.data();
    if (!data.user && !data.isSystem) return;
    
    total++;
    
    const isJarvis = data.user === "jarvis@stark.local";
    if (isJarvis) jarvis++;
    if (data.user === "friday@stark.local") friday++;
    
    let msgDateStr = "Unknown";
    let msgTimeStr = "Unknown";
    let isToday = false;
    
    if (data.time) {
      const ms = typeof data.time.toMillis === 'function' ? data.time.toMillis() : Number(data.time);
      const d = new Date(ms);
      msgDateStr = d.toLocaleDateString();
      msgTimeStr = d.toLocaleTimeString();
      if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        today++;
        isToday = true;
      }
    }
    
    let senderText = data.isSystem ? "SYSTEM" : (data.displayName || data.user.split('@')[0]);
    let typeText = data.attachment ? "ATTACHMENT" : "TEXT_MSG";
    if (data.deleted) typeText = "EXPUNGED";
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="${isToday ? 'color:#fff' : 'color:var(--text-sec)'}">${msgDateStr}</td>
      <td style="color:var(--text-sec)">${msgTimeStr}</td>
      <td style="color:${isJarvis ? 'var(--primary)' : 'var(--green)'}">${escapeHTML(senderText)}</td>
      <td style="color:var(--text-sec); font-family:monospace; font-size:0.75rem;">${typeText}</td>
      <td><span style="color:${data.deleted ? 'var(--orange)' : (data.edited ? 'var(--primary)' : 'var(--text-sec)')}">${data.deleted ? 'DELETED' : (data.edited ? 'EDITED' : 'SECURE')}</span></td>
    `;
    logBody.appendChild(tr);
  });
  
  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-today").textContent = today;
  document.getElementById("stat-jarvis").textContent = jarvis;
  document.getElementById("stat-friday").textContent = friday;
}

function startSystemMetrics() {
  const chronoEl = document.getElementById("chrono-val");
  const dateEl   = document.getElementById("date-val");
  
  setInterval(() => {
    const now = new Date();
    if (chronoEl) chronoEl.textContent = now.toLocaleTimeString('en-GB', { hour12: false });
    if (dateEl) {
      const day = now.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
      const date = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
      dateEl.textContent = `${day} ${date}`;
    }
  }, 1000);
}

// Cleanup old toggle listener IF it exists (optional but cleaner)
const oldToggle = document.getElementById("toggle-crypto");
if (oldToggle) oldToggle.remove();
