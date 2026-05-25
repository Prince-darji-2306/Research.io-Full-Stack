import requests
from langchain_core.tools import tool


@tool
def web_scraper(query: str) -> dict:
    """Fallback web scraper using an external service to find research paper PDFs."""
    try:
        r = requests.get(
            "https://oscraper.onrender.com/search",
            params={"query": query, "max_results": 5},
            timeout=20,
        )
        r.raise_for_status()
        data = r.json()
        if not data:
            return {"status": "error", "message": "No results from fallback scraper", "data": []}
        return {"status": "success", "message": f"Found {len(data)} papers", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e), "data": []}
