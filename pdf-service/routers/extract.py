from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, List, Any
from services.extractor import extract_text_and_tables

router = APIRouter()

class ExtractRequest(BaseModel):
    pdf_path: str

class TableItem(BaseModel):
    page: int
    data: List[List[str]]

class ExtractResponse(BaseModel):
    text_by_section: Dict[str, str]
    tables: List[TableItem]
    total_pages: int
    chunking_strategy_used: str
    is_scanned: bool

@router.post("/extract", response_model=ExtractResponse)
async def extract_pdf(payload: ExtractRequest):
    # Delegate to extractor service
    result = extract_text_and_tables(payload.pdf_path)
    return result
