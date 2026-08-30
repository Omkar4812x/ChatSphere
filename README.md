# 💬 ChatSphere // Cyberpunk Real-Time Comm Hub

> **Futuristic real-time messaging PWA with client-side AES-256 encryption, self-destructing transmissions, Firebase backend, and cyberpunk HUD interface.**

---

## ✨ Key Features

- ⚡ **Real-Time Encrypted Messaging**
  - Powered by Firebase Firestore for instantaneous message broadcasting.
  - **AES-256 Client-Side Encryption**: Encrypts messages before transmission using CryptoJS so data remains secure.

- 🔥 **Burn After Reading (Self-Destruct)**
  - Toggle self-destruct mode for sensitive transmissions that auto-delete upon viewing.

- 👥 **Active Agents Directory & Status**
  - Live sidebar displaying online agents, active status badges, and user session metrics.

- 📎 **File Attachments & Media Sharing**
  - Firebase Storage integration for image uploads, documents, and media sharing.

- 😃 **Emoji Reactions & Thread Replies**
  - Floating emoji reaction picker and message reply preview thread bar.

- 🎨 **Cyberpunk HUD Interface & Themes**
  - Sci-fi HUD aesthetic featuring animated canvas background particles, glitch typography, audio alerts, and theme switcher.

- 🛡️ **System Oversight Admin Panel**
  - Dedicated admin dashboard (`admin.html`) for monitoring channel activity, user management, and security audit logs.

- 📱 **Progressive Web App (PWA)**
  - Service Worker (`sw.js`) and Web Manifest (`manifest.json`) for installability and offline support.

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3 (CSS Variables, Flexbox/Grid)
- **Backend & Auth**: Firebase Auth, Cloud Firestore, Firebase Storage
- **Encryption**: CryptoJS (AES-256)
- **PWA**: Service Worker API, Web App Manifest
- **Audio & Particles**: Web Audio API, HTML5 Canvas Particle Engine

---

## 🚀 Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Omkar4812x/ChatSphere.git
   cd ChatSphere
   ```

2. **Configure Firebase**:
   Update `app.js` with your Firebase web configuration:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

3. **Launch Application**:
   Open `index.html` or `login.html` in any modern web browser or serve via Live Server.

---

## 📄 License

Distributed under the MIT License.
