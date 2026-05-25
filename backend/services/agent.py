"""
Custom tool-calling agent loop — yields events as dicts (no WebSocket).
Caller wraps these into SSE format.
"""
import json
from collections.abc import AsyncGenerator
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage, AIMessage
from services.llm import get_search_llm
from tools.google_scraper import google_scraper
from tools.open_access import open_access_scraper
from tools.web_scraper import web_scraper
from tools.similarity import select_relevant_papers

from langchain_core.tools import tool

@tool
def final_response(recommended: dict, others: list[dict]):
    """Call this tool to provide the final search results to the user. 
    recommended: {"title": "...", "pdf_link": "..."}
    others: [{"title": "...", "pdf_link": "..."}, ...]
    """
    return json.dumps({"recommended": recommended, "others": others})

TOOLS = [google_scraper, open_access_scraper, web_scraper, select_relevant_papers, final_response]
TOOL_MAP = {t.name: t for t in TOOLS}

TOOL_LABELS = {
    "open_access_scraper": "Open Access Search (arXiv · Semantic Scholar · Springer)",
    "google_scraper":      "Google Scholar Search",
    "web_scraper":         "Fallback Web Scraper",
    "select_relevant_papers": "Ranking by Relevance",
    "final_response": "Finalizing Results",
}

AGENT_SYSTEM_PROMPT = """You are an elite research paper search agent. Your goal is to find high-quality research papers for the user.

Available tools:
- open_access_scraper: Search arXiv, Semantic Scholar, Springer (Highly recommended for academic papers).
- google_scraper: Search Google Scholar for PDFs.
- web_scraper: General purpose web search fallback.
- select_relevant_papers: Ranks and scores the candidates you've found. ALWAYS call this after you have a list of papers.
- final_response: Submit your final answer. You MUST use this tool to end the search.

Workflow:
1. Search: Call one or more scrapers to find candidates.
2. Rank: Call select_relevant_papers with your list of candidates to get relevance scores.
3. Finalize: Call final_response with the 'recommended' (top scored) paper and 'others' (the rest).

IMPORTANT:
- If you find no papers after searching all sources, still call final_response with empty values.
- Ensure 'recommended' is a single dictionary and 'others' is a list of dictionaries.
"""


async def run_search_agent(query: str) -> AsyncGenerator[dict, None]:
    llm = get_search_llm()
    llm_with_tools = llm.bind_tools(TOOLS)

    messages = [
        SystemMessage(content=AGENT_SYSTEM_PROMPT),
        HumanMessage(content=f"Find the best research paper for: {query}"),
    ]

    all_candidates: list[dict] = []

    for step in range(10):
        try:
            response: AIMessage = await llm_with_tools.ainvoke(messages)
        except Exception as e:
            # ROBUSTNESS: Groq often fails with 'tool_use_failed' but includes the data in the error!
            err_str = str(e)
            
            # Try to find failed_generation in the error string
            # It usually looks like: 'failed_generation': '{\n  "name": "final_response",\n  "arguments": {\n    "recommended": ...\n  }\n}'
            # or it might just be the raw JSON of the tool arguments.
            
            import re
            match = re.search(r"['\"]failed_generation['\"]\s*:\s*['\"](.*?)['\"](?=,\s*['\"]|$|})", err_str, re.DOTALL)
            if match:
                raw_json = match.group(1).replace('\\n', '\n').replace('\\"', '"').replace("\\'", "'")
                try:
                    # The failed_generation might be a stringified JSON of a tool call
                    j_start = raw_json.find("{")
                    j_end = raw_json.rfind("}") + 1
                    if j_start >= 0 and j_end > j_start:
                        parsed = json.loads(raw_json[j_start:j_end])
                        
                        # Case 1: It's a tool call object {"name": "...", "arguments": {...}}
                        if isinstance(parsed, dict) and "arguments" in parsed:
                            args = parsed["arguments"]
                            if "recommended" in args:
                                yield {
                                    "type": "result",
                                    "recommended": args.get("recommended", {}),
                                    "others": args.get("others", []),
                                }
                                return
                        
                        # Case 2: It's just the arguments or the direct result object
                        if isinstance(parsed, dict) and "recommended" in parsed:
                            yield {
                                "type": "result",
                                "recommended": parsed.get("recommended", {}),
                                "others": parsed.get("others", []),
                            }
                            return
                except: pass

            yield {"type": "error", "message": f"LLM Error: {str(e)[:200]}"}
            return

        # Stream thought if present
        thought_text = str(response.content).strip() if response.content else ""
        if thought_text:
            yield {"type": "thought", "content": thought_text, "step": step + 1}
            # If the model output JSON in thought text, try to parse as fallback
            if "{" in thought_text and "}" in thought_text:
                try:
                    s, e = thought_text.find("{"), thought_text.rfind("}") + 1
                    parsed = json.loads(thought_text[s:e])
                    if "recommended" in parsed:
                        yield {
                            "type": "result",
                            "recommended": parsed.get("recommended", {}),
                            "others": parsed.get("others", []),
                        }
                        return
                except: pass

        # Handle tool calls
        if not response.tool_calls:
            # If no tools but we have candidates, use fallback
            if all_candidates:
                sorted_c = sorted(all_candidates, key=lambda x: x.get("score", 0), reverse=True)
                yield {
                    "type": "result",
                    "recommended": sorted_c[0] if sorted_c else {},
                    "others": sorted_c[1:6],
                }
                return
            
            # If nothing at all, wait for next loop or error
            if step > 5:
                 yield {"type": "error", "message": "No results found after multiple attempts."}
                 return
            continue

        messages.append(response)

        for tool_call in response.tool_calls:
            name = tool_call["name"]
            args = tool_call["args"]
            label = TOOL_LABELS.get(name, name)

            if name == "final_response":
                yield {
                    "type": "result",
                    "recommended": args.get("recommended", {}),
                    "others": args.get("others", []),
                }
                return

            yield {"type": "tool_call", "tool": name, "label": label, "step": step + 1}

            try:
                fn = TOOL_MAP.get(name)
                if fn is None: raise ValueError(f"Unknown tool: {name}")

                result = fn.invoke(args)
                result_str = json.dumps(result) if not isinstance(result, str) else result

                # Collect papers from scrapers
                if isinstance(result, dict) and result.get("status") == "success":
                    for item in result.get("data", []):
                        if isinstance(item, dict):
                            all_candidates.append({
                                "title": item.get("title", ""),
                                "pdf_link": item.get("pdf_link", item.get("pdf", "")),
                                "score": item.get("score", 0),
                            })

                # Human-friendly summary
                if isinstance(result, dict):
                    count = len(result.get("data", []))
                    summary = f"Found {count} papers" if result.get("status") == "success" else result.get("message", "No results")
                else:
                    try:
                        parsed_r = json.loads(result)
                        count = len(parsed_r.get("data", []))
                        summary = f"Ranked {count} candidates"
                    except: summary = str(result)[:120]

                yield {"type": "tool_result", "tool": name, "label": label, "success": True, "summary": summary}

            except Exception as e:
                result_str = json.dumps({"status": "error", "message": str(e), "data": []})
                yield {"type": "tool_result", "tool": name, "label": label, "success": False, "summary": str(e)[:120]}

            messages.append(ToolMessage(content=result_str, tool_call_id=tool_call["id"]))

    yield {"type": "error", "message": "Max iterations reached."}
