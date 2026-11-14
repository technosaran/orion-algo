# Orion Algo - FastAPI Backend

FastAPI backend service for the Orion Algo platform.

## Setup & Running

### 1. Activate Virtual Environment
On Windows (PowerShell):
```powershell
.\.venv\Scripts\Activate.ps1
```

### 2. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 3. Run Development Server
```powershell
uvicorn app.main:app --reload --port 8000
```

- API Base: `http://localhost:8000`
- Interactive API Docs (Swagger): `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/api/v1/health`
