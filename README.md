# Document Summary Assistant (Dr. Summary) 

An intelligent, AI-powered web platform that extracts, analyzes, and summarizes textual content from both digital documents (PDFs) and scanned images (using Optical Character Recognition). 

The platform leverages Gemini AI to generate contextually accurate, structured summaries in multiple lengths (Short, Medium, and Detailed), extracts key points, and provides content improvement suggestions.

---

## 🚀 Key Features

- **Multi-Format Ingestion**: Supports uploading digital PDF files as well as standard images (`PNG`, `JPG`, `JPEG`).
- **Drag-and-Drop Interface**: Smooth, modern drag-and-drop file uploader with visual upload indicators.
- **Hybrid Text Extraction**:
  - Direct text parsing for digitally generated PDF files.
  - Optical Character Recognition (OCR) via **Tesseract.js** for scanned documents or images.
- **AI-Powered Summarization**: Three modes of summarization length tailored to user needs:
  - **Short**: Quick high-level overview.
  - **Medium**: Balanced overview highlighting key details.
  - **Detailed**: In-depth review preserving context and structure.
- **Intelligent Insights**:
  - Highlights key findings and conclusions.
  - Provides constructive suggestions for document improvements (readability, formatting, grammar).
- **Responsive Dashboard**: Elegant, light/dark theme responsive layout designed with modern Tailwind CSS.
- **Interactive Controls**: Options to copy summaries to the clipboard, download the full parsed report, or trigger text regeneration.

---

## 🛠️ Technology Stack

### Frontend
- **React** (v18) with **TypeScript**
- **Vite** (for fast build times and hot-module replacement)
- **Tailwind CSS** (for styling)
- **Lucide Icons** (for clean visual cues)
- **Axios** (for API communication)

### Backend
- **Node.js** with **Express** & **TypeScript**
- **Prisma ORM** with **SQLite** (lightweight local SQL database)
- **Gemini AI API** (`@google/generative-ai`) for advanced NLP capabilities
- **Tesseract.js** (for OCR text extraction from images)
- **pdf-parse** (for native PDF text extraction)
- **Multer** (for secure file upload handling)

---

## 🏗️ System Architecture

Below is the design diagram illustrating the interaction between the User, React Frontend, Node.js Backend, and processing layers (Document extraction and AI Engine):

![System Architecture Diagram](assets/architecture_diagram.png)

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

### 5. Database Setup
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

Make sure to replace `your_gemini_api_key_here` with a valid Gemini API Key from Google AI Studio.

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

For an in-depth understanding of the system's architecture, functional rules, non-functional rules, and design details, please review the complete [Software Requirements Specification (SRS)](file:///Users/sanikasadre/Downloads/SDoc-main/SDoc-main/SRS.md).
