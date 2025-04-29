import React, { useState, useMemo, useEffect } from 'react';
import { useGraph } from '../../contexts/GraphContext';
import { Node } from 'reactflow';
import { NodeData } from '../../services/api';

interface TableViewProps {
  onNodeClick: (nodeId: string, label: string) => void;
}

// Define a type for our hierarchical node structure
interface HierarchicalNode extends Node<NodeData> {
  children?: HierarchicalNode[];
  depth: number;
  isExpanded: boolean;
  isVisible: boolean;
  parentName?: string;
}

const TableView: React.FC<TableViewProps> = ({ onNodeClick }) => {
  const { currentParentId, breadcrumbs, getAllNodesAcrossGraphs } = useGraph();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [allNodes, setAllNodes] = useState<Node<NodeData>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNodeType, setSelectedNodeType] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  
  // Fetch all nodes across all graphs when component mounts
  useEffect(() => {
    const fetchAllNodes = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const nodes = await getAllNodesAcrossGraphs();
        setAllNodes(nodes);
        
        // Extract all unique tags from nodes
        const allTags = new Set<string>();
        nodes.forEach(node => {
          if (node.data.tags && Array.isArray(node.data.tags)) {
            node.data.tags.forEach(tag => allTags.add(tag));
          }
        });
        
        setAvailableTags(Array.from(allTags).sort());
      } catch (err) {
        console.error('Error fetching all nodes:', err);
        setError('Failed to fetch all nodes');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllNodes();
  }, [getAllNodesAcrossGraphs]);
  
  // Get unique node types for filtering
  const nodeTypes = useMemo(() => {
    const types = new Set<string>();
    allNodes.forEach(node => {
      if (node.data.nodeType) {
        types.add(node.data.nodeType);
      }
    });
    return Array.from(types).sort();
  }, [allNodes]);
  
  // Toggle tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
  };
  
  // Group nodes by parent
  const nodesByParent = useMemo(() => {
    const result: Record<string, Node<NodeData>[]> = {
      root: []
    };
    
    allNodes.forEach(node => {
      const parentId = node.parentNode || 'root';
      if (!result[parentId]) {
        result[parentId] = [];
      }
      result[parentId].push(node);
    });
    
    return result;
  }, [allNodes]);
  
  // Filter nodes based on search term, node type, and selected tags
  const filteredNodes = useMemo(() => {
    return allNodes.filter(node => {
      // Text search in name and description
      const searchMatch = !searchTerm || 
        node.data.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (node.data.description && 
          node.data.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Node type filter
      const typeMatch = !selectedNodeType || node.data.nodeType === selectedNodeType;
      
      // Tag filter
      let tagsMatch = true;
      if (selectedTags.length > 0) {
        const nodeTags = Array.isArray(node.data.tags) ? node.data.tags : [];
        tagsMatch = selectedTags.every(tag => nodeTags.includes(tag));
      }
      
      return searchMatch && typeMatch && tagsMatch;
    });
  }, [allNodes, searchTerm, selectedNodeType, selectedTags]);
  
  // Create hierarchical structure for all nodes
  const hierarchicalNodes = useMemo((): HierarchicalNode[] => {
    const result: HierarchicalNode[] = [];
    const processed = new Set<string>();
    
    // Only work with filtered nodes
    const nodeIds = new Set(filteredNodes.map(node => node.id));
    
    // Function to process nodes hierarchically
    const processNode = (nodeId: string, depth: number = 0, parentName?: string): HierarchicalNode | null => {
      // For root level, we return the top-level nodes
      if (nodeId === 'root') {
        return null;
      }
      
      // Find the node
      const node = allNodes.find(n => n.id === nodeId);
      if (!node || !nodeIds.has(nodeId)) return null;
      
      // Mark as processed
      processed.add(nodeId);
      
      // Get children
      const children = (nodesByParent[nodeId] || []).filter(child => nodeIds.has(child.id));
      const isExpanded = expandedNodes.has(nodeId);
      
      // Create hierarchical node
      const hierarchicalNode: HierarchicalNode = {
        ...node,
        depth,
        isExpanded,
        isVisible: true,
        children: [],
        parentName: parentName || node.data.parentName
      };
      
      // Process children recursively
      hierarchicalNode.children = children
        .map(child => processNode(child.id, depth + 1, node.data.label))
        .filter(Boolean) as HierarchicalNode[];
      
      return hierarchicalNode;
    };
    
    // Start with root nodes (those without a parent)
    const rootNodes = (nodesByParent['root'] || []).filter(node => nodeIds.has(node.id));
    
    rootNodes.forEach(node => {
      const hierarchicalNode = processNode(node.id, 0);
      if (hierarchicalNode) {
        result.push(hierarchicalNode);
      }
    });
    
    // Process any remaining nodes that weren't added via the hierarchy
    filteredNodes.forEach(node => {
      if (!processed.has(node.id)) {
        const hierarchicalNode = processNode(node.id, 0);
        if (hierarchicalNode) {
          result.push(hierarchicalNode);
        }
      }
    });
    
    return result;
  }, [filteredNodes, allNodes, nodesByParent, expandedNodes]);
  
  // Function to toggle node expansion
  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };
  
  // Function to expand all nodes
  const expandAllNodes = () => {
    const allIds = new Set<string>();
    
    const addAllNodeIds = (nodes: HierarchicalNode[]) => {
      nodes.forEach(node => {
        allIds.add(node.id);
        if (node.children?.length) {
          addAllNodeIds(node.children);
        }
      });
    };
    
    addAllNodeIds(hierarchicalNodes);
    setExpandedNodes(allIds);
  };
  
  // Function to collapse all nodes
  const collapseAllNodes = () => {
    setExpandedNodes(new Set());
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedNodeType('');
    setSelectedTags([]);
  };
  
  // Function to flatten hierarchical nodes for rendering with proper visibility
  const flattenNodes = (nodes: HierarchicalNode[], result: HierarchicalNode[] = [], parentVisible: boolean = true, parentExpanded: boolean = true): HierarchicalNode[] => {
    nodes.forEach(node => {
      // A node is visible if its parent is visible AND its parent is expanded
      const isVisible = parentVisible && parentExpanded;
      
      // Add the node to the result array with updated visibility
      const nodeToAdd = { ...node, isVisible };
      result.push(nodeToAdd);
      
      // Recursively process children, passing down this node's visibility and expanded state
      if (node.children && node.children.length > 0) {
        flattenNodes(node.children, result, isVisible, node.isExpanded);
      }
    });
    return result;
  };
  
  // Function to get tag array from node data
  const getNodeTags = (node: Node<NodeData>): string[] => {
    if (!node.data.tags) return [];
    if (Array.isArray(node.data.tags)) return node.data.tags;
    try {
      // Try to parse if it's a JSON string
      const parsed = JSON.parse(node.data.tags as unknown as string);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  
  // Flattened list of nodes to render
  const flattenedNodes = useMemo(() => {
    const flattened = flattenNodes(hierarchicalNodes);
    return flattened.filter(node => node.isVisible); // Only show visible nodes
  }, [hierarchicalNodes]);
  
  if (isLoading) {
    return (
      <div className="table-view loading">
        <div className="loading-spinner"></div>
        <p>Loading all nodes...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="table-view error">
        <p className="error-message">{error}</p>
      </div>
    );
  }
  
  return (
    <div className="table-view">
      {/* Search and filtering controls */}
      <div className="table-search-controls">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-controls">
          <div className="filter-control">
            <label>Type: </label>
            <select 
              value={selectedNodeType} 
              onChange={(e) => setSelectedNodeType(e.target.value)}
              className="type-filter"
            >
              <option value="">All Types</option>
              {nodeTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          {availableTags.length > 0 && (
            <div className="tag-filters">
              <label>Tags: </label>
              <div className="tag-filter-options">
                {availableTags.map(tag => (
                  <div 
                    key={tag}
                    className={`filter-tag ${selectedTags.includes(tag) ? 'selected' : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <button 
            className="clear-filters-btn"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        </div>
      </div>
      
      <div className="table-controls">
        <button 
          className="expand-all-btn" 
          onClick={expandAllNodes}
        >
          Expand All
        </button>
        <button 
          className="collapse-all-btn" 
          onClick={collapseAllNodes}
        >
          Collapse All
        </button>
        <span className="results-count">
          {filteredNodes.length} {filteredNodes.length === 1 ? 'node' : 'nodes'} found
        </span>
      </div>
      
      <table className="node-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Tags</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {flattenedNodes.map(node => {
            const nodeTags = getNodeTags(node);
            
            return (
              <tr
                key={node.id}
                className={`node-row ${node.selected ? 'selected' : ''}`}
              >
                <td className="node-name-cell">
                  <div className="node-name-wrapper" style={{ marginLeft: `${node.depth * 20}px` }}>
                    {node.children && node.children.length > 0 ? (
                      <button 
                        className="expand-button"
                        onClick={() => toggleNodeExpansion(node.id)}
                        aria-label={node.isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {node.isExpanded ? '▼' : '►'}
                      </button>
                    ) : (
                      <span className="no-children-spacer"></span>
                    )}
                    <span 
                      className="node-label"
                      style={{ backgroundColor: node.data.color }}
                      onClick={() => onNodeClick(node.id, node.data.label)}
                    >
                      {node.data.label}
                    </span>
                    {node.parentName && (
                      <span className="parent-label">
                        (in {node.parentName})
                      </span>
                    )}
                  </div>
                </td>
                <td>{node.data.nodeType}</td>
                <td className="tags-cell">
                  {nodeTags.length > 0 ? (
                    <div className="table-tags">
                      {nodeTags.map((tag, index) => (
                        <span key={index} className="table-tag-item">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : '—'}
                </td>
                <td className="description-cell">{node.data.description || '—'}</td>
              </tr>
            );
          })}
          {flattenedNodes.length === 0 && (
            <tr>
              <td colSpan={5} className="no-nodes">
                No nodes found with the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TableView;