import requests
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from langchain_core.tools import tool


def _get_semantic_scholar(query: str) -> list[dict]:
    try:
        params = {
            "query": query,
            "limit": 8,
            "fields": "title,openAccessPdf",
        }
        r = requests.get(
            "https://api.semanticscholar.org/graph/v1/paper/search",
            params=params, timeout=15,
        )
        r.raise_for_status()
        papers = []
        for p in r.json().get("data", []):
            pdf = p.get("openAccessPdf")
            if pdf and pdf.get("url"):
                papers.append({"title": p["title"], "pdf_link": pdf["url"]})
        return papers
    except Exception:
        return []


def _get_arxiv(query: str) -> list[dict]:
    try:
        params = {"search_query": f"all:{query}", "start": 0, "max_results": 8}
        r = requests.get("http://export.arxiv.org/api/query", params=params, timeout=15)
        r.raise_for_status()
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        root = ET.fromstring(r.text)
        papers = []
        for entry in root.findall("atom:entry", ns):
            title = entry.find("atom:title", ns)
            title = title.text.strip().replace("\n", " ") if title is not None else ""
            pdf_link = ""
            for link in entry.findall("atom:link", ns):
                if link.get("type") == "application/pdf":
                    pdf_link = link.get("href", "")
                    break
                if link.get("title") == "pdf":
                    pdf_link = link.get("href", "").replace("/abs/", "/pdf/")
                    break
            if title and pdf_link:
                papers.append({"title": title, "pdf_link": pdf_link})
        return papers
    except Exception:
        return []


def _get_springer(query: str) -> list[dict]:
    try:
        url = f"https://link.springer.com/search?query={requests.utils.quote(query)}&openAccess=true"
        headers = {"User-Agent": "Mozilla/5.0"}
        r = requests.get(url, headers=headers, timeout=15)
        r.raise_for_status()
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(r.text, "html.parser")
        papers = []
        for card in soup.select("h2.c-card__title a")[:8]:
            title = card.get_text(strip=True)
            href = card.get("href", "")
            if href:
                pdf_link = f"https://link.springer.com{href}" if href.startswith("/") else href
                # Convert article URL to PDF
                pdf_link = pdf_link.replace("/article/", "/content/pdf/").rstrip("/") + ".pdf"
                papers.append({"title": title, "pdf_link": pdf_link})
        return papers
    except Exception:
        return []


@tool
def open_access_scraper(query: str) -> dict:
    """Search multiple open-access databases (arXiv, Semantic Scholar, Springer) for research paper PDFs in parallel."""
    scrapers = [_get_semantic_scholar, _get_arxiv, _get_springer]
    all_papers: list[dict] = []

    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {executor.submit(fn, query): fn.__name__ for fn in scrapers}
        for future in as_completed(futures):
            try:
                all_papers.extend(future.result())
            except Exception:
                pass

    if not all_papers:
        return {"status": "error", "message": "No open-access papers found", "data": []}

    return {"status": "success", "message": f"Found {len(all_papers)} papers", "data": all_papers}
