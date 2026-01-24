from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from .config import get_settings

settings = get_settings()

# Create FastAPI application
app = FastAPI(
    title="Chores Management App",
    description="A weekly chores management system for families and housemates",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this appropriately in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files and templates
app.mount("/static", StaticFiles(directory="frontend/static"), name="static")
templates = Jinja2Templates(directory="frontend/templates")

# Import and include routers
from .routers import users, chores, completions, admin

app.include_router(users.router)
app.include_router(chores.router)
app.include_router(completions.router)
app.include_router(admin.router)


@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    """Serve the main page."""
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    """Serve the login page."""
    return templates.TemplateResponse("login.html", {"request": request})


@app.get("/weekly", response_class=HTMLResponse)
async def weekly_page(request: Request):
    """Serve the weekly chores page."""
    return templates.TemplateResponse("weekly.html", {"request": request})


@app.get("/admin-console", response_class=HTMLResponse)
async def admin_page(request: Request):
    """Serve the admin console page."""
    return templates.TemplateResponse("admin.html", {"request": request})


@app.get("/history", response_class=HTMLResponse)
async def history_page(request: Request):
    """Serve the chore completion history page."""
    return templates.TemplateResponse("history.html", {"request": request})


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=True
    )
