"""
Jerome Kelleher tskit Tree Sequence Genealogies & Coalescent Analytics.
"""

from typing import List, Dict, Tuple, Optional

class TreeSequenceAnalyzer:
    def __init__(self, sequence_length: float = 1000.0):
        self.sequence_length = sequence_length
        self.nodes: List[Dict[str, float]] = []
        self.edges: List[Dict[str, float]] = []
        self.sites: List[Dict[str, str]] = []
        self.mutations: List[Dict[str, str]] = []

    def add_node(self, time: float, population: int = 0, is_sample: bool = False) -> int:
        node_id = len(self.nodes)
        self.nodes.append({
            "id": node_id,
            "time": time,
            "population": population,
            "is_sample": 1 if is_sample else 0,
        })
        return node_id

    def add_edge(self, left: float, right: float, parent: int, child: int) -> int:
        edge_id = len(self.edges)
        self.edges.append({
            "id": edge_id,
            "left": left,
            "right": right,
            "parent": parent,
            "child": child,
        })
        return edge_id

    def find_mrca(self, node_a: int, node_b: int) -> Optional[int]:
        if node_a == node_b:
            return node_a

        # BFS trace parents of a
        parents_a = set()
        queue = [node_a]
        while queue:
            curr = queue.pop(0)
            parents_a.add(curr)
            for e in self.edges:
                if e["child"] == curr:
                    queue.append(int(e["parent"]))

        # BFS trace parents of b
        queue = [node_b]
        earliest_mrca = None
        min_time = float("inf")
        while queue:
            curr = queue.pop(0)
            if curr in parents_a:
                t = self.nodes[curr]["time"]
                if t < min_time:
                    min_time = t
                    earliest_mrca = curr
            for e in self.edges:
                if e["child"] == curr:
                    queue.append(int(e["parent"]))

        return earliest_mrca

    def to_newick(self) -> str:
        """Exports tree topology to standard Newick format."""
        if not self.nodes:
            return "();"
        # Find root
        children_ids = {e["child"] for e in self.edges}
        roots = [n["id"] for n in self.nodes if n["id"] not in children_ids]
        if not roots:
            return "();"
        root = roots[0]

        def build_subtree(u):
            kids = [e["child"] for e in self.edges if e["parent"] == u]
            if not kids:
                return f"Leaf_{u}"
            child_strs = [build_subtree(k) for k in kids]
            return f"({','.join(child_strs)})Node_{u}"

        return f"{build_subtree(root)};"
