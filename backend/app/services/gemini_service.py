import json
import logging
import time
from typing import Dict, Any, List, Optional
from uuid import uuid4
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from app.core.config import (
    GEMINI_API_KEY,
    GEMINI_PRIMARY_MODEL,
    GEMINI_INGESTION_TEMPERATURE,
    GEMINI_INGESTION_MAX_TOKENS,
)
from app.models.quiz import DifficultyLevel
from app.utils.graph_layout import calculate_dag_layout

logger = logging.getLogger(__name__)

# Initialize Google GenAI Client
client = genai.Client(api_key=GEMINI_API_KEY)


# ==========================================
# 1. Structured Output Pydantic Schemas
# (Strictly matched to DB models and Schemas)
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
        description="Location in the source PDF, e.g., 'Pages 4-6' or 'Section 2.1'."
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
        # description="Generate either 10 questions (1 quiz block) or 20 questions (2 quiz blocks of 10) per node as a multiple of 10."
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
    Ingests PDF bytes, sends them to Gemini for complete Concept Knowledge Graph extraction,
    generates 20 quiz questions per node, calculates DAG coordinates, and returns DB-ready payload.
    """

    prompt = """
    You are an expert Curriculum Engineer and Instructional Designer.
    Analyze the uploaded PDF material and convert it into a structured, pedagogical Directed Acyclic Graph (DAG) Knowledge Graph.

    CRITICAL INSTRUCTIONS:
    1. TOPOLOGY & KNOWLEDGE GRAPH:
       - Extract learning concepts as ordered nodes with unique lowercase keys ('node_1', 'node_2', etc.).
       - Create directed edges (source_node_key -> target_node_key) to define prerequisite learning flow forming a valid DAG with NO cycles.

    2. DYNAMIC NODE QUANTITY & GRANULARITY (BASED ON PDF LENGTH):
       - Determine the scope/length of the uploaded PDF and scale the number of nodes accordingly:
         * 1 to 20 pages: Extract 3-4 nodes.
         * 21 to 50 pages: Extract 5-7 nodes.
         * 51 to 100 pages: Extract 8-12 nodes.
         * 100+ pages: Extract 12+ nodes.
       - Group closely related sub-topics into comprehensive nodes rather than micro-nodes.

    3. NODE CONTENT, SUMMARY & FORMATTING:
       - Target Depth Level: University / Rigorous Academic standard.
       - Word Count: Each node summary must be comprehensive (roughly 250 to 450 words, rich in detail even if the underlying PDF source text is brief).
       - Formatting: Use Markdown with a hybrid structure:
         * A 2-3 sentence overview introducing the core concept.
         * A section of 3-5 DETAILED bullet points (each 2-3 sentences with **bold** key terms) explaining internal mechanics, rules, or formulas.
         * A practical example or real-world use-case.
       - Contextual Continuity: Relate current nodes back to upstream prerequisites (e.g., "Building on [Prerequisite Node Title]...").
       - Page References: Include explicit source PDF page references (e.g., "Pages 12-15").

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
    
    
   
    # 5. DYNAMIC QUESTION BANK (MULTIPLE OF 10 RULE):
    #    - For each node, generate quizzes subject to strict limits:
    #      * **Lower Limit**: 1 quiz per node containing exactly 10 questions.
    #      * **Upper Limit**: 2 quizzes per node, where each quiz contains exactly 10 questions (totaling 20 questions for that node).
    #    - Use 2 quizzes for larger/denser nodes, and 1 quiz for shorter/focused nodes.
    #    - Each question MUST have exactly 4 options.
    #    - `correct_option_index` must be an integer from 0 to 3 matching the zero-based index in `options`.
    #    - Vary difficulty across EASY, MEDIUM, and HARD, and provide thorough explanations for every answer.
    


    
    
    # """
    # You are an expert Curriculum Engineer and Instructional Designer.
    # Analyze the uploaded PDF material and convert it into a structured, pedagogical Directed Acyclic Graph (DAG) Knowledge Graph.

    # CRITICAL INSTRUCTIONS:
    # 1. TOPOLOGY & KNOWLEDGE GRAPH:
    #    - Extract the top 4 primary learning concepts as ordered nodes with unique keys ('node_1', 'node_2', 'node_3', 'node_4').
    #    - Node keys MUST strictly follow lowercase string format ('node_1', 'node_2').
    #    - Create directed edges (source_node_key -> target_node_key) using exact node keys to define prerequisite learning flow.
    #    - Ensure the dependency structure forms a valid Directed Acyclic Graph (DAG) with NO cycles.

    # 2. NODE QUANTITY & GRANULARITY (TESTING BUDGET):
    #    - Extract EXACTLY 4 major concept nodes from the PDF material.
    #    - Group closely related sub-topics into a single comprehensive node rather than creating micro-nodes.

    # 3. NODE CONTENT, AUGMENTATION & FORMATTING (STRICT RULES):
    #    - Target Depth Level: University / Rigorous Academic standard.
    #    - Word Count: Each node summary should be comprehensive (roughly 250 to 450 words).
    #    - Formatting: Use Markdown with a hybrid structure:
    #      * A 2-3 sentence overview introducing the core concept.
    #      * A section of 3-5 DETAILED bullet points (each bullet being 2-3 sentences with **bold** key terms) explaining internal mechanics, rules, or formulas.
    #      * A short practical example or real-world use-case illustrating the concept in action.
    #    - Contextual Continuity & Cross-Referencing:
    #      * Where logically applicable, explicitly relate the current node's concept back to prerequisite topics established in upstream nodes (e.g., "Building on the concept of [Prerequisite Node Title]...").
    #      * Highlight how the current topic extends or applies foundational principles introduced earlier in the DAG.
    #    - Augmentation & Enrichment:
    #      * Include source PDF page references (e.g., "Pages 12-15").
    #      * If the PDF material is brief or incomplete on a topic, ENRICH and AUGMENT the summary using foundational domain knowledge so the node is 100% self-contained.
    #      * Fill in missing definitions, step-by-step explanations, and mathematical/logical formulations.
    #      * Do NOT introduce completely unrelated subtopics.

    # 4. YOUTUBE REFERENCES (STRICT ZERO-HALLUCINATION RULE):
    #    - DO NOT generate, make up, search for, or hallucinate any YouTube URLs or timestamps.
    #    - Set `youtube_url` and `youtube_timestamp_seconds` to NULL for every node UNLESS a specific YouTube link is explicitly written inside the text of the uploaded PDF material.

    # 5. QUESTION BANK (FAST TESTING MODE):
    #    - For EVERY concept node, generate EXACTLY 5 multiple choice questions.
    #    - Each question MUST have exactly 4 options.
    #    - `correct_option_index` must be an integer from 0 to 3 matching the zero-based index in `options`.
    #    - Vary difficulty across EASY, MEDIUM, and HARD.
    #    - Provide thorough explanations for every answer.
    # """




    """
    You are an expert Curriculum Engineer and Instructional Designer.
    Analyze the uploaded PDF material and convert it into a structured, pedagogical Directed Acyclic Graph (DAG) Knowledge Graph.

    CRITICAL INSTRUCTIONS:
    1. TOPOLOGY & KNOWLEDGE GRAPH:
       - Extract all major concepts as ordered learning nodes with unique keys ('node_1', 'node_2', ...).
       - Create directed edges (source_node_key -> target_node_key) indicating strict prerequisite learning order.
       - Ensure the dependency structure forms a valid Directed Acyclic Graph (DAG) with NO cycles.

    2. NODE CONTENT, AUGMENTATION & FORMATTING (STRICT RULES):
       - Target Depth Level: University / Rigorous Academic standard.
       - Word Count: Each node summary MUST be between 250 and 450 words.
       - Formatting: Use Markdown with a hybrid structure:
         * A 2-3 sentence overview introducing the core concept.
         * A section of 3-5 DETAILED bullet points (each bullet being 2-3 sentences with **bold** key terms) explaining internal mechanics, rules, or formulas.
         * A short practical example or real-world use-case illustrating the concept in action.
       - Contextual Continuity & Cross-Referencing:
         * Where logically applicable, explicitly relate the current node's concept back to prerequisite topics established in upstream nodes (e.g., "Building on the concept of [Prerequisite Node Title]...").
         * Highlight how the current topic extends or applies foundational principles introduced earlier in the DAG.
       - Augmentation & Enrichment:
         * Include source PDF page references (e.g., "Pages 12-15").
         * If the PDF material is brief or incomplete on a topic, ENRICH and AUGMENT the summary using foundational domain knowledge so the node is 100% self-contained.
         * Fill in missing definitions, step-by-step explanations, and mathematical/logical formulations.
         * Do NOT introduce completely unrelated subtopics.

    3. YOUTUBE REFERENCES (STRICT ZERO-HALLUCINATION RULE):
       - DO NOT generate, make up, search for, or hallucinate any YouTube URLs or timestamps.
       - Set `youtube_url` and `youtube_timestamp_seconds` to NULL for every node UNLESS a specific YouTube link is explicitly written inside the text of the uploaded PDF material.

    4. QUESTION BANK (CRITICAL):
       - For EVERY concept node, generate EXACTLY 5 multiple choice questions.
       - Each question MUST have exactly 4 options.
       - `correct_option_index` must be an integer from 0 to 3 matching the correct string in `options`.
       - Vary difficulty across EASY, MEDIUM, and HARD.
       - Provide thorough explanations for every answer.
       
    5. NODE GRANULARITY & QUANTITY (CRITICAL):
       - Analyze the scope and density of the uploaded PDF material.
       - For short documents (1-5 pages): Extract 2 to 4 major concept nodes.
       - For medium documents (6-20 pages): Extract 4 to 8 major concept nodes.
       - For long documents (20+ pages): Extract 8 to 12 major concept nodes.
       - Do NOT create excessive micro-nodes for minor sub-topics. Group closely related sub-topics into a single comprehensive node.
    """

    try:
        # 1. Start timer
        start_time = time.perf_counter()

        print("Sending PDF content to Gemini for Knowledge Graph extraction...")
        print("Model:", GEMINI_PRIMARY_MODEL)
        print("PDF bytes:", len(pdf_bytes))
        print("MIME type:", mime_type)
        print("PDF header:", repr(pdf_bytes[:8]))
        response = client.models.generate_content(
            model=GEMINI_PRIMARY_MODEL,
            # model="gemini-3.5-flash-lite",
            contents=[
                types.Part.from_bytes(data=pdf_bytes, mime_type=mime_type),
                prompt
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=CourseGraphExtractionSchema,
                temperature=GEMINI_INGESTION_TEMPERATURE,
                max_output_tokens=GEMINI_INGESTION_MAX_TOKENS,
                # thinking_config=types.ThinkingConfig(thinking_budget=0,include_thoughts=False)
            )
        )

        # 2. Stop timer
        elapsed_time_seconds = round(time.perf_counter() - start_time, 2)

        # 3. Extract Token Usage Stats
        usage = response.usage_metadata
        prompt_tokens = usage.prompt_token_count if usage else 0
        completion_tokens = usage.candidates_token_count if usage else 0
        total_tokens = usage.total_token_count if usage else 0

        print(
            f"Gemini Extraction Completed in {elapsed_time_seconds}s | "
            f"Tokens: Prompt={prompt_tokens}, Completion={completion_tokens}, Total={total_tokens}"
        )
        
        raw_data = json.loads(response.text)

        
        # Enforce exactly 10 questions in each set for every node.
        for node in raw_data.get("nodes", []):
            quizzes = node.get("quizzes", [])

            if len(quizzes) != 20:
                raise ValueError(
                    f"Node '{node.get('node_key')}' must have exactly 20 quizzes; "
                    f"Gemini returned {len(quizzes)}."
                )

            for index, quiz in enumerate(quizzes):
                # First 10 questions -> Set 1; next 10 -> Set 2.
                quiz["set_number"] = 1 if index < 10 else 2

            # Log the distribution before saving to the database.
            set_1_count = sum(q["set_number"] == 1 for q in quizzes)
            set_2_count = sum(q["set_number"] == 2 for q in quizzes)

            print(
                f"Node {node.get('node_key')}: "
                f"Set 1 = {set_1_count}, Set 2 = {set_2_count}"
            )
        
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