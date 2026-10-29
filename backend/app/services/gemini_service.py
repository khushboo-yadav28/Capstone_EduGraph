import json
import logging
import time
from typing import Dict, Any, List, Optional, Union
from uuid import uuid4
from google import genai
from google.genai import types
from google.genai.errors import APIError
from pydantic import BaseModel, Field

from app.core.config import (
    GEMINI_API_KEY,
    GEMINI_PRIMARY_MODEL,
    GEMINI_FALLBACK_MODEL,
    GEMINI_INGESTION_TEMPERATURE,
    GEMINI_INGESTION_MAX_TOKENS,
    GEMINI_CHAT_TEMPERATURE,
    GEMINI_CHAT_MAX_TOKENS,
)
from app.models.quiz import DifficultyLevel
from app.utils.graph_layout import calculate_dag_layout

logger = logging.getLogger(__name__)

# Initialize Google GenAI Client
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None


# ==========================================
# 1. Stable Model Resolution (Updated for 2026 Models)
# ==========================================

def get_candidate_generation_models() -> List[str]:
    """Return latest supported Gemini generation models in priority order."""
    return [
        "gemini-3.8-flash",
        "gemini-3.5-flash",
        "gemini-flash-latest",
        GEMINI_PRIMARY_MODEL or "gemini-3.8-flash",
        GEMINI_FALLBACK_MODEL or "gemini-3.5-flash"
    ]


def get_candidate_embedding_models() -> List[str]:
    """Return stable Gemini embedding models."""
    return [
        "text-embedding-004",
        "embedding-001"
    ]


# ==========================================
# 2. Structured Output Pydantic Schemas
# ==========================================

class GeminiQuizSchema(BaseModel):
    set_number: int = Field(..., ge=1, le=2, description="The quiz set number: 1 for Quiz Set 1, 2 for Quiz Set 2.")
    question_text: str = Field(..., description="Clear multiple choice question testing node content.")
    options: List[str] = Field(
        ..., 
        min_items=4, 
        max_items=4, 
        description="Exactly 4 distinct answer choices [Option 0, Option 1, Option 2, Option 3]."
    )
    correct_option_index: int = Field(
        ..., 
        ge=0, 
        le=3, 
        description="Zero-based index of the correct option (0, 1, 2, or 3)."
    )
    explanation: str = Field(..., description="Detailed explanation of why the correct option is right.")
    difficulty: DifficultyLevel = Field(
        default=DifficultyLevel.EASY, 
        description="Difficulty level: EASY, MEDIUM, or HARD."
    )


class GeminiNodeSchema(BaseModel):
    node_key: str = Field(..., description="Unique key like 'node_1', 'node_2'.")
    title: str = Field(..., description="Concise, clear concept title (max 255 chars).")
    summary: str = Field(
        ..., 
        description="Comprehensive, high-quality educational study note summarizing this concept."
    )
    page_references: Optional[str] = Field(
        None, 
        description="Location in the source documents, e.g., 'Document A: Pages 4-6' or 'Lecture 1: Section 2.1'."
    )
    youtube_url: Optional[str] = Field(
        None, 
        description="Strictly null unless an explicit YouTube video URL is written directly inside the uploaded PDF document."
    )
    youtube_timestamp_seconds: Optional[int] = Field(
        None, 
        description="Strictly null unless an explicit YouTube video timestamp is present in the source PDF."
    )
    quizzes: List[GeminiQuizSchema] = Field(
        ..., 
        min_items=20, 
        max_items=20, 
        description=(
            "Exactly 20 quiz questions total. The first 10 questions must have "
            "set_number=1. The next 10 questions must have set_number=2."
        )
    )


class GeminiEdgeSchema(BaseModel):
    source_node_key: str = Field(..., description="Prerequisite concept node_key (e.g. node_1).")
    target_node_key: str = Field(..., description="Dependent downstream concept node_key (e.g. node_2).")


class CourseGraphExtractionSchema(BaseModel):
    course_title: str = Field(..., description="Extracted or generated course title.")
    course_description: str = Field(..., description="High-level overview of the entire course DAG.")
    nodes: List[GeminiNodeSchema] = Field(
        ..., 
        description="List of all extracted concept nodes forming the learning roadmap."
    )
    edges: List[GeminiEdgeSchema] = Field(
        ..., 
        description="Directed edges defining prerequisite flow (Source -> Target)."
    )


# ==========================================
# 3. Text Chunking & Embeddings
# ==========================================

def extract_text_chunks_from_pdf(
    pdf_bytes: bytes, 
    document_name: str = "document.pdf", 
    chunk_size: int = 800, 
    chunk_overlap: int = 150
) -> List[Dict[str, Any]]:
    chunks: List[Dict[str, Any]] = []
    try:
        try:
            import pymupdf as fitz
        except ImportError:
            import fitz

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        chunk_idx = 0
        for page_idx, page in enumerate(doc, start=1):
            page_text = page.get_text("text").strip()
            if not page_text:
                continue

            words = page_text.split()
            step = max(1, (chunk_size - chunk_overlap) // 5)
            window = max(1, chunk_size // 5)
            
            start = 0
            while start < len(words):
                end = min(start + window, len(words))
                chunk_str = " ".join(words[start:end]).strip()
                if len(chunk_str) > 30:
                    chunks.append({
                        "chunk_index": chunk_idx,
                        "content": chunk_str,
                        "page_number": page_idx,
                        "document_name": document_name
                    })
                    chunk_idx += 1
                if end >= len(words):
                    break
                start += step
        doc.close()
    except Exception as e:
        logger.warning(f"PyMuPDF text extraction warning for '{document_name}': {str(e)}")
    return chunks


def generate_embeddings_for_chunks(
    chunks: Union[List[Dict[str, Any]], List[str]]
) -> Union[List[Dict[str, Any]], List[Optional[List[float]]]]:
    if not chunks:
        return []

    is_dict_list = isinstance(chunks[0], dict)
    text_contents = [c["content"] if is_dict_list else c for c in chunks]

    embeddings: List[Optional[List[float]]] = []
    if not client or not GEMINI_API_KEY:
        if is_dict_list:
            for c in chunks:
                c["embedding"] = None
            return chunks
        return [None] * len(text_contents)

    embedding_models = get_candidate_embedding_models()

    batch_size = 10
    for i in range(0, len(text_contents), batch_size):
        batch = text_contents[i:i + batch_size]
        batch_embeddings: Optional[List[Optional[List[float]]]] = None

        for emb_model in embedding_models:
            try:
                res = client.models.embed_content(
                    model=emb_model,
                    contents=batch
                )

                if hasattr(res, "embeddings") and res.embeddings:
                    batch_embeddings = []
                    for e in res.embeddings:
                        vals = getattr(e, "values", None)
                        if vals is not None and isinstance(vals, list):
                            if len(vals) > 768:
                                vals = vals[:768]
                            elif len(vals) < 768:
                                vals = vals + [0.0] * (768 - len(vals))
                            batch_embeddings.append(vals)
                    break
            except Exception as e:
                logger.warning(f"Embedding model '{emb_model}' attempt failed: {str(e)}")

        if batch_embeddings:
            embeddings.extend(batch_embeddings)
        else:
            embeddings.extend([None] * len(batch))

    if is_dict_list:
        for idx, c in enumerate(chunks):
            c["embedding"] = embeddings[idx] if idx < len(embeddings) else None
        return chunks

    return embeddings


# ==========================================
# 4. Multi-Document Knowledge Graph Extraction
# ==========================================

INGESTION_PROMPT = """
You are an expert Curriculum Engineer and Instructional Designer for the EduGraph Knowledge Graph Adaptive Courseware System.
Analyze the uploaded course document(s) and synthesize a cohesive, structured, pedagogical Directed Acyclic Graph (DAG) Knowledge Graph.

CRITICAL INSTRUCTIONS:
1. TOPOLOGY & KNOWLEDGE GRAPH (STRICT LINEAR SEQUENCE):
   - Synthesize all primary topics across the uploaded material into a STRICTLY LINEAR, sequential learning chain (Node 1 -> Node 2 -> Node 3 -> Node 4 -> etc.).
   - DO NOT create parallel branches, forks, or multiple child/parent branches. Every node (except the first and last) must have exactly 1 incoming edge and 1 outgoing edge forming a straight vertical sequence.
   - Extract concepts as ordered nodes with unique lowercase keys ('node_1', 'node_2', 'node_3', 'node_4', etc.).
   - Create directed edges forming a strict sequential flow (e.g., node_1 -> node_2, node_2 -> node_3, node_3 -> node_4).

2. DYNAMIC NODE QUANTITY & GRANULARITY:
   - Scale the number of nodes appropriately according to content depth across all uploaded documents, maintaining a strict linear chain:
     * Brief material (1-20 pages): 3-5 sequential nodes.
     * Medium scope (21-60 pages): 6-8 sequential nodes.
     * Comprehensive curriculum (60+ pages): 9-14 sequential nodes.

3. NODE CONTENT, SUMMARY & FORMATTING:
   - Target Depth Level: University / Rigorous Academic standard.
   - Word Count: Each node summary must be comprehensive (roughly 250 to 450 words, rich in educational detail).
   - Formatting: Use structured Markdown:
     * A 2-3 sentence overview introducing the core concept.
     * 3-5 DETAILED bullet points (each with **bold** key terms) explaining internal mechanics, rules, or formulas.
     * A practical example or real-world use-case.
   - Contextual Continuity: Relate current nodes back to upstream prerequisites (e.g., "Building on [Prerequisite Node Title]...").
   - References: Include explicit source document and page references (e.g., "Lecture 1: Pages 4-6").

4. YOUTUBE REFERENCES (STRICT ZERO-HALLUCINATION RULE):
   - DO NOT generate, make up, search for, or hallucinate any YouTube URLs or timestamps.
   - Set `youtube_url` and `youtube_timestamp_seconds` to NULL UNLESS an explicit YouTube link is written in the PDF text.

5. MANDATORY DUAL-SET QUESTION BANK:
   - Generate exactly 20 quiz objects for every node.
   - The quizzes array MUST contain exactly 20 objects in this order:
     * Array indexes 0-9: exactly 10 questions, each with set_number=1.
     * Array indexes 10-19: exactly 10 questions, each with set_number=2.
   - Do not assign set_number=1 to all 20 questions.
   - Do not omit set_number from any question.
   - Set 2 must contain its own 10 questions, not duplicate Set 1.
   - Every question must contain exactly 4 options.
"""


def extract_course_graph_from_multiple_pdfs(
    documents: Union[List[Dict[str, Any]], List[tuple[bytes, str]], List[bytes]]
) -> Dict[str, Any]:
    if not documents:
        raise ValueError("At least one document must be provided for graph extraction.")

    if not client:
        raise RuntimeError("Gemini API client is not initialized. Check GEMINI_API_KEY.")

    try:
        start_time = time.perf_counter()
        logger.info(f"Sending {len(documents)} document(s) to Gemini for unified Knowledge Graph extraction...")

        parts = []
        for item in documents:
            if isinstance(item, dict):
                data = item["bytes"]
                m_type = item.get("mime_type", "application/pdf")
            elif isinstance(item, tuple):
                data = item[0]
                m_type = "application/pdf"
            elif isinstance(item, bytes):
                data = item
                m_type = "application/pdf"
            else:
                continue

            parts.append(types.Part.from_bytes(data=data, mime_type=m_type))

        parts.append(INGESTION_PROMPT)

        candidate_models = get_candidate_generation_models()
        logger.info(f"Candidate Gemini generation models in priority order: {candidate_models}")

        response = None
        last_error = None
        max_retries = 2

        for model_name in candidate_models:
            if not model_name:
                continue
            success = False
            for attempt in range(1, max_retries + 1):
                try:
                    logger.info(f"Attempting Gemini graph extraction with model: {model_name} (Attempt {attempt}/{max_retries})")
                    response = client.models.generate_content(
                        model=model_name,
                        contents=parts,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            response_schema=CourseGraphExtractionSchema,
                            temperature=GEMINI_INGESTION_TEMPERATURE,
                            max_output_tokens=GEMINI_INGESTION_MAX_TOKENS,
                        )
                    )
                    if response and response.text:
                        logger.info(f"Successfully generated graph with model: {model_name}")
                        success = True
                        break
                except APIError as api_err:
                    last_error = api_err
                    logger.warning(f"API Error with model '{model_name}': {str(api_err)}")
                    break
                except Exception as e:
                    logger.warning(f"Generation attempt with model '{model_name}' failed: {str(e)}")
                    last_error = e
                    break

            if success:
                break

        if not response or not response.text:
            raise RuntimeError(f"All candidate Gemini models failed. Last error: {str(last_error)}")

        elapsed_time = round(time.perf_counter() - start_time, 2)
        usage = response.usage_metadata
        prompt_tokens = usage.prompt_token_count if usage else 0
        completion_tokens = usage.candidates_token_count if usage else 0
        logger.info(
            f"Gemini Multi-Doc Extraction Completed in {elapsed_time}s | "
            f"Tokens: Prompt={prompt_tokens}, Completion={completion_tokens}"
        )

        response_text = response.text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()

        try:
            raw_data = json.loads(response_text)
        except json.JSONDecodeError as json_err:
            logger.warning(f"JSON truncation detected, attempting auto-repair: {str(json_err)}")
            fixed_text = response_text.rstrip()
            if fixed_text.endswith(','):
                fixed_text = fixed_text[:-1]
            
            open_braces = fixed_text.count('{') - fixed_text.count('}')
            open_brackets = fixed_text.count('[') - fixed_text.count(']')
            fixed_text += '}' * max(0, open_braces) + ']' * max(0, open_brackets)
            
            try:
                raw_data = json.loads(fixed_text)
                logger.info("Successfully auto-repaired and parsed truncated JSON response!")
            except Exception as repair_err:
                logger.error(f"Failed to repair JSON. Snippet: {response_text[-300:]}")
                raise RuntimeError(f"Gemini returned truncated JSON: {str(json_err)}")

        for node in raw_data.get("nodes", []):
            quizzes = node.get("quizzes", [])
            for index, quiz in enumerate(quizzes):
                quiz["set_number"] = 1 if index < 10 else 2

        raw_nodes = raw_data.get("nodes", [])
        raw_edges = raw_data.get("edges", [])

        node_dicts_for_layout = []
        for n in raw_nodes:
            node_dicts_for_layout.append({
                "id": n["node_key"],
                "node_key": n["node_key"],
                "title": n["title"],
                "summary": n["summary"],
                "page_references": n.get("page_references"),
                "youtube_url": n.get("youtube_url"),
                "youtube_timestamp_seconds": n.get("youtube_timestamp_seconds"),
                "quizzes": n.get("quizzes", [])
            })

        edge_tuples = [
            (e["source_node_key"], e["target_node_key"]) 
            for e in raw_edges
        ]

        positioned_nodes = calculate_dag_layout(node_dicts_for_layout, edge_tuples)

        return {
            "title": raw_data["course_title"],
            "description": raw_data["course_description"],
            "nodes": positioned_nodes,
            "edges": [
                {
                    "source_node_key": e["source_node_key"],
                    "target_node_key": e["target_node_key"]
                }
                for e in raw_edges
            ]
        }

    except Exception as e:
        logger.error(f"Failed to process documents with Gemini: {str(e)}", exc_info=True)
        raise RuntimeError(f"Gemini multi-document processing error: {str(e)}")


def extract_course_graph_from_pdf(
    pdf_bytes: bytes, 
    mime_type: str = "application/pdf"
) -> Dict[str, Any]:
    return extract_course_graph_from_multiple_pdfs([
        {"bytes": pdf_bytes, "file_name": "syllabus.pdf", "mime_type": mime_type}
    ])

# ==========================================
# 5. AI Doubt Solver & Pedagogical Reasoning
# ==========================================

def answer_student_doubt(
    course_title: str,
    node_title: str,
    node_summary: str,
    question: str,
    context_chunks: Optional[List[str]] = None,
    chat_history: Optional[List[Dict[str, str]]] = None,
) -> str:
    """
    Answers a student doubt in the context of a specific learning node and course material
    using the Gemini API and RAG context chunks.
    """
    context_chunks = context_chunks or []
    chat_history = chat_history or []

    # Clean and truncate reference excerpts
    cleaned_excerpts = []
    total_length = 0
    for chunk in context_chunks:
        if chunk and chunk.strip():
            cleaned = chunk.strip()
            if total_length + len(cleaned) > 3500:
                cleaned = cleaned[:max(200, 3500 - total_length)] + "..."
                cleaned_excerpts.append(cleaned)
                break
            cleaned_excerpts.append(cleaned)
            total_length += len(cleaned)

    excerpts_text = "\n---\n".join(cleaned_excerpts) if cleaned_excerpts else "No specific textbook excerpt found."

    history_lines = []
    if chat_history:
        for msg in chat_history[-6:]:
            role = "Student" if msg.get("role") == "user" else "Tutor"
            history_lines.append(f"{role}: {msg.get('content', '')}")
    history_text = ("\nRecent Conversation History:\n" + "\n".join(history_lines)) if history_lines else ""

    prompt = f"""You are EduGraph's AI Academic Tutor. Provide a clear, encouraging, and accurate explanation for the student's doubt.

Course: {course_title}
Topic / Concept: {node_title}

Concept Summary:
{node_summary}

Relevant Course Material Excerpts:
{excerpts_text}
{history_text}

Student Question:
{question}

Instructions:
1. Provide a direct, pedagogical explanation addressing the student's question clearly.
2. Ground your explanation in the concept topic ({node_title}) and refer to the course materials where applicable.
3. Use formatted Markdown (bullet points, bold key terms, code examples if relevant) to make the explanation easy to read.
4. Keep the tone helpful, professional, and clear.
"""

    if not client:
        logger.warning("Gemini Client not initialized. Returning educational fallback answer.")
        return (
            f"**{node_title} — Concept Explanation:**\n\n"
            f"{node_summary}\n\n"
            f"Regarding your doubt (*{question}*): Focus on the core definitions above. "
            f"Please review the linked video lecture and textbook page references for deeper insights."
        )

    candidate_models = get_candidate_generation_models()
    for model_name in candidate_models:
        if not model_name:
            continue
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=GEMINI_CHAT_TEMPERATURE,
                    max_output_tokens=GEMINI_CHAT_MAX_TOKENS,
                )
            )
            if response and response.text:
                return response.text.strip()
        except Exception as e:
            logger.warning(f"Gemini doubt solver error with model '{model_name}': {str(e)}")
            continue

    # Fallback response if all API models fail
    excerpt_quote = f"\n\n> *Reference excerpt: {cleaned_excerpts[0][:200]}...*" if cleaned_excerpts else ""
    return (
        f"**{node_title} — Tutor Guidance:**\n\n"
        f"{node_summary}\n\n"
        f"Regarding your question (*{question}*): {excerpt_quote}\n\n"
        f"*Tip: Try breaking down this question into core sub-concepts or reviewing the assessment quiz feedback.*"
    )
