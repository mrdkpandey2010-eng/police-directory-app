# 🚔 Police Department Directory & Caller Web App
### (पुलिस विभाग संपर्क एवं कॉलर वेब एप्लिकेशन)

A secure, role-based departmental contact directory, caller portal, and communication app built with **React 19**, **Vite**, and **Tailwind-inspired styling**.

---

## 🌟 Key Features

- 🔐 **Role-Based Authentication & Gateway**:
  - **Super Admin**: Master oversight across all districts, manage Co-Admins, approval workflow, bulk Excel management, and master configurations.
  - **District Co-Admin**: Delegated authority scoped strictly to their jurisdiction (e.g., Lucknow, Kanpur Nagar).
  - **Police Personnel (User)**: Verified personnel lookup, direct 1-on-1 and group messaging, profile update requests.
- ⚡ **1-Click Demo Evaluation**: Instant login shortcuts built into the login portal to test all user roles with one click.
- 🔍 **Real-Time Directory Search & Filters**: Search across Officer Name, PNO Number, Police Station / Thana, Designation / Rank, and Mobile number.
- 💬 **Departmental Messaging & Chat**: Real-time direct chat, team broadcast channels, file dispatch simulation, and supervisor alerts.
- 📊 **Bulk Excel Import & Export**: Fast export of directory data and import via `.xlsx` spreadsheets with SheetJS.
- ⚙️ **Master Data Management**: Dynamic configuration of Districts, Police Stations, and Designations.

---

## 🚀 Live Deployment to GitHub Pages (Automated via GitHub Actions)

This repository includes a ready-to-run GitHub Actions workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

### Steps to Deploy to GitHub:

1. **Initialize Git and Commit**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Police Department Directory App"
   ```

2. **Add Your GitHub Remote**:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPOSITORY-NAME>.git
   git push -u origin main
   ```

3. **Enable GitHub Pages**:
   - Go to your repository on GitHub: **Settings** &rarr; **Pages**.
   - Under **Build and deployment** &rarr; **Source**, select **GitHub Actions**.
   - The workflow will automatically trigger, build the application, and publish it live!

---

## 🌐 Deploy to Vercel or Netlify (Alternative)

### Deploy to Vercel:
1. Push your repository to GitHub.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Framework Preset will auto-detect **Vite**.
5. Click **Deploy**.

### Deploy to Netlify:
1. Go to [netlify.com](https://netlify.com) and click **"Add new site" &rarr; "Import an existing project"**.
2. Select your GitHub repository.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Click **Deploy**.

---

## 💻 Local Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

3. **Production build**:
   ```bash
   npm run build
   ```
   Static deployable assets will be bundled into the `dist/` directory.

4. **Preview production build locally**:
   ```bash
   npm run preview
   ```

---

## 🔑 Demo Credentials

Default PIN/Password for demo accounts is **`1234`**.

| Role | Identifier / PIN | District | Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | PIN: `1234` | All Districts | Full Administrative Control |
| **Co-Admin (Lucknow)** | Select *लखनऊ* (PIN: `1234`) | Lucknow | Manage Lucknow Personnel & Approvals |
| **Co-Admin (Kanpur)** | Select *कानपुर नगर* (PIN: `1234`) | Kanpur Nagar | Manage Kanpur Personnel & Approvals |
| **Officer User** | PNO: `PNO-012849103` (PIN: `1234`) | Lucknow | Search Directory, Chat, Update Profile |
