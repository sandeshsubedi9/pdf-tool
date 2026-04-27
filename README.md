# PDF Maya

PDF Maya is a comprehensive, full-stack PDF management and editing toolkit. It provides a robust suite of tools to manipulate, convert, secure, and edit PDF documents directly from the browser. 

Built with a high-performance Next.js frontend and a powerful Python-based backend service, PDF Maya is designed to handle complex document workflows efficiently and securely.

## 🌟 Key Features

### Edit & Organize
- **PDF Editor:** Add text, images, drawings, and highlights to existing PDFs.
- **Merge & Split:** Combine multiple PDFs or extract specific pages.
- **Organize & Remove:** Reorder pages or delete unwanted pages.
- **Crop & Rotate:** Adjust page dimensions and orientation.
- **Page Numbers & Watermarks:** Brand and organize your documents.

### Convert (To & From PDF)
- **Document Conversion:** Word, Excel, PPTX, and HTML to PDF (and vice versa).
- **Image Conversion:** JPG to PDF and PDF to JPG/Images.
- **eBook & Text:** PDF to EPUB and PDF to TXT.

### Security & Advanced Tools
- **Redact PDF:** Securely blackout sensitive information.
- **Protect & Unlock:** Add or remove password encryption.
- **Sign PDF:** Add digital signatures to your documents.
- **OCR PDF:** Make scanned documents text-searchable.
- **Translate PDF:** Translate document text while preserving layout.
- **Compare & Repair:** Highlight differences between versions and fix corrupted files.

## 🏗️ Architecture & Tech Stack

The application is split into two main services:

1. **Frontend (Next.js)**
   - Framework: Next.js (App Router)
   - Language: TypeScript
   - Styling: Tailwind CSS
   - Core PDF Libs: `pdf.js` (rendering), `pdf-lib` (client-side manipulation)
   - UI Animations: Framer Motion

2. **Backend (Python Service)**
   - Framework: FastAPI 
   - Core Engines: LibreOffice (for Office conversions), PyMuPDF (for PDF processing), OCR Engines.
   - Containerization: Docker

## 📁 Folder Structure

*(Note: High-level folder structures are standard practice in software documentation and are not considered a security risk. They help developers understand the architecture without exposing sensitive logic or keys).*

```text
pdf-editor/
├── app/                  # Next.js App Router (Frontend Pages & API Routes)
│   ├── api/              # API Routes (Rate limiting, session management)
│   ├── merge-pdf/        # Tool: Merge PDFs
│   ├── redact-pdf/       # Tool: Redact PDFs
│   └── ...               # (Other PDF tool directories)
├── components/           # Reusable React UI Components (Navbar, ToolLayout, PdfEditor)
├── data/                 # Static data (e.g., Blog JSON content)
├── lib/                  # Utility functions (Mail, Fingerprinting, Rate limits)
├── python-service/       # Python Backend Service
│   ├── services/         # Specific Python processors (e.g., epub_service.py)
│   ├── main.py           # Python service entry point
│   └── Dockerfile        # Docker configuration for the Python backend
├── public/               # Static assets (images, icons)
└── README.md             # Project documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Docker (for the Python backend)

### 1. Start the Python Backend Service
The backend service handles heavy computing tasks like Office-to-PDF conversions and OCR.
```bash
cd python-service

# Build the docker container
docker build -t pdf-maya-python .

# Run the container on port 8000
docker run -p 8000:8000 pdf-maya-python
```
*(Alternatively, run it locally without Docker using `start.bat` if your Windows environment is configured).*

### 2. Start the Next.js Frontend
Open a new terminal at the root of the project (`pdf-editor/`):
```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```
The application will be available at [http://localhost:3000](http://localhost:3000).

## 🐳 Deployment

PDF Maya is containerized and optimized for modern deployment platforms (like Coolify, Vercel, or standalone Docker VPS). 
- The Next.js frontend builds a highly optimized production bundle using `npm run build`.
- The `python-service/Dockerfile` ensures all heavy system dependencies (like LibreOffice and GCC) are installed natively for the backend to function securely in isolation.

## 📄 License & Legal
All rights reserved. 
*(Ensure your `.env` files are added to `.gitignore` and never committed to public repositories).*
