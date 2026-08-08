from typing import List
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.course import Node, Edge, Course
from app.schemas.node import NodeBase, NodeCreate, NodeUpdate
from app.schemas.edge import EdgeBase


def create_node(db: Session, node_data: NodeCreate) -> Node:
    new_node = Node(
        course_id=node_data.course_id,
        node_key=node_data.node_key,
        title=node_data.title,
        summary=node_data.summary,
        page_references=node_data.page_references,
        youtube_url=node_data.youtube_url,
        youtube_timestamp_seconds=node_data.youtube_timestamp_seconds,
        position_x=node_data.position_x,
        position_y=node_data.position_y
    )
    db.add(new_node)
    db.commit()
    db.refresh(new_node)
    return new_node


def bulk_create_nodes_and_edges(
    db: Session, 
    course_id: UUID, 
    nodes_data: List[NodeBase], 
    edges_data: List[EdgeBase]
) -> List[Node]:
    """Used by the Gemini Ingestion pipeline to bulk save the entire generated DAG graph."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Target course for graph bulk insertion not found."
        )

    # 1. Insert Nodes
    db_nodes = []
    for nd in nodes_data:
        node_obj = Node(
            course_id=course_id,
            node_key=nd.node_key,
            title=nd.title,
            summary=nd.summary,
            page_references=nd.page_references,
            youtube_url=nd.youtube_url,
            youtube_timestamp_seconds=nd.youtube_timestamp_seconds,
            position_x=nd.position_x,
            position_y=nd.position_y
        )
        db_nodes.append(node_obj)
    
    db.add_all(db_nodes)

    # 2. Insert Edges
    db_edges = []
    for eg in edges_data:
        edge_obj = Edge(
            course_id=course_id,
            source_node_key=eg.source_node_key,
            target_node_key=eg.target_node_key
        )
        db_edges.append(edge_obj)

    db.add_all(db_edges)
    db.commit()

    return db_nodes


def update_node_positions(
    db: Session, 
    course_id: UUID, 
    position_updates: dict[UUID, tuple[float, float]]
) -> None:
    """Updates (x, y) visual coordinates after drag-and-drop on the frontend graph viewer."""
    for node_id, (x, y) in position_updates.items():
        db.query(Node).filter(Node.id == node_id, Node.course_id == course_id).update(
            {"position_x": x, "position_y": y}
        )
    db.commit()


def get_nodes_by_course(db: Session, course_id: UUID) -> List[Node]:
    return db.query(Node).filter(Node.course_id == course_id).all()