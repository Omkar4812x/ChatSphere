// =============================================================
//  auth.js – ChatSphere Private Agent Authentication
// =============================================================

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
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

auth.onAuthStateChanged((user) => {
  if (user) {
    window.location.href = "index.html";
  }
});

// ─── DOM ──────────────────────────────────────────────────────
const agentSelBox  = document.getElementById("agent-selection");
const passcodeArea = document.getElementById("passcode-entry");
const passcodeInp  = document.getElementById("passcode-input");
const authSubmit   = document.getElementById("auth-submit");
const authError    = document.getElementById("auth-error");
const passLabel    = document.getElementById("passcode-label");


let selectedAgent = null;

// The core credentials matching standard Firebase email/password
// The user doesn't need to know the complex password, just their 4-digit PIN
const AGENTS = {
  jarvis: {
    email: "jarvis@stark.local",
    name: "JARVIS",
    authPrefix: "JARVIS_AUTH_SECURE_" // Their PIN is appended to this
  },
  friday: {
    email: "friday@stark.local",
    name: "FRIDAY",
    authPrefix: "FRIDAY_AUTH_SECURE_"
  }
};

window.selectAgent = (id) => {
  selectedAgent = id;
  agentSelBox.style.display = "none";
  passcodeArea.style.display = "flex";
  passLabel.textContent = `AUTHORIZING AGENT: ${AGENTS[id].name}`;
  passcodeInp.value = "";
  passcodeInp.focus();
};

window.cancelSelection = () => {
  selectedAgent = null;
  passcodeArea.style.display = "none";
  authError.style.display = "none";
  agentSelBox.style.display = "flex";
};

// Handle Enter key for PIN
passcodeInp.addEventListener("keydown", (e) => {
  if (e.key === "Enter") attemptAuth();
});
authSubmit.onclick = attemptAuth;

async function attemptAuth() {
  const pin = passcodeInp.value.trim();
  if (pin.length < 4) {
    showError("4-DIGIT PASSCODE REQUIRED");
    return;
  }
  
  const agent = AGENTS[selectedAgent];
  const fullPassword = agent.authPrefix + pin;
  const originalHtml = authSubmit.innerHTML;
  
  authSubmit.innerHTML = "<div style='width:20px;height:20px;border:2px solid;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;'></div>";
  authSubmit.style.pointerEvents = "none";
  
  try {
    // 1. Try to login
    await auth.signInWithEmailAndPassword(agent.email, fullPassword);
    
  } catch (err) {
    if (err.code === "auth/invalid-login-credentials" || err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
       
       // Because Firebase hides whether the user exists or just typed the wrong password (for security),
       // we attempt to create the user with the password they provided!
       try {
         const creds = await auth.createUserWithEmailAndPassword(agent.email, fullPassword);
         await creds.user.updateProfile({ displayName: agent.name });
         // onAuthStateChanged will handle the redirect seamlessly!
       } catch(creationErr) {
         if (creationErr.code === "auth/email-already-in-use") {
            // The agent already exists in the backend, meaning they just typed the wrong PIN!
            showError("ACCESS DENIED: INCORRECT PASSCODE");
         } else {
            showError(`INIT FAILED: ${creationErr.message}`);
         }
         resetBtn(originalHtml);
       }
       
    } else {
      showError(`SYSTEM ERR: ${err.message}`);
      resetBtn(originalHtml);
    }
  }
}

function showError(msg) {
  authError.textContent = msg;
  authError.style.display = "block";
  passcodeInp.value = "";
  passcodeInp.focus();
}

function resetBtn(html) {
  authSubmit.innerHTML = html;
  authSubmit.style.pointerEvents = "auto";
}
