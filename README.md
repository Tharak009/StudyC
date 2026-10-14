# StudyConnect

StudyConnect is a collaborative learning and academic networking platform designed for college campuses. It brings together academic communities, real-time messaging, resource sharing, 1:1 voice/video calls, and collaborative study meetings with waiting room admission, screen sharing, and persistent meeting chat.

---

## 1. System Requirements & Prerequisites (Windows)

Before cloning and running StudyConnect on Windows, ensure the following tools are installed:

1. **Node.js (LTS v20.x or v22.x)**:
   - Download the Windows Installer (.msi) from [nodejs.org](https://nodejs.org/).
   - During installation, ensure the option to **Add to PATH** is checked.
   - Verify in PowerShell:
     ```powershell
     node -v
     npm -v
     ```
2. **Git for Windows**:
   - Download from [git-scm.com](https://git-scm.com/).
   - Verify in PowerShell:
     ```powershell
     git --version
     ```
3. **MongoDB**:
   - **Option A (Local)**: Install [MongoDB Community Server](https://www.mongodb.com/try/download/community) and optionally [MongoDB Compass](https://www.mongodb.com/products/tools/compass) GUI.
     Ensure the MongoDB service is running (default port: `27017`).
   - **Option B (Cloud)**: Create a free M0 cluster on [MongoDB Atlas](https://www.mongodb.com/atlas) and get your connection string (`mongodb+srv://...`).

---

## 2. Quick Start Guide for Windows

### Step 1: Clone the Repository

Open PowerShell or Command Prompt in your preferred projects directory:

```powershell
git clone https://github.com/Tharak009/StudyC.git
cd StudyC
```

### Step 2: Install Dependencies

StudyConnect is structured as an npm workspace. Installing dependencies from the root directory installs packages for the root, backend, and frontend:

```powershell
npm install
```

### Step 3: Configure Environment Variables

Create `.env` files for both the backend and frontend from their templates:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item web\.env.example web\.env
```

Now open each file in your code editor:

#### A. Backend Configuration (`backend/.env`)
- `MONGODB_URI`: Point to your local database (`mongodb://127.0.0.1:27017/studyconnect`) or Atlas cluster.
- `APPROVED_EMAIL_DOMAINS`: Lower-case college email domains allowed to register (default: `campus.edu,college.edu,students.college.edu`). Any user registering must have an email ending with one of these domains (e.g., `student@college.edu`).
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`: Keep defaults for local development or set random strings.
- `STREAM_API_KEY` & `STREAM_API_SECRET`: Required for chat messaging and meeting chat (see [External Services](#3-external-services-configuration)).
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`: Required for 1:1 voice/video calls and Study Meetings (see [External Services](#3-external-services-configuration)).

#### B. Frontend Configuration (`web/.env`)
- `VITE_STREAM_API_KEY`: Must match `STREAM_API_KEY` from `backend/.env`.
- `VITE_API_URL` & `VITE_SOCKET_URL`: **Leave empty for local development.** The Vite development server automatically proxies `/api`, `/uploads`, and `/socket.io` to `http://localhost:5000`.

---

## 3. External Services Configuration

StudyConnect uses cloud services for real-time media and messaging. Free developer tiers are available for both:

### A. Stream Chat (Messaging & Meeting Text Chat)
1. Sign up for a free account at [getstream.io](https://getstream.io/).
2. Create an App in the dashboard (select **Chat Messaging**).
3. Copy the **Key** and **Secret**:
   - Set `STREAM_API_KEY=<Key>` and `STREAM_API_SECRET=<Secret>` in `backend/.env`.
   - Set `VITE_STREAM_API_KEY=<Key>` in `web/.env`.

### B. LiveKit Cloud (1:1 Calls & Group Study Meetings)
1. Sign up for a free account at [cloud.livekit.io](https://cloud.livekit.io/).
2. Create a project.
3. In Project Settings → Keys, generate an API Key.
4. Copy the credentials:
   - `LIVEKIT_URL`: Your WebSocket URL (e.g., `wss://your-project.livekit.cloud`).
   - `LIVEKIT_API_URL`: Your HTTPS API URL (e.g., `https://your-project.livekit.cloud`).
   - `LIVEKIT_API_KEY`: Your project API key.
   - `LIVEKIT_API_SECRET`: Your project API secret.
5. Place these values into `backend/.env`.

> **Note:** If LiveKit or Stream credentials are omitted, general platform features (authentication, profiles, academic resources, community browsing) will still work. However, attempting to join calls or open chat channels will return an informative `503 Service Unavailable` error until the respective provider is configured.

---

## 4. Database Seeding (Optional)

To populate sample campus users, academic communities, and shared resources for quick testing, run the seeder:

```powershell
npm run seed
```

This creates verified accounts you can use immediately:
- **Admin**: `admin@college.edu` / `Admin@2026!`
- **Faculty**: `dr.smith@college.edu` / `Faculty@2026!`
- **Students**: `alex.kumar@college.edu` / `Student@2026!`

---

## 5. Running the Application

### Option 1: Run Both Apps Together (Recommended)

From the project root:

```powershell
npm run dev
```

This concurrently launches:
- **Backend API**: `http://localhost:5000`
- **Frontend Web UI**: `http://localhost:5173`

### Option 2: Run in Separate PowerShell Terminals

If you prefer dedicated console output for each process:

- **Terminal 1 (Backend)**:
  ```powershell
  npm run dev -w backend
  ```
- **Terminal 2 (Frontend)**:
  ```powershell
  npm run dev -w web
  ```

Open your browser and navigate to **`http://localhost:5173`**.

Health check endpoint: **`http://localhost:5000/health`**.

---

## 6. Environment Variables Reference

| Variable | Scope | Required | Purpose |
|---|---|---|---|
| `PORT` | Backend | Optional (Default: 5000) | Local HTTP port for Express |
| `MONGODB_URI` | Backend | **Required** | Connection string for MongoDB |
| `CLIENT_URL` | Backend | Optional (Default: `http://localhost:5173`) | CORS allowed origin |
| `APPROVED_EMAIL_DOMAINS` | Backend | **Required** | Allowlist of student email domains |
| `JWT_ACCESS_SECRET` | Backend | **Required** | Signs short-lived access JWTs |
| `JWT_REFRESH_SECRET` | Backend | **Required** | Signs persistent refresh JWTs |
| `STREAM_API_KEY` | Backend | **Required for Chat** | Stream Chat application key |
| `STREAM_API_SECRET` | Backend | **Required for Chat** | Stream Chat server-side signing secret |
| `LIVEKIT_URL` | Backend | **Required for Calls/Meetings** | LiveKit SFU WebSocket gateway (`wss://...`) |
| `LIVEKIT_API_KEY` | Backend | **Required for Calls/Meetings** | LiveKit credentials generator key |
| `LIVEKIT_API_SECRET` | Backend | **Required for Calls/Meetings** | LiveKit token signing secret |
| `LIVEKIT_TOKEN_TTL_SECONDS` | Backend | Optional (Default: 3600) | Lifetime of media room tokens |
| `STORAGE_MODE` | Backend | Optional (Default: `LOCAL`) | `LOCAL` saves to disk; `CLOUD` uses S3/B2 |
| `VITE_STREAM_API_KEY` | Frontend | **Required for Chat** | Stream Chat public key (must match backend) |
| `VITE_API_URL` | Frontend | Optional | Custom backend URL (leave blank in dev) |
| `VITE_SOCKET_URL` | Frontend | Optional | Custom socket URL (leave blank in dev) |

---

## 7. Troubleshooting Common Windows Issues

### 1. PowerShell Script Execution Disabled
**Symptom**: `File ... cannot be loaded because running scripts is disabled on this system.`
**Solution**: Open PowerShell as Administrator or run in your user scope:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### 2. MongoDB Connection Refused (`ECONNREFUSED 127.0.0.1:27017`)
**Symptom**: Backend crashes on startup with `MongoServerSelectionError`.
**Solution**:
- Ensure the MongoDB Windows service is running:
  ```powershell
  Get-Service -Name MongoDB
  Start-Service -Name MongoDB
  ```
- If using MongoDB Atlas, check that your IP address is whitelisted in Atlas Network Access (`0.0.0.0/0` for development).

### 3. Registration Error: "Email domain not approved"
**Symptom**: Attempting to register an account returns a `403 Forbidden` error.
**Solution**: Registration is restricted to verified campus emails. Ensure your email domain matches one of the entries in `APPROVED_EMAIL_DOMAINS` in `backend/.env` (e.g., `user@college.edu`).

### 4. Port Conflict (`EADDRINUSE: address already in use :::5000`)
**Symptom**: Backend fails to bind to port 5000.
**Solution**: Identify and terminate the process holding the port:
```powershell
netstat -ano | findstr :5000
Stop-Process -Id <PID> -Force
```
Alternatively, change `PORT=5001` in `backend/.env`.

### 5. Media Devices / Camera Permissions in Browser
**Symptom**: Camera or microphone is blocked or not detected in Meetings.
**Solution**:
- Modern browsers require HTTPS or `localhost` to access camera/microphone APIs. When testing locally, always access via `http://localhost:5173` (not raw IP addresses).
- Check browser site settings to grant Camera and Microphone access.

---

## 8. Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Runs backend API and frontend Vite dev server concurrently |
| `npm run dev -w backend` | Runs only backend with hot reload (`tsx watch`) |
| `npm run dev -w web` | Runs only frontend Vite dev server |
| `npm run build` | Compiles backend TypeScript and builds frontend production assets |
| `npm run seed` | Seeds database with initial campus roles, communities, and resources |
| `npm run test` | Runs unit and integration test suites |
| `npm run lint` | Lints entire codebase with ESLint |
