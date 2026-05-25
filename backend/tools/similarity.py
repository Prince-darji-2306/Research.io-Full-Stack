import json
import numpy as np
from langchain_core.tools import tool
from sklearn.metrics.pairwise import cosine_similarity
from services.embeddings import embed_texts_sync


@tool
def select_relevant_papers(input_json: str) -> str:
    """
    Rank and select the most relevant papers from candidates.
    Input must be a JSON string: {"query": "...", "candidates": [{"title": "...", "pdf_link": "..."}, ...]}.
    Returns a JSON list of top papers with scores: [{"title": "...", "pdf": "...", "score": float}].
    """
    try:
        data = json.loads(input_json)
        query = data.get("query", "")
        candidates = data.get("candidates", [])

        if not candidates:
            return json.dumps({"status": "error", "message": "No candidates provided", "data": []})

        # Deduplicate
        seen = set()
        unique = []
        for c in candidates:
            key = (c.get("title", "").lower(), c.get("pdf_link", ""))
            if key not in seen:
                seen.add(key)
                unique.append(c)

        titles = [c.get("title", "") for c in unique]
        all_texts = [query] + titles
        embeddings = embed_texts_sync(all_texts)

        query_emb = np.array(embeddings[0]).reshape(1, -1)
        title_embs = np.array(embeddings[1:])
        scores = cosine_similarity(query_emb, title_embs)[0]

        max_score = float(scores.max())
        results = []

        if max_score >= 0.96:
            idx = int(scores.argmax())
            results.append({
                "title": unique[idx]["title"],
                "pdf": unique[idx].get("pdf_link", ""),
                "score": round(float(scores[idx]), 4),
            })
        else:
            ranked = sorted(
                [(i, float(s)) for i, s in enumerate(scores)],
                key=lambda x: x[1], reverse=True,
            )
            for idx, score in ranked:
                if score >= max_score - 0.1:
                    results.append({
                        "title": unique[idx]["title"],
                        "pdf": unique[idx].get("pdf_link", ""),
                        "score": round(score, 4),
                    })
                if len(results) >= 5:
                    break

        return json.dumps({"status": "success", "data": results})

    except Exception as e:
        return json.dumps({"status": "error", "message": str(e), "data": []})
