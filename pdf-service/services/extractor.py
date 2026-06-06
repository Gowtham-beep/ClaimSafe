import io
import pdfplumber
import structlog
from core.config import settings

logger = structlog.get_logger()

def extract_text_by_page(pdf_bytes: bytes, request_id: str = "") -> list[dict]:
    """
    Open PDF from bytes using pdfplumber.
    Return list of { page_number: int (1-indexed), text: str }.
    If a page raises on extract, log warning and return empty string for that page.
    """
    log = logger.bind(request_id=request_id)
    log.info("PDF open")
    pages = []
    
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        page_count = len(pdf.pages)
        log.info("page count", count=page_count)
        if page_count == 0:
            raise ValueError("PDF has 0 pages")
            
        for i, page in enumerate(pdf.pages):
            page_num = i + 1
            try:
                text = page.extract_text()
                if text is None:
                    text = ""
                pages.append({"page_number": page_num, "text": text})
            except Exception as e:
                log.warning("per-page extraction warning", page_number=page_num, error=str(e))
                pages.append({"page_number": page_num, "text": ""})
                
    return pages

def detect_is_scanned(pages: list[dict], request_id: str = "") -> bool:
    """
    Calculate average characters across all pages.
    Return True if average < SCANNED_THRESHOLD_CHARS.
    """
    log = logger.bind(request_id=request_id)
    if not pages:
        log.info("is_scanned result", is_scanned=True, avg_chars=0)
        return True
    total_chars = sum(len(page["text"]) for page in pages)
    avg_chars = total_chars / len(pages)
    is_scanned = avg_chars < settings.SCANNED_THRESHOLD_CHARS
    log.info("is_scanned result", is_scanned=is_scanned, avg_chars=avg_chars)
    return is_scanned

def detect_sections(pages: list[dict]) -> list[dict]:
    """
    Search each page's text for exact keywords (case-insensitive).
    A section starts at the page where the keyword is first found.
    Return list of { heading: str, page_number: int }.
    """
    keywords = [
        "Schedule of Benefits", "Exclusions", "Waiting Period",
        "General Conditions", "Terms and Conditions", "Sub-limits",
        "Co-payment", "What is Covered", "Claim Procedure"
    ]
    sections = []
    for kw in keywords:
        kw_lower = kw.lower()
        for page in pages:
            if kw_lower in page["text"].lower():
                sections.append({
                    "heading": kw,
                    "page_number": page["page_number"]
                })
                break  # A section starts at the page where the keyword is first found
    # Sort sections by page number
    sections.sort(key=lambda s: s["page_number"])
    return sections

def chunk_by_sections(pages: list[dict], sections: list[dict]) -> list[dict]:
    """
    Group pages between consecutive section boundaries.
    Each chunk: { section_ref, page_start, page_end, text (concatenated) }.
    Pages before first detected section go into a "preamble" chunk.
    """
    page_to_headings = {}
    for s in sections:
        p_num = s["page_number"]
        if p_num not in page_to_headings:
            page_to_headings[p_num] = []
        page_to_headings[p_num].append(s["heading"])
        
    unique_pages = sorted(page_to_headings.keys())
    chunks = []
    total_pages = len(pages)
    pages_by_num = {p["page_number"]: p["text"] for p in pages}
    
    # Preamble chunk
    if unique_pages[0] > 1:
        preamble_pages = list(range(1, unique_pages[0]))
        preamble_text = "\n".join(pages_by_num.get(p, "") for p in preamble_pages)
        chunks.append({
            "section_ref": "preamble",
            "page_start": 1,
            "page_end": unique_pages[0] - 1,
            "text": preamble_text
        })
        
    # Section chunks
    for idx, start_page in enumerate(unique_pages):
        end_page = unique_pages[idx + 1] - 1 if idx + 1 < len(unique_pages) else total_pages
        headings = page_to_headings[start_page]
        section_ref = ", ".join(headings)
        
        chunk_pages = list(range(start_page, end_page + 1))
        chunk_text = "\n".join(pages_by_num.get(p, "") for p in chunk_pages)
        
        chunks.append({
            "section_ref": section_ref,
            "page_start": start_page,
            "page_end": end_page,
            "text": chunk_text
        })
        
    return chunks

def chunk_by_window(
    pages: list[dict],
    window_tokens: int = settings.CHUNK_WINDOW_TOKENS,
    overlap_tokens: int = settings.CHUNK_OVERLAP_TOKENS
) -> list[dict]:
    """
    Slide a window across concatenated page text.
    Each chunk: { section_ref: None, page_start, page_end, text }.
    page_start/page_end reflect which pages the chunk text came from.
    """
    concatenated_text = ""
    page_ranges = []
    for i, page in enumerate(pages):
        p_num = page["page_number"]
        text = page["text"]
        if i > 0:
            concatenated_text += "\n"
        start_idx = len(concatenated_text)
        concatenated_text += text
        end_idx = len(concatenated_text)
        page_ranges.append((p_num, start_idx, end_idx))
        
    window_chars = window_tokens * 4
    overlap_chars = overlap_tokens * 4
    stride = window_chars - overlap_chars
    if stride <= 0:
        stride = window_chars
        
    start = 0
    chunks = []
    text_len = len(concatenated_text)
    
    if text_len == 0:
        return [{
            "section_ref": None,
            "page_start": 1,
            "page_end": 1,
            "text": ""
        }]
        
    def get_pages_for_range(start: int, end: int) -> tuple[int, int]:
        overlapping_pages = []
        for p_num, p_start, p_end in page_ranges:
            if (p_start < end and p_end > start) or (p_start == p_end and start <= p_start <= end):
                overlapping_pages.append(p_num)
        if not overlapping_pages:
            return 1, 1
        return min(overlapping_pages), max(overlapping_pages)
        
    while True:
        end = min(start + window_chars, text_len)
        chunk_text = concatenated_text[start:end]
        page_start, page_end = get_pages_for_range(start, end)
        
        chunks.append({
            "section_ref": None,
            "page_start": page_start,
            "page_end": page_end,
            "text": chunk_text
        })
        
        if end >= text_len:
            break
            
        start += stride
        
    return chunks

def chunk_document(pages: list[dict], request_id: str = "") -> tuple[str, list[dict]]:
    """
    Call detect_sections.
    If len(sections) >= 2: use chunk_by_sections, strategy = "section_aware"
    Else: use chunk_by_window, strategy = "overlapping_window"
    Return (strategy, chunks)
    """
    log = logger.bind(request_id=request_id)
    sections = detect_sections(pages)
    
    if len(sections) >= 2:
        strategy = "section_aware"
        chunks = chunk_by_sections(pages, sections)
    else:
        strategy = "overlapping_window"
        chunks = chunk_by_window(pages)
        
    log.info("chunking strategy chosen", strategy=strategy)
    log.info("chunk count", count=len(chunks))
    return strategy, chunks
