// =============================================================
//  app.js – ChatSphere Main Logic (v3 – Full Feature Upgrade)
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
const db   = firebase.firestore();
const storage = firebase.storage();
db.enablePersistence({ synchronizeTabs: true }).catch(() => {});

const messagesRef = db.collection("comms_core");
const usersRef    = db.collection("agents_core");

// ─── DOM Elements ─────────────────────────────────────────────
const authGuard      = document.getElementById("auth-guard");
const chatApp        = document.getElementById("chat-app");
const chatMessages   = document.getElementById("chat-messages");
const messageInput   = document.getElementById("message-input");
const sendBtn        = document.getElementById("send-btn");
const userEmailEl    = document.getElementById("user-email");
const logoutBtn      = document.getElementById("logout-btn");
const msgCountEl     = document.getElementById("msg-count");
const emptyState     = document.getElementById("empty-state");
const toastContainer = document.getElementById("toast-container");

const sidebar        = document.getElementById("users-sidebar");
const sidebarToggle  = document.getElementById("sidebar-toggle");
const usersList      = document.getElementById("users-list");
const onlineCount    = document.getElementById("online-count");

const typingBar      = document.getElementById("typing-bar");
const typingAvatar   = document.getElementById("typing-avatar");
const typingText     = document.getElementById("typing-text");

const replyBar       = document.getElementById("reply-bar");
const replySenderEl  = document.getElementById("reply-sender");
const replyTextEl    = document.getElementById("reply-text");
const cancelReplyBtn = document.getElementById("cancel-reply");

const emojiPicker    = document.getElementById("emoji-picker");

const searchToggle   = document.getElementById("search-toggle");
const searchBar      = document.getElementById("search-bar");
const searchInput    = document.getElementById("search-input");
const searchResults  = document.getElementById("search-results");
const closeSearch    = document.getElementById("close-search");

const attachBtn      = document.getElementById("attach-btn");
const fileInput      = document.getElementById("file-input");

const clearChatBtn   = document.getElementById("clear-chat");
const soundToggle    = document.getElementById("sound-toggle");
const soundIcon      = document.getElementById("sound-icon");
const themeCycle     = document.getElementById("theme-cycle");

const securityToggle = document.getElementById("security-toggle");
const securityModal  = document.getElementById("security-modal");
const closeSecurity  = document.getElementById("close-security");
const currentPinInp  = document.getElementById("current-pin");
const newPinInp      = document.getElementById("new-pin");
const updatePinBtn   = document.getElementById("update-pin-btn");

const chronoVal     = document.getElementById("chrono-val");

// ─── State ────────────────────────────────────────────────────
let currentUser    = null;
let currentProfile = { name: "", email: "", shortName: "" };
let unsubscribeMsg = null;
let unsubscribeUsr = null;
let replyingTo     = null; // { id, text, sender }
let editingMsgId   = null;
let activeReactionMsgId = null;
let lastDateLabel  = "";
let sessionStart   = Date.now();
let soundEnabled   = true;
let isSearchActive = false;
let searchQuery    = "";
let burnMode       = false;
const burnToggle   = document.getElementById("burn-toggle");

// ─── Armor Palettes State ───
const ARMOR_SUITS = [
  { id: "default", name: "CHATSphere BLUE" },
  { id: "mark-iii", name: "MARK III [IRON MAN]" },
  { id: "stealth", name: "STEALTH OPS [S.H.I.E.L.D.]" },
  { id: "war-machine", name: "WAR MACHINE [COMBAT]" },
  { id: "hulkbuster", name: "HULKBUSTER [HEAVY]" }
];

let curThemeIdx = 0;

function applyArmorTheme(themeId) {
  ARMOR_SUITS.forEach(s => document.body.classList.remove(`theme-${s.id}`));
  if (themeId !== "default") document.body.classList.add(`theme-${themeId}`);
  localStorage.setItem("armor_suit", themeId);
  curThemeIdx = ARMOR_SUITS.findIndex(s => s.id === themeId);
  if (curThemeIdx === -1) curThemeIdx = 0;
  
  // Refresh particles to match new primary color
  if (typeof initParticles === "function") initParticles();
}

// Audio contexts (synth sounds)
const AudioContext = window.AudioContext || window.webkitAudioContext;
const actx = new AudioContext();

function playSound(type = "recv") {
  if (!soundEnabled || actx.state === 'suspended') return;
  const osc = actx.createOscillator();
  const gain = actx.createGain();
  osc.connect(gain);
  gain.connect(actx.destination);
  
  if (type === "send") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, actx.currentTime + 0.1);
    gain.gain.setValueAtTime(0, actx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, actx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.1);
  } else if (type === "recv") {
    // Two-tone melodic alert for mobile
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, actx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(1320, actx.currentTime + 0.1); // E6
    gain.gain.setValueAtTime(0, actx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, actx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.2);
  }
  
  osc.start(actx.currentTime);
  osc.stop(actx.currentTime + 0.2);
}

// Enable audio context on first user interaction
document.body.addEventListener('click', () => {
  if (actx.state === 'suspended') actx.resume();
}, { once: true });

// ─── INIT ─────────────────────────────────────────────────────
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  
  const displayName = user.displayName || user.email.split("@")[0];
  currentProfile = {
    email: user.email,
    name: displayName,
    shortName: displayName.substring(0, 2).toUpperCase()
  };

  // RESTRICTED ADMIN ACCESS
  if (user.email === "jarvis@stark.local") {
    const adminLink = document.getElementById("admin-link");
    if (adminLink) adminLink.style.display = "inline-flex";
  }

  userEmailEl.textContent = currentProfile.name.toUpperCase();
  authGuard.style.display = "none";
  chatApp.style.display   = "flex";

  // RESTORE SAVED ARMOR PALETTE
  const savedTheme = localStorage.getItem("armor_suit") || "default";
  applyArmorTheme(savedTheme);

  setInterval(updateChronoHUD, 1000);

  // Optimized Notification Permission Flow
  if ("Notification" in window) {
    if (Notification.permission === "default") {
      setTimeout(() => {
        showToast("PROTOCOL: Enable HUD Notifications for real-time alerts. [TAP HERE]", 6000);
        // Add a one-time click listener to the toast container to trigger permission
        const trigger = () => {
          Notification.requestPermission();
          toastContainer.removeEventListener('click', trigger);
        };
        toastContainer.addEventListener('click', trigger);
      }, 3000);
    }
  }

  initParticles();
  
  // Update presence
  await setOnlineStatus(true);
  
  startMessagesListener();
  startUsersListener();
});

// Handle presence on disconnect/unload
window.addEventListener("beforeunload", () => {
  if (currentUser) setOnlineStatus(false);
});

async function setOnlineStatus(isOnline) {
  if (!currentUser) return;
  const userDoc = usersRef.doc(currentUser.uid);
  try {
    await userDoc.set({
      email: currentProfile.email,
      name: currentProfile.name,
      online: isOnline,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
      typing: false
    }, { merge: true });
  } catch(e) { console.error("Presence error", e); }
}

// ─── Telemetry ────────────────────────────────────────────────

// ─── Listeners ────────────────────────────────────────────────
function startMessagesListener() {
  if (unsubscribeMsg) unsubscribeMsg();
  
  let initialLoadDone = false;
  
  unsubscribeMsg = messagesRef.orderBy("time", "asc").onSnapshot(
    (snapshot) => {
      clearMessages();
      let matchCount = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        data.id = doc.id;
        
        // Search filter
        if (isSearchActive && searchQuery) {
          if (!data.text || !data.text.toLowerCase().includes(searchQuery.toLowerCase())) return;
          matchCount++;
        }
        renderMessage(data);
      });
      
      if (isSearchActive) {
        searchResults.textContent = `${matchCount} MATCHES`;
      }
      
      toggleEmptyState(chatMessages.children.length === 1); // 1 = empty-state div
      
      // Auto-scroll on new message unless searching
      if (!isSearchActive) scrollToBottom();
      
      if (msgCountEl) msgCountEl.textContent = snapshot.size;
      
      // Play sound and trigger alert if new message arrived (exclude initial load & sent msgs)
      if (initialLoadDone && !isSearchActive) {
        const changes = snapshot.docChanges();
        changes.forEach(c => {
          if (c.type === "added") {
            const m = c.doc.data();
            if (m.user !== currentUser.email) {
              playSound("recv");
              // Physical Haptic Feedback
              if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
              
              if (document.hidden) triggerMissionAlert(m);
            }
          }
        });
      }
      initialLoadDone = true;
    },
    (err) => showToast(`Sync Error: ${err.message}`)
  );
}

function startUsersListener() {
  if (unsubscribeUsr) unsubscribeUsr();
  unsubscribeUsr = usersRef.onSnapshot(snap => {
    usersList.innerHTML = "";
    let onlineCtr = 0;
    let typists = [];
    
    snap.forEach(doc => {
      const u = doc.data();
      const isMe = doc.id === currentUser.uid;
      
      // STRICT WHITELIST: Only render JARVIS and FRIDAY into the sidebar ever
      const allowedEmails = ["jarvis@stark.local", "friday@stark.local"];
      if (!allowedEmails.includes(u.email)) return;
      
      if (!isMe) {
        if (u.online) onlineCtr++;
        if (u.typing) typists.push(u.name);
        
        const shrt = u.name ? u.name.substring(0,2).toUpperCase() : "?";
        const div = document.createElement("div");
        div.className = "user-item";
        div.innerHTML = `
          <div class="user-avatar">${shrt}</div>
          <div style="flex:1;min-width:0;">
            <div class="user-name">${escapeHTML(u.name)}</div>
            <div style="font-size:10px;color:var(--text-sec)">${u.online ? 'Online' : 'Offline'}</div>
          </div>
          ${u.online ? '<div class="user-online-dot"></div>' : ''}
        `;
        usersList.appendChild(div);
      }
    });
    
    if (usersList.children.length === 0) {
      usersList.innerHTML = `<div class="no-agents">Waiting for incoming signal...</div>`;
    }
    onlineCount.textContent = onlineCtr;
    
    // Update typing indicator
    if (typists.length > 0) {
      typingText.textContent = `${typists.join(", ")} is typing`;
      typingAvatar.textContent = typists[0].substring(0,2).toUpperCase();
      typingBar.style.display = "flex";
      scrollToBottom();
    } else {
      typingBar.style.display = "none";
    }
  });
}

// ─── Render Message ───────────────────────────────────────────
function renderMessage(data) {
  const { id, text: rawText, user, displayName, time, deleted, replyTo, reactions, attachment, burn, expiresAt, readBy } = data;
  if (!user && !data.isSystem) return;

  // ─── AUTO-READ LOGIC ───
  if (user !== currentUser?.email && (!readBy || !readBy.includes(currentUser?.email))) {
    messagesRef.doc(id).update({
      readBy: firebase.firestore.FieldValue.arrayUnion(currentUser.email)
    }).catch(() => {});
  }

  // ─── AES-256 DECRYPTION ───
  const E2E_KEY = "JARVIS_AES_256_STARK_NETWORK";
  let text = "";
  if (rawText) {
    try {
      const bytes = CryptoJS.AES.decrypt(rawText, E2E_KEY);
      text = bytes.toString(CryptoJS.enc.Utf8) || rawText;
    } catch(e) { text = rawText; }
  }

  const isSent = user === (currentUser ? currentUser.email : "");
  const isSys = data.isSystem;
  
  const msgDate = formatDate(time);
  const msgTime = formatTime(time);
  const senderLabel = isSys ? "SYSTEM" : (displayName || user.split("@")[0]);

  // Date sep
  if (!isSearchActive && msgDate && msgDate !== lastDateLabel) {
    lastDateLabel = msgDate;
    const sep = document.createElement("div");
    sep.className = "date-separator";
    sep.innerHTML = `<span>${msgDate}</span>`;
    chatMessages.appendChild(sep);
  }

  const wrapper = document.createElement("div");
  wrapper.className = `message-wrapper ${isSent ? "sent" : "received"}`;
  wrapper.dataset.id = id;

  // Avatar block
  const shortN = senderLabel.substring(0,2).toUpperCase();
  const avatarHtml = `<div class="msg-avatar">${shortN}</div>`;

  let bubbleHtml = "";

  if (deleted) {
    bubbleHtml = `<div class="message-bubble deleted">[ DATA EXPUNGED ]</div>`;
  } else {
    // Reply quote block
    let replyHtml = "";
    if (replyTo) {
      let decReply = "";
      if (replyTo.text) {
        try {
          const bytes = CryptoJS.AES.decrypt(replyTo.text, "JARVIS_AES_256_STARK_NETWORK");
          decReply = bytes.toString(CryptoJS.enc.Utf8) || replyTo.text;
        } catch(e) { decReply = replyTo.text; }
      }

      replyHtml = `
        <div class="reply-quote cursor-pointer">
          <span class="rq-sender">${escapeHTML(replyTo.sender)}</span>
          <span class="rq-text">${escapeHTML(decReply || 'Attachment')}</span>
        </div>`;
    }

    // Highlighting for search
    let renderedText = escapeHTML(text || "");
    if (isSearchActive && searchQuery && renderedText) {
      const regex = new RegExp(`(${searchQuery})`, "gi");
      renderedText = renderedText.replace(regex, `<span class="highlight">$1</span>`);
    }

    // Attachment
    let attachHtml = "";
    if (attachment) {
      const attachType = attachment.type || "";
      if (attachType.startsWith("image/")) {
        attachHtml = `<img src="${attachment.url}" alt="Attachment" style="max-width:100%; border-radius:2px; margin-top:0.3rem; border:1px solid var(--border);" />`;
      } else {
        attachHtml = `<div style="margin-top:0.3rem;"><a href="${attachment.url}" target="_blank" style="color:var(--primary); text-decoration:none;">📎 ${escapeHTML(attachment.name || "Document")}</a></div>`;
      }
    }

    // Double tick SVG (Read Receipts)
    let tickHtml = "";
    if (isSent) {
      const isRead = readBy && readBy.length > 1;
      tickHtml = `
        <span class="tick-icon ${isRead ? 'read' : ''}" title="${isRead ? 'Read' : 'Sent'}">
          <svg viewBox="0 0 20 12" style="width:14px; height:10px; fill:none;">
            <path d="M1 6l4 4L13 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: ${isRead ? 1 : 0.5}"/>
            <path d="M7 6l4 4 5.5-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: ${isRead ? 'block' : 'none'}"/>
          </svg>
        </span>
      `;
    }

    // Burn Countdown
    let burnHtml = "";
    if (burn && !deleted) {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      if (remaining <= 0) {
        // Auto-erase
        messagesRef.doc(id).delete().catch(() => {});
        return; // Don't render
      }
      burnHtml = `<span style="color:var(--orange); font-size:0.6rem; margin-right:5px; font-family:var(--font-mono); animation:pulse 1s infinite;">🔥 ${remaining}s</span>`;
    }

    // Reactions formatting
    let reactHtml = "";
    if (reactions && Object.keys(reactions).length > 0) {
      reactHtml = `<div class="reactions-row">`;
      for (const [emoji, usersArr] of Object.entries(reactions)) {
        const count = usersArr.length;
        const iReacted = usersArr.includes(currentUser.email);
        reactHtml += `<div class="reaction-chip ${iReacted ? 'mine' : ''}" onclick="addReaction('${id}', '${emoji}')">
          <span class="rc-emoji">${emoji}</span> <span class="rc-count">${count}</span>
        </div>`;
      }
      reactHtml += `</div>`;
    }

    bubbleHtml = `
      <div class="message-bubble" ${isSys ? 'style="border-color:var(--orange);color:var(--orange);background:rgba(255,107,0,.08);"' : ''}>
        ${!isSys ? `<button class="react-btn" title="React" onclick="openEmojiPicker(event, '${id}')">☻</button>` : ''}
        ${isSent && !isSys ? `
          <button class="delete-btn" title="Delete" onclick="deleteMessage('${id}')">✗</button>
          <button class="edit-btn" title="Edit" onclick="editMessage('${id}', \`${escapeTextAttr(text)}\`)" style="position:absolute; right:32px; top:-10px; opacity:0; font-size:12px; border:1px solid var(--primary); background:#020810; color:var(--primary); padding:2px 6px; border-radius:12px; cursor:pointer; transition:all 0.2s;">✎</button>
        ` : ''}
        ${!isSent && !isSys ? `<button class="react-btn" style="right:auto;left:-10px;" title="Reply" onclick="setupReply('${id}', \`${escapeTextAttr(text)}\`, '${escapeTextAttr(senderLabel)}')">↰</button>` : ''}
        
        ${replyHtml}
        ${renderedText ? `<div>${renderedText}</div>` : ''}
        ${attachHtml}
        ${reactHtml}
      </div>
      <div class="message-meta">
        ${!isSent ? `<span class="message-sender" ${isSys ? 'style="color:var(--orange);text-shadow:0 0 6px rgba(255,107,0,.5);"' : ''}>${escapeHTML(senderLabel)}</span>` : ""}
        <span class="message-time">
          ${burnHtml}
          ${msgTime} ${data.edited ? '<i style="font-size:0.75em; opacity:0.6;">(edited)</i>' : ''}
        </span>
        ${!isSys ? tickHtml : ''}
      </div>
    `;
  }

  wrapper.innerHTML = `<div class="bubble-row">${!isSent && !isSys ? avatarHtml : ''}<div>${bubbleHtml}</div>${isSent ? avatarHtml : ''}</div>`;
  chatMessages.appendChild(wrapper);
}

function clearMessages() {
  Array.from(chatMessages.children).forEach(c => {
    if(c.id !== "empty-state" && c.id !== "typing-bar") c.remove();
  });
  lastDateLabel = "";
}

// ─── Actions & File Upload ────────────────────────────────────

let pendingAttachment = null;

// Trigger hidden file input
attachBtn.onclick = () => fileInput.click();

fileInput.onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  if (file.size > 5 * 1024 * 1024) {
    showToast("File too large. Max 5MB.");
    return;
  }
  
  showToast(`Uploading ${file.name}...`);
  attachBtn.style.opacity = "0.5";
  attachBtn.style.pointerEvents = "none";
  
  try {
    const ext = file.name.split('.').pop();
    const storageRef = storage.ref(`chat_uploads/${Date.now()}_${Math.random().toString(36).substring(2,7)}.${ext}`);
    await storageRef.put(file);
    const url = await storageRef.getDownloadURL();
    
    pendingAttachment = {
      url: url,
      name: file.name,
      type: file.type || ""
    };
    
    showToast("Attachment ready. Transmitting...");
    sendMessage(); // Auto-send to skip requiring the user to hit Enter
  } catch (err) {
    showToast(`Upload failed: ${err.message}`);
  } finally {
    attachBtn.style.opacity = "1";
    attachBtn.style.pointerEvents = "auto";
    fileInput.value = "";
  }
};

async function sendMessage() {
  const text = messageInput.value.trim();
  
  // Handle empty text when editing is active (cancels edit)
  if (!text && editingMsgId) {
    editingMsgId = null;
    messageInput.placeholder = "Transmit message / upload...";
    document.getElementById("chat-dropzone").style.borderColor = "";
    document.getElementById("chat-dropzone").style.boxShadow = "";
    return;
  }

  if ((!text && !pendingAttachment) || !currentUser) return;

  messageInput.value = "";
  messageInput.placeholder = "Transmit message / upload...";
  autoResizeTextarea();
  setTyping(false);
  
  // ─── AES-256 ENCRYPTION ───
  const E2E_KEY = "JARVIS_AES_256_STARK_NETWORK";
  const cipherText = text ? CryptoJS.AES.encrypt(text, E2E_KEY).toString() : "";

  // ─── EDIT MESSAGE ───
  if (editingMsgId) {
    try {
      await messagesRef.doc(editingMsgId).update({ text: cipherText, edited: true });
      editingMsgId = null;
      document.getElementById("chat-dropzone").style.borderColor = "";
      document.getElementById("chat-dropzone").style.boxShadow = "";
    } catch(e) { showToast("Edit failed."); }
    return;
  }

  
  const payload = {
    text: cipherText,
    user: currentUser.email,
    displayName: currentProfile.name,
    time: firebase.firestore.FieldValue.serverTimestamp(),
    deleted: false,
    reactions: {},
    readBy: [currentUser.email]
  };

  if (burnMode) {
    payload.burn = true;
    payload.expiresAt = Date.now() + (60 * 1000); // 60 seconds
  }
  
  if (pendingAttachment) {
    payload.attachment = pendingAttachment;
    pendingAttachment = null;
  }
  
  if (replyingTo) {
    payload.replyTo = {
      id: replyingTo.id,
      text: CryptoJS.AES.encrypt(replyingTo.text, E2E_KEY).toString(),
      sender: replyingTo.sender
    };
    cancelReply();
  }

  try {
    await messagesRef.add(payload);
    playSound("send"); // beep!
  } catch (err) {
    showToast(`Send failed: ${err.message}`);
    messageInput.value = text;
  }
}

// ─── AI BOT (SYSTEM) ──────────────────────────────────────────


async function deleteMessage(id) {
  if(!confirm("Erase transmission?")) return;
  try {
    await messagesRef.doc(id).update({ deleted: true, text: "", reactions: {} });
  } catch(e) { showToast("Error deleting message. Check Firestore rules."); }
}

function setupReply(id, text, sender) {
  replyingTo = { id, text, sender };
  replySenderEl.textContent = sender;
  replyTextEl.textContent = text;
  replyBar.style.display = "flex";
  messageInput.focus();
}

function cancelReply() {
  replyingTo = null;
  replyBar.style.display = "none";
}

cancelReplyBtn.onclick = cancelReply;

// ─── Reactions (Emoji Picker) ─────────────────────────────────
burnToggle.onclick = () => {
  burnMode = !burnMode;
  burnToggle.style.color = burnMode ? "var(--orange)" : "var(--text-sec)";
  burnToggle.style.filter = burnMode ? "drop-shadow(0 0 8px var(--orange))" : "none";
  showToast(burnMode ? "Self-Destruct Mode: ACTIVE" : "Self-Destruct Mode: DISABLED");
};

function openEmojiPicker(e, msgId) {
  e.stopPropagation();
  activeReactionMsgId = msgId;
  const rect = e.target.getBoundingClientRect();
  emojiPicker.style.display = "flex";
  
  // Position above the button ensuring it stays on screen
  let top = rect.top - emojiPicker.offsetHeight - 5;
  let left = rect.left - 50;
  if (top < 0) top = rect.bottom + 5;
  if (left < 0) left = 10;
  
  emojiPicker.style.top = `${top}px`;
  emojiPicker.style.left = `${left}px`;
}

document.addEventListener("click", (e) => {
  if (!emojiPicker.contains(e.target)) emojiPicker.style.display = "none";
});

document.querySelectorAll(".ep-btn").forEach(btn => {
  btn.onclick = (e) => {
    const emoji = e.target.dataset.emoji;
    if (activeReactionMsgId) addReaction(activeReactionMsgId, emoji);
    emojiPicker.style.display = "none";
  };
});

async function addReaction(msgId, emoji) {
  if (!currentUser) return;
  const msgDoc = messagesRef.doc(msgId);
  try {
    await db.runTransaction(async (t) => {
      const doc = await t.get(msgDoc);
      if (!doc.exists) return;
      const data = doc.data();
      if (data.deleted) return;
      
      const email = currentUser.email;
      const reacts = data.reactions || {};
      
      if (!reacts[emoji]) reacts[emoji] = [];
      
      const idx = reacts[emoji].indexOf(email);
      if (idx > -1) {
        reacts[emoji].splice(idx, 1); // toggle off
        if (reacts[emoji].length === 0) delete reacts[emoji];
      } else {
        reacts[emoji].push(email); // toggle on
      }
      
      t.update(msgDoc, { reactions: reacts });
    });
  } catch(e) { showToast("Reaction failed. Check Firestore rules."); }
}

window.editMessage = (id, oldText) => {
  editingMsgId = id;
  messageInput.value = oldText;
  messageInput.focus();
  messageInput.placeholder = "Edit message (clear to cancel)...";
  const dropzone = document.getElementById("chat-dropzone");
  dropzone.style.borderColor = "var(--orange)";
  dropzone.style.boxShadow = "0 0 10px rgba(255,107,0,0.3)";
};

// ─── Input & Typing ───────────────────────────────────────────

let typingTimer;
function setTyping(isTyping) {
  if (!currentUser) return;
  usersRef.doc(currentUser.uid).update({ typing: isTyping }).catch(()=>{});
}

messageInput.addEventListener("input", () => {
  autoResizeTextarea();
  setTyping(true);
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => setTyping(false), 2000);
});

messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener("click", sendMessage);

// ─── Header Controls ──────────────────────────────────────────

if (clearChatBtn) clearChatBtn.onclick = async () => {
  if(!confirm("⚠️ CRITICAL ALARM: This will permanently wipe ALL chat history for both agents globally! Proceed?")) return;
  try {
    const snap = await messagesRef.get();
    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    showToast("[ SYSTEM PURGED ] All comms permanently erased.");
  } catch(e) { 
    showToast("Wipe Failed. Check network."); 
  }
};

sidebarToggle.onclick = () => sidebar.classList.toggle("collapsed");

soundToggle.onclick = () => {
  soundEnabled = !soundEnabled;
  if (!soundEnabled) {
    soundIcon.innerHTML = `<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.97v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>`;
    showToast("Comm audio: OFFLINE");
  } else {
    soundIcon.innerHTML = `<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.97z"/>`;
    showToast("Comm audio: ONLINE");
    if(actx.state === 'suspended') actx.resume();
    playSound("send");
  }
};


themeCycle.onclick = () => {
  curThemeIdx = (curThemeIdx + 1) % ARMOR_SUITS.length;
  const suit = ARMOR_SUITS[curThemeIdx];
  applyArmorTheme(suit.id);
  showToast(`ARMOR SUIT ACTIVATED: ${suit.name}`);
};

// ─── Search ───────────────────────────────────────────────────

searchToggle.onclick = () => {
  isSearchActive = !isSearchActive;
  if(isSearchActive) {
    searchBar.style.display = "flex";
    searchToggle.classList.add("active");
    searchInput.focus();
    showToast("SEARCH PROTOCOL ENGAGED");
  } else {
    closeSearchMode();
  }
};

closeSearch.onclick = closeSearchMode;

function closeSearchMode() {
  isSearchActive = false;
  searchQuery = "";
  searchInput.value = "";
  searchBar.style.display = "none";
  searchToggle.classList.remove("active");
  startMessagesListener(); // restart listener to remove filters
  scrollToBottom();
}

searchInput.addEventListener("input", (e) => {
  searchQuery = e.target.value.trim();
  startMessagesListener(); // trigger re-render
});

logoutBtn.addEventListener("click", async () => {
  if (unsubscribeMsg) unsubscribeMsg();
  if (unsubscribeUsr) unsubscribeUsr();
  await setOnlineStatus(false);
  await auth.signOut();
  window.location.href = "login.html";
});

// ─── Sidebar Toggle ───────────────────────────────────────────
sidebarToggle.onclick = () => {
  sidebar.classList.toggle("active");
};

// Close sidebar when clicking outside (mobile)
document.addEventListener("mousedown", (e) => {
  if (window.innerWidth <= 820 && sidebar.classList.contains("active")) {
    if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
      sidebar.classList.remove("active");
    }
  }
});

// ─── Security Settings (Change PIN) ───────────────────────────
securityToggle.onclick = () => {
  securityModal.style.display = "flex";
  currentPinInp.value = "";
  newPinInp.value = "";
  currentPinInp.focus();
};

window.closeSecurityModal = () => {
  securityModal.style.display = "none";
};

closeSecurity.onclick = window.closeSecurityModal;

updatePinBtn.onclick = async () => {
  const oldPin = currentPinInp.value.trim();
  const newPin = newPinInp.value.trim();

  if (oldPin.length !== 4 || newPin.length !== 4) {
    showToast("Error: 4-digit PIN required");
    return;
  }

  const prefix = currentUser.email === "jarvis@stark.local" ? "JARVIS_AUTH_SECURE_" : "FRIDAY_AUTH_SECURE_";
  const oldPass = prefix + oldPin;
  const newPass = prefix + newPin;

  updatePinBtn.disabled = true;
  updatePinBtn.textContent = "SYNCING...";

  try {
    // 1. Re-authenticate for security
    const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, oldPass);
    await currentUser.reauthenticateWithCredential(credential);

    // 2. Update password
    await currentUser.updatePassword(newPass);

    showToast("SECURITY CREDENTIALS SYNCED");
    window.closeSecurityModal();
  } catch (err) {
    showToast(`Access Denied: ${err.message}`);
  } finally {
    updatePinBtn.disabled = false;
    updatePinBtn.textContent = "UPDATE CREDENTIALS";
  }
};

// ─── Canvas Background Particles (HUD Data Stream) ────────────

function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
  
  window.addEventListener('resize', () => {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
  });

  // Get current theme primary color computed value
  const compStyles = getComputedStyle(document.documentElement);
  let cColor = compStyles.getPropertyValue('--primary').trim() || '#00d4ff';
  
  const particles = [];
  for(let i=0; i<40; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      s: Math.random() * 2 + 1,
      v: Math.random() * 0.5 + 0.2
    });
  }

  function animate() {
    ctx.clearRect(0,0, canvas.width, canvas.height);
    ctx.fillStyle = cColor;
    
    particles.forEach(p => {
      ctx.globalAlpha = Math.random() * 0.5 + 0.1;
      ctx.fillRect(p.x, p.y, p.s, Math.random() > 0.9 ? p.s*4 : p.s);
      p.y -= p.v;
      if(p.y < -10) {
        p.y = canvas.height + 10;
        p.x = Math.random() * canvas.width;
      }
    });
    requestAnimationFrame(animate);
  }
  animate();
}

// ─── Mission Alerts (Notifications) ───────────────────────────
function triggerMissionAlert(data) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  
  const sender = data.displayName || "AGENT";
  const isFriday = data.user === "friday@stark.local";

  const options = {
    body: isFriday ? "[ INTEL DETECTED ] Friday is transmitting secure data." : "New secure transmission detected. Decryption required.",
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%2300d4ff'><circle cx='50' cy='50' r='50'/><text x='25' y='65' font-size='40' fill='white'>HUD</text></svg>",
    badge: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%2300d4ff'><circle cx='50' cy='50' r='50'/></svg>",
    vibrate: [300, 100, 300],
    tag: isFriday ? "friday-intel" : "chat-msg",
    renotify: true
  };

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(`[ ALERT ] ${sender.toUpperCase()}`, options);
    });
  } else {
    new Notification(`[ ALERT ] ${sender.toUpperCase()}`, options);
  }
}

// ─── Voice Transmission Logic ────────────────────────────────

function updateChronoHUD() {
  // 1. Chrono (Actual Time)
  const now = new Date();
  if (chronoVal) chronoVal.textContent = now.toLocaleTimeString([], { hour12: false });
}

// ─── Helpers ──────────────────────────────────────────────────

function autoResizeTextarea() {
  messageInput.style.height = "auto";
  messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + "px";
}

function scrollToBottom() {
  chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
}

function toggleEmptyState(show) {
  emptyState.style.display = show ? "flex" : "none";
}

function formatTime(timestamp) {
  if (!timestamp) return "";
  const ms = (timestamp && timestamp.toMillis) ? timestamp.toMillis() : Number(timestamp);
  if (!ms) return "";
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(timestamp) {
  if (!timestamp) return "Today";
  const ms = (timestamp && timestamp.toMillis) ? timestamp.toMillis() : Number(timestamp);
  if (!ms) return "Today";
  const d   = new Date(ms);
  const now = new Date();

  const same = (a, b) =>
    a.getDate()    === b.getDate() &&
    a.getMonth()   === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  if (same(d, now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (same(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\n/g, "<br>");
}

// Specific escape for placing strings inside HTML attributes like onclick
function escapeTextAttr(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "\\'")
    .replace(/`/g, "\\`");
}

function showToast(message, duration = 3000) {
  const toast = document.createElement("div");
  toast.className   = "toast";
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = "opacity .3s";
    toast.style.opacity    = "0";
    setTimeout(() => toast.remove(), 350);
  }, duration);
}
