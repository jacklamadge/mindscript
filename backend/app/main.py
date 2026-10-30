from fastapi import FastAPI , HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.db import engine, Base
from app.db_migrate import ensure_schema
from app.api.auth import router as auth_router
from app.api.prompt import router as prompt_router
from app.api.library import router as library_router
from app.api.admin import router as admin_router
from app.api.feedback import router as feedback_router
from app.api.community import router as community_router

Base.metadata.create_all(bind=engine)
ensure_schema()

app = FastAPI(title="MindScript API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
from starlette.middleware.base import BaseHTTPMiddleware

class CacheHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        path = request.url.path
        # HTML всегда свежий; JS/CSS/картинки кэшируем — иначе Mini App каждый раз тянет всё с нуля
        if path == "/" or path.endswith(".html"):
            response.headers["Cache-Control"] = "no-cache, must-revalidate"
        elif path.endswith((".js", ".css", ".jpg", ".jpeg", ".png", ".webp", ".svg", ".woff2")):
            response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=600"
        return response

app.add_middleware(CacheHeadersMiddleware)
# Роутеры API (ДО статики!)
app.include_router(auth_router)
app.include_router(prompt_router)
app.include_router(library_router)
app.include_router(admin_router)
app.include_router(feedback_router)
app.include_router(community_router)

from fastapi.responses import FileResponse

FRONTEND = Path(__file__).resolve().parents[2] / "frontend"

# HTML-страницы — явные маршруты
@app.api_route("/", methods=["GET", "HEAD"])
def _serve_index():
    return FileResponse(FRONTEND / "index.html")

@app.get("/profile.html")
def _serve_profile():
    return FileResponse(FRONTEND / "profile.html")

@app.get("/admin.html")
def _serve_admin():
    return FileResponse(FRONTEND / "admin.html")

@app.get("/community.html")
def _serve_community():
    return FileResponse(FRONTEND / "community.html")

@app.get("/quiz.html")
def _serve_quiz():
    return FileResponse(FRONTEND / "quiz.html")

@app.get("/process.html")
def _serve_process():
    return FileResponse(FRONTEND / "process.html")

@app.get("/answer.html")
def _serve_answer():
    return FileResponse(FRONTEND / "answer.html")

@app.get("/library.html")
def _serve_library():
    return FileResponse(FRONTEND / "library.html")

# Статика (JS, CSS, картинки) — в самом конце!
@app.get("/{filename:path}")
async def _serve_static(filename: str):
    file_path = FRONTEND / filename
    if file_path.is_file():
        return FileResponse(file_path)
    raise HTTPException(404)