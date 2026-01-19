from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
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


@app.get("/")
async def root():
    """Root endpoint - health check."""
    return {
        "message": "Chores Management App API",
        "version": "1.0.0",
        "status": "running"
    }


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
