<p align="center">
  <img src="https://img.shields.io/badge/Gemini%20AI-v1.5-blue?style=for-the-badge&logo=google-gemini&logoColor=white" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
</p>

<h1 align="center">📄 Dr. Summary (Document Summary Assistant)</h1>
<p align="center">
  <b>An intelligent AI-powered document ingestion, text extraction, and multi-length summarization platform.</b>
</p>

<p align="center">
  <a href="#-key-features">Key Features</a> •
  <a href="#-technology-stack">Technology Stack</a> •
  <a href="#-setup-and-installation">Setup & Installation</a> •
  <a href="#-system-architecture">System Architecture</a> •
  <a href="#-specifications">Documentation (SRS)</a>
</p>

---

## 🚀 Key Features

- **📂 Multi-Format Ingestion**: Supports uploading digital PDF files as well as standard images (`PNG`, `JPG`, `JPEG`).
- **🎛️ Drag-and-Drop Interface**: Smooth, modern drag-and-drop file uploader with visual upload indicators.
- **🔍 Hybrid Text Extraction**:
  - Direct text parsing for digitally generated PDF files.
  - Optical Character Recognition (OCR) via **Tesseract.js** for scanned documents or images.
- **⚡ AI-Powered Summarization**: Three modes of summarization length tailored to user needs:
  - **Short**: Quick 3-point high-level overview.
  - **Medium**: Balanced overview highlighting key details.
  - **Detailed**: In-depth review preserving context and structure.
- **💡 Intelligent Insights**:
  - Highlights key findings and conclusions.
  - Provides constructive suggestions for document improvements (readability, formatting, grammar).
- **🎨 Responsive Dashboard**: Elegant, light/dark theme responsive layout designed with Tailwind CSS.
- **📋 Interactive Controls**: Options to copy summaries to the clipboard, download the full parsed report, or trigger text regeneration.

---

## 🛠️ Technology Stack

<table>
  <tr>
    <td align="center" width="50%">
      <b>Frontend</b>
    </td>
    <td align="center" width="50%">
      <b>Backend</b>
    </td>
  </tr>
  <tr>
    <td>
      <ul>
        <li><b>React (v18)</b> with <b>TypeScript</b></li>
        <li><b>Vite</b> (fast build times & HMR)</li>
        <li><b>Tailwind CSS</b> (modern utility-first styling)</li>
        <li><b>Lucide React</b> (clean vector icons)</li>
        <li><b>Axios</b> (client-server requests)</li>
      </ul>
    </td>
    <td>
      <ul>
        <li><b>Node.js</b> & <b>Express.js</b> with <b>TypeScript</b></li>
        <li><b>Prisma ORM</b> with <b>SQLite</b> database</li>
        <li><b>Google Gemini AI SDK</b> (NLP pipeline)</li>
        <li><b>Tesseract.js</b> (OCR pipeline)</li>
        <li><b>pdf-parse</b> (digital PDF extraction)</li>
        <li><b>Multer</b> (file upload handling middleware)</li>
      </ul>
    </td>
  </tr>
</table>

---

## 🏗️ System Architecture

Below is the design diagram illustrating the interaction between the User, React Frontend, Node.js Backend, and processing layers (Document extraction and AI Engine):

<p align="center">
  <img src="assets/architecture_diagram.png" alt="System Architecture Diagram" width="90%" />
</p>

---

## 📁 Repository Structure

```text
├── backend/
│   ├── prisma/             # Database migrations and schema (SQLite)
│   ├── src/
│   │   ├── config/         # Server and DB configurations
│   │   ├── middleware/     # File upload handlers (Multer)
│   │   ├── routes/         # Express API endpoints
│   │   ├── services/       # OCR, AI (Gemini), Parser, and database services
│   │   └── index.ts        # Backend application entry point
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/     # UI components (Upload, ResultsView, ThemeToggle)
│   │   ├── App.tsx         # Main frontend wrapper and state manager
│   │   └── main.tsx        # React entry point
│   ├── index.html
│   ├── package.json
│   └── tailwind.config.js
│
├── SRS.md                  # Detailed Software Requirements Specification (SRS)
├── package.json            # Root configuration for concurrent run scripts
└── README.md               # You are here!
```

---

## ⚙️ Setup and Installation

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (comes packaged with Node.js)

### 2. Clone the Repository
```bash
git clone https://github.com/Sanika-IMCA/Dr.Summary.git
cd Dr.Summary
```

### 3. Install Dependencies
Install dependencies concurrently from the root directory:
```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

### 4. Database Setup
Set up the local SQLite database via Prisma Migrations in the backend folder:
```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
cd ..
```

---

## 🔒 Configuration

Create a `.env` file in the `backend/` directory:

```env
# backend/.env
PORT=5000
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY="your_gemini_api_key_here"
```

> [!IMPORTANT]
> Make sure to replace `your_gemini_api_key_here` with a valid Gemini API Key from Google AI Studio.

---

## 🏃 Running the Application

You can start both the frontend development server and the backend API server concurrently with a single command from the root directory:

```bash
npm run dev
```

- **Frontend**: Runs locally at `http://localhost:5173` (by default)
- **Backend API**: Runs locally at `http://localhost:5000`

---

## 🏗️ Building for Production

To build the entire application (both frontend and backend) for production:

```bash
npm run build
```

This runs:
- `npm run build` in `/backend` (compiles TypeScript to JavaScript in `/dist`)
- `npm run build` in `/frontend` (builds the optimized production assets in `/dist`)

---

## 📖 Specifications

For an in-depth understanding of the system's architecture, functional rules, non-functional rules, and design details, please review the complete [Software Requirements Specification (SRS)](SRS.md).
