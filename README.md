<p align="center">
  <img src="https://img.shields.io/badge/Gemini%20AI-v1.5-blue?style=for-the-badge&logo=google-gemini&logoColor=white" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" />
</p>

<p align="center">
  <b>&gt; Hey There!, I am <a href="https://github.com/Sanika-IMCA">Sanika Sadre</a></b>
</p>

<p align="center">
  [ AI-Powered Document Summary Assistant Project ]<br/>
  [ Direct text parsing, Optical Character Recognition, & context-grounded summaries ]
</p>

<p align="center">
  <img src="https://img.shields.io/badge/JAVASCRIPT-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/TYPESCRIPT-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/REACT-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/NODEJS-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/EXPRESS.JS-000000?style=for-the-badge&logo=express&logoColor=white" />
  <br/>
  <img src="https://img.shields.io/badge/PRISMA-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLITE-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/TAILWIND_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  <img src="https://img.shields.io/badge/GIT-F05032?style=for-the-badge&logo=git&logoColor=white" />
</p>

---

## 📖 About

The **Document Summary Assistant (Dr. Summary)** is a web application designed to simplify document reading and understanding. By combining local PDF text parsing and scanned image OCR (Tesseract.js) with Google's Gemini AI, it extracts text from raw files and converts it into custom-length summaries (Short, Medium, or Detailed), extracts core bullet points, and recommends improvements for document readability.

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

## 📖 Specifications

For an in-depth understanding of the system's architecture, functional rules, non-functional rules, and design details, please review the complete [Software Requirements Specification (SRS)](SRS.md).
