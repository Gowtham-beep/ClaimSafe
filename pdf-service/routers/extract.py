from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import structlog

from services.extractor import (
    extract_text_by_page,
    detect_is_scanned,
    chunk_document
)
from core.config import settings

logger = structlog.get_logger()
router = APIRouter()

class ChunkItem(BaseModel):
    chunk_index: int
    section_ref: Optional[str]
    page_start: int
    page_end: int
    text: str

class ExtractResponse(BaseModel):
    request_id: str
    page_count: int
    is_scanned: bool
    chunking_strategy: str
    chunks: List[ChunkItem]

@router.post("/extract", response_model=ExtractResponse)
async def extract_pdf(
    file: UploadFile = File(...),
    request_id: str = Form(...)
):
    log = logger.bind(request_id=request_id)
    
    # 1. Check content-type (400 if not PDF)
    if file.content_type != "application/pdf":
        log.warning("Invalid file type", content_type=file.content_type)
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    
    # Read the file content
    try:
        pdf_bytes = await file.read()
    except Exception as e:
        log.error("Failed to read file", error=str(e))
        raise HTTPException(status_code=400, detail="Failed to read uploaded file bytes.")
        
    # 2. Check maximum file size
    if len(pdf_bytes) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        log.warning("File size exceeds limit", size_bytes=len(pdf_bytes))
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB."
        )

    # 3. Check PDF magic bytes (400 if not %PDF)
    if not pdf_bytes.startswith(b"%PDF"):
        log.warning("Invalid PDF magic bytes")
        raise HTTPException(status_code=400, detail="Invalid PDF magic bytes. The file is not a valid PDF.")
        
    # 4. Extract pages (422 if 0 pages or pdfplumber raises on open)
    try:
        pages = extract_text_by_page(pdf_bytes, request_id=request_id)
    except ValueError as ve:
        log.warning("PDF has 0 pages", error=str(ve))
        raise HTTPException(status_code=422, detail="PDF has 0 pages.")
    except Exception as e:
        log.warning("pdfplumber failed to open PDF", error=str(e))
        raise HTTPException(status_code=422, detail=f"Failed to parse PDF: {str(e)}")
        
    if not pages or len(pages) == 0:
        log.warning("PDF has 0 pages")
        raise HTTPException(status_code=422, detail="PDF has 0 pages.")
        
    # 5. Process pages (500 for unexpected errors)
    try:
        is_scanned = detect_is_scanned(pages, request_id=request_id)
        strategy, chunks = chunk_document(pages, request_id=request_id)
        
        formatted_chunks = []
        for idx, chunk in enumerate(chunks):
            formatted_chunks.append({
                "chunk_index": idx,
                "section_ref": chunk["section_ref"],
                "page_start": chunk["page_start"],
                "page_end": chunk["page_end"],
                "text": chunk["text"]
            })
            
        return {
            "request_id": request_id,
            "page_count": len(pages),
            "is_scanned": is_scanned,
            "chunking_strategy": strategy,
            "chunks": formatted_chunks
        }
    except Exception as e:
        log.error("Unexpected error during PDF processing", error=str(e))
        raise HTTPException(status_code=500, detail=f"Unexpected server error during processing: {str(e)}")
