import json
import logging
from typing import Dict, Any, List, Optional
from uuid import uuid4
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from app.core.config import GEMINI_API_KEY
from app.models.quiz import DifficultyLevel
from app.utils.graph_layout import calculate_dag_layout

logger = logging.getLogger(__name__)

# Initialize Google GenAI Client
client = genai.Client(GEMINI_API_KEY)


# ==========================================
# 1. Structured Output Pydantic Schemas
# (Strictly matched to DB models and Schemas)
# ==========================================

class GeminiQuizSchema(BaseModel):
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
        description="Location in the source PDF, e.g., 'Pages 4-6' or 'Section 2.1'."
    )
    youtube_url: Optional[str] = Field(
        None, 
        description="Relevant educational YouTube video URL for supplementary visual learning."
    )
    youtube_timestamp_seconds: Optional[int] = Field(
        None, 
        description="Timestamp offset in seconds for YouTube video start."
    )
    quizzes: List[GeminiQuizSchema] = Field(
        ..., 
        min_items=20, 
        max_items=20, 
        description="EXACTLY 20 high-quality multiple choice questions testing this specific concept."
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
# 2. Ingestion Service Implementation
# ==========================================

def extract_course_graph_from_pdf(
    pdf_bytes: bytes, 
    mime_type: str = "application/pdf"
) -> Dict[str, Any]:
    """
    Ingests PDF bytes, sends them to Gemini 3.5 Flash for complete Concept Knowledge Graph extraction,
    generates 20 quiz questions per node, calculates DAG coordinates, and returns DB-ready payload.
    """
    prompt = """
    You are an expert Curriculum Engineer and Instructional Designer.
    Analyze the uploaded PDF material and convert it into a structured, pedagogical Directed Acyclic Graph (DAG) Knowledge Graph.

    CRITICAL INSTRUCTIONS:
    1. TOPOLOGY & KNOWLEDGE GRAPH:
       - Extract all major concepts as ordered learning nodes with unique keys ('node_1', 'node_2', ...).
       - Create directed edges (source_node_key -> target_node_key) indicating strict prerequisite learning order.
       - Ensure the dependency structure forms a valid Directed Acyclic Graph (DAG) with NO cycles.

    2. NODE CONTENT & AUGMENTATION:
       - Provide a comprehensive, detailed study note (summary) for each node.
       - Include source PDF page references (e.g. "Pages 12-15").
       - IF the uploaded PDF material is incomplete, ambiguous, or lacks sufficient detail on a topic, ENRICH and AUGMENT the summary using your extensive foundational domain knowledge to ensure complete learning coverage.

    3. QUESTION BANK (CRITICAL):
       - For EVERY concept node, generate EXACTLY 20 multiple choice questions.
       - Each question MUST have exactly 4 options.
       - `correct_option_index` must be an integer from 0 to 3 matching the correct string in `options`.
       - Vary difficulty across EASY, MEDIUM, and HARD.
       - Provide thorough explanations for every answer.
    """

    try:
        logger.info("Sending PDF content to Gemini for Knowledge Graph extraction...")
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Part.from_bytes(data=pdf_bytes, mime_type=mime_type),
                prompt
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=CourseGraphExtractionSchema,
                temperature=0.2
            )
        )

        raw_data = json.loads(response.text)
        
        # --- Map Node Keys for Layout Utility ---
        # calculate_dag_layout expects nodes as dicts with "id" and edges as (source_id, target_id)
        raw_nodes = raw_data.get("nodes", [])
        raw_edges = raw_data.get("edges", [])

        # Format node dictionaries for calculate_dag_layout utility
        node_dicts_for_layout = []
        for n in raw_nodes:
            node_dicts_for_layout.append({
                "id": n["node_key"],  # Use node_key as temporary ID for layout calculation
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

        # --- Calculate (x, y) DAG Coordinates ---
        positioned_nodes = calculate_dag_layout(node_dicts_for_layout, edge_tuples)

        # Build final formatted payload matching backend database models
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
        logger.error(f"Failed to process PDF with Gemini: {str(e)}", exc_info=True)
        raise RuntimeError(f"Gemini processing error: {str(e)}")