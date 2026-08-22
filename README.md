# Renovix 🏠✨

> **Renovix is an AI-powered 3D room renovation and spatial staging studio that transforms 2D photos into an interactive, parametric 3D digital twin.**

[![FastAPI](https://img.shields.io/badge/FastAPI-1.0.0-009688.svg?style=flat&logo=FastAPI&logoColor=white)](https://fastAPI.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?style=flat&logo=React&logoColor=black)](https://react.dev)
[![Three.js](https://img.shields.io/badge/Three.js-r185-000000.svg?style=flat&logo=three.js&logoColor=white)](https://threejs.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC.svg?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)

---

## 🌟 Key Features

* **Multi-View Photo Ingestion & Detection**: Upload up to 4 photos of any room (JPG, PNG, WebP).
* **AI Computer Vision Pipeline**:
  * **SAM 2 & Grounding DINO**: Zero-shot semantic segmentation and 2D bounding box detection.
  * **Spatial IoU & Visual NMS Deduplication**: Multi-image furniture deduplication prevents duplicate items across camera angles.
  * **LaMa Inpainting**: Reconstructs occluded walls and floor textures behind detected furniture.
  * **TripoSR & Procedural Catalog**: High-fidelity 3D mesh generation paired with curated parametric PBR templates.
  * **Multimodal Spatial Planner**: Vision LLM (Gemini / GPT-4o) or geometric fallbacks for real-world coordinate mapping and collision resolution.
* **Interactive 3D WebGL Studio**:
  * Real-time 3D orbit controls, panning, zoom, floor grid, and dimensional wall annotations.
  * Parametric room resizing (metric & imperial) with door placement configuration.
  * Object Inspector with live transform gizmos, wall alignment snappers, custom hex color picking, and PBR material swatches (Oak Wood, Walnut, Marble, Velvet, Brushed Metal, Leather, etc.).
* **Real-time Streaming**: Server-Sent Events (SSE) provide live progress and detection reviews as the AI processes the scene.

---

## 🏗️ Architecture Overview

```
Renovix Repository
├── backend/                  # FastAPI 1.0.0 Backend Engine
│   ├── app/
│   │   ├── api/              # REST & SSE streaming endpoints (/api/v1/rooms)
│   │   ├── core/             # Background job manager & SSE event bus
│   │   ├── pipeline/         # SAM2, Grounding DINO, LaMa, TripoSR, Spatial Planner
│   │   ├── storage/          # Local dynamic file storage
│   │   ├── config.py         # Dynamic configuration & environment settings
│   │   └── schemas.py        # Pydantic data contracts
│   ├── data/                 # Dynamic storage for uploads, masks, meshes & assets
│   ├── tests/                # Pipeline & deduplication test suites
│   ├── requirements.txt      # Python dependencies
│   └── main.py               # Renovix API entry point & OpenAPI metadata
│
└── frontend/                 # React 19 + Vite + Three.js Studio
    ├── src/
    │   ├── catalog/          # Procedural furniture library & PBR material presets
    │   ├── components/
    │   │   ├── canvas/       # Three.js / React Three Fiber 3D scene & meshes
    │   │   └── ui/           # Dimension panel, photo dropzone, status & inspector
    │   ├── hooks/            # SSE real-time stream hook
    │   ├── store/            # Zustand room and stage state management
    │   ├── types/            # Shared TypeScript data types
    │   └── App.tsx           # Renovix Studio layout
    ├── package.json          # renovix-frontend dependencies & scripts
    └── index.html            # Renovix Studio web entry point & OpenGraph metadata
```

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/renovix.git
cd renovix
```

---

### 2. Backend Setup

#### Prerequisites
* Python 3.10+ (Python 3.11 recommended)
* Virtual environment (`venv` or `conda`)

```bash
cd backend
python -m venv .venv

# Windows (PowerShell)
.\.venv\Scripts\Activate.ps1

# Linux / macOS
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### Configuration
Copy `.env.example` to `.env` and configure your API keys (optional):
```bash
cp .env.example .env
```

#### Run the Renovix API
```bash
python main.py
# Or with uvicorn directly:
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
API Documentation (Swagger UI): `http://localhost:8000/docs`

---

### 3. Frontend Setup

#### Prerequisites
* Node.js 18+ (Node.js 20+ recommended)
* npm / pnpm / yarn

```bash
cd frontend
npm install
npm run dev
```

The Renovix Studio will be available at `http://localhost:5173`.

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/rooms/generate` | Submit room dimensions and multi-photo upload to queue AI staging job. |
| `GET` | `/api/v1/rooms/{id}/stream` | SSE stream emitting live progress, stage transitions, and detections. |
| `GET` | `/api/v1/rooms/{id}/manifest` | Retrieve complete 3D scene manifest (furniture positions, dimensions, textures). |
| `GET` | `/api/v1/rooms/{id}/detections` | Retrieve detection review payload with thumbnails, bounding boxes, and confidences. |
| `GET` | `/health` | Server health check endpoint. |

---

## 🧪 Verification & Testing

### Frontend Type Check
```bash
cd frontend
npx tsc --noEmit
```

### Backend Test Suite
```bash
cd backend
python tests/test_fixes.py
python tests/test_multi_image_dedup.py
```

---

## 📄 License
MIT License. Built for modern spatial computing and AI interior design.
