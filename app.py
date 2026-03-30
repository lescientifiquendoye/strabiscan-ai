import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from database import Base, engine
from routers import analysis, admin

# Create SQLite tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="StrabiScan AI", version="1.0.0", docs_url="/api/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis.router, prefix="/api")
app.include_router(admin.router, prefix="/api/admin")

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")


# SPA routes — serve HTML files for all frontend paths
@app.get("/")
async def root():
    return FileResponse("static/index.html")


@app.get("/admin/login")
async def admin_login():
    return FileResponse("static/admin/login.html")


@app.get("/admin/dashboard")
async def admin_dashboard():
    return FileResponse("static/admin/dashboard.html")


@app.get("/admin/validate")
async def admin_validate():
    return FileResponse("static/admin/validate.html")


@app.get("/admin")
async def admin_root():
    return FileResponse("static/admin/login.html")
