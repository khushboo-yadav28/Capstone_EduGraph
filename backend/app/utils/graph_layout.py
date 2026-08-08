from typing import Dict, List, Tuple
from uuid import UUID


def calculate_dag_layout(
    nodes: List[Dict], 
    edges: List[Tuple[UUID, UUID]], 
    x_spacing: int = 250, 
    y_spacing: int = 150
) -> List[Dict]:
    """
    Computes (x, y) visual coordinates for nodes in a Directed Acyclic Graph (DAG).
    Uses topological layering to position prerequisite concepts above child concepts.
    """
    # 1. Map adjacencies and calculate in-degrees
    in_degree = {node["id"]: 0 for node in nodes}
    children = {node["id"]: [] for node in nodes}

    for parent_id, child_id in edges:
        if child_id in in_degree:
            in_degree[child_id] += 1
        if parent_id in children:
            children[parent_id].append(child_id)

    # 2. Assign topological levels (Layer Assignment)
    levels: Dict[UUID, int] = {}
    queue = [node_id for node_id, deg in in_degree.items() if deg == 0]

    for node_id in queue:
        levels[node_id] = 0

    while queue:
        curr = queue.pop(0)
        curr_level = levels[curr]

        for child in children[curr]:
            levels[child] = max(levels.get(child, 0), curr_level + 1)
            in_degree[child] -= 1
            if in_degree[child] == 0:
                queue.append(child)

    # 3. Group nodes by depth level and compute coordinates
    level_groups: Dict[int, List[UUID]] = {}
    for node_id, level in levels.items():
        level_groups.setdefault(level, []).append(node_id)

    coords: Dict[UUID, Tuple[float, float]] = {}
    for level, node_ids in level_groups.items():
        total_in_level = len(node_ids)
        y_pos = level * y_spacing
        
        # Center horizontal placement for each layer
        for index, node_id in enumerate(node_ids):
            x_pos = (index - (total_in_level - 1) / 2) * x_spacing
            coords[node_id] = (x_pos, y_pos)

    # 4. Attach coordinates back to node objects
    for node in nodes:
        x, y = coords.get(node["id"], (0.0, 0.0))
        node["position_x"] = x
        node["position_y"] = y

    return nodes