import structlog
from fastapi import FastAPI
from routers.extract import router as extract_router

# Setup structlog for structured JSON logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_log_level,
        structlog.processors.JSONRenderer()
    ]
)

logger = structlog.get_logger()

app = FastAPI(
    title="ClaimSafe PDF Extraction Service",
    description="Python microservice for processing and extracting text/tables from insurance policy PDFs."
)

# Include the extract routes router
app.include_router(extract_router)

@app.on_event("startup")
async def startup_event():
    # Startup log message as specified in instructions
    logger.info("PDF service ready")

@app.get("/health")
async def health():
    # Health check endpoint returning {"status": "ok"}
    return {"status": "ok"}
