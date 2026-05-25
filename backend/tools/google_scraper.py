import requests
from langchain_core.tools import tool
from core.config import settings


@tool
def google_scraper(query: str) -> dict:
    """Search Google Custom Search for research paper PDFs. Returns a list of papers with title and pdf_link."""
    try:
        search_query = f"{query} filetype:pdf"
        params = {
            "key": settings.GOOGLE_API_KEY,
            "cx": settings.GOOGLE_CSE_ID,
            "q": search_query,
            "num": 10,
        }
        response = requests.get(
            "https://www.googleapis.com/customsearch/v1", params=params, timeout=15
        )
        response.raise_for_status()
        items = response.json().get("items", [])

        papers = []
        for item in items:
            title = item.get("title", "")
            link = item.get("link", "")
            # Filter out lecture/presentation slides
            if any(kw in title.lower() for kw in ["lecture", "presentation", "slides", "tutorial"]):
                continue
            if link.endswith(".pdf") or "pdf" in link.lower():
                papers.append({"title": title, "pdf_link": link})

        if not papers:
            return {"status": "error", "message": "No PDF results found via Google Search", "data": []}

        return {"status": "success", "message": f"Found {len(papers)} papers", "data": papers}
    except Exception as e:
        return {"status": "error", "message": str(e), "data": []}
