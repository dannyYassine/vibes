use std::collections::{HashMap, VecDeque};

use uuid::Uuid;

use crate::entities::diagram::Viewport;
use crate::entities::edge::Edge;
use crate::entities::node::Node;

const COLUMN_SPACING: f64 = 300.0;
const ROW_SPACING: f64 = 200.0;
const START_X: f64 = 100.0;
const START_Y: f64 = 100.0;

pub struct LayoutService;

impl LayoutService {
    /// Applies a topological-sort-based grid layout to the nodes.
    /// Returns a viewport centered on the bounding box.
    pub fn apply_layout(nodes: &mut Vec<Node>, edges: &[Edge]) -> Viewport {
        if nodes.is_empty() {
            return Viewport {
                x: 0.0,
                y: 0.0,
                zoom: 1.0,
            };
        }

        let node_ids: Vec<Uuid> = nodes.iter().map(|n| n.id).collect();
        let id_set: std::collections::HashSet<Uuid> = node_ids.iter().copied().collect();

        // Build adjacency and in-degree maps
        let mut in_degree: HashMap<Uuid, usize> = node_ids.iter().map(|&id| (id, 0)).collect();
        let mut adjacency: HashMap<Uuid, Vec<Uuid>> = node_ids.iter().map(|&id| (id, vec![])).collect();

        for edge in edges {
            if id_set.contains(&edge.source_id) && id_set.contains(&edge.target_id) {
                adjacency.entry(edge.source_id).or_default().push(edge.target_id);
                *in_degree.entry(edge.target_id).or_default() += 1;
            }
        }

        // Kahn's algorithm for topological sort with layer assignment
        let mut queue: VecDeque<Uuid> = VecDeque::new();
        let mut layer_map: HashMap<Uuid, usize> = HashMap::new();

        for (&id, &deg) in &in_degree {
            if deg == 0 {
                queue.push_back(id);
                layer_map.insert(id, 0);
            }
        }

        while let Some(current) = queue.pop_front() {
            let current_layer = layer_map[&current];
            if let Some(neighbors) = adjacency.get(&current) {
                for &neighbor in neighbors {
                    let deg = in_degree.get_mut(&neighbor).unwrap();
                    *deg -= 1;
                    let next_layer = current_layer + 1;
                    let existing = layer_map.entry(neighbor).or_insert(0);
                    if next_layer > *existing {
                        *existing = next_layer;
                    }
                    if *deg == 0 {
                        queue.push_back(neighbor);
                    }
                }
            }
        }

        // Assign cycle nodes to last layer + 1
        let max_layer = layer_map.values().copied().max().unwrap_or(0);
        for &id in &node_ids {
            layer_map.entry(id).or_insert(max_layer + 1);
        }

        // Group nodes by layer
        let mut layers: HashMap<usize, Vec<Uuid>> = HashMap::new();
        for (&id, &layer) in &layer_map {
            layers.entry(layer).or_default().push(id);
        }

        // Assign grid positions
        let mut position_map: HashMap<Uuid, (f64, f64)> = HashMap::new();
        let mut sorted_layers: Vec<usize> = layers.keys().copied().collect();
        sorted_layers.sort();

        for (col_idx, &layer) in sorted_layers.iter().enumerate() {
            let layer_nodes = layers.get(&layer).unwrap();
            for (row_idx, &node_id) in layer_nodes.iter().enumerate() {
                let x = START_X + col_idx as f64 * COLUMN_SPACING;
                let y = START_Y + row_idx as f64 * ROW_SPACING;
                position_map.insert(node_id, (x, y));
            }
        }

        // Apply positions to nodes
        let mut min_x = f64::MAX;
        let mut min_y = f64::MAX;
        let mut max_x = f64::MIN;
        let mut max_y = f64::MIN;

        for node in nodes.iter_mut() {
            if let Some(&(x, y)) = position_map.get(&node.id) {
                node.position.x = x;
                node.position.y = y;
                min_x = min_x.min(x);
                min_y = min_y.min(y);
                max_x = max_x.max(x + node.size.width);
                max_y = max_y.max(y + node.size.height);
            }
        }

        // Return viewport centered on bounding box
        Viewport {
            x: (min_x + max_x) / 2.0,
            y: (min_y + max_y) / 2.0,
            zoom: 1.0,
        }
    }
}
