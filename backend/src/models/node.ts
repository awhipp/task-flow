import { v4 as uuidv4 } from 'uuid';

// Define position interface for graph visualization
export interface Position {
  x: number;
  y: number;
}

// Interface for node types (initiative, epic, task, etc.)
export interface NodeType {
  id: string;
  name: string;
  color: string;
  created_at?: string;
  updated_at?: string;
}

// Interface for nodes with their properties
export interface Node {
  id: string;
  type_id: string;
  label: string;
  description?: string;
  parent_id?: string | null;
  position: Position;
  tags?: string[]; // New field for tags
  data?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

// Interface for links between nodes
export interface Link {
  id: string;
  source_id: string;
  target_id: string;
  label?: string;
  type?: string;
  data?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

// Interface for ReactFlow compatible node format
export interface ReactFlowNode {
  id: string;
  type?: string;
  position: Position;
  data: {
    label: string;
    nodeType: string;
    typeId: string;
    description?: string;
    color: string;
    tags?: string[]; // Add tags to ReactFlow node data
    [key: string]: any;
  };
  parentNode?: string;
}

// Interface for ReactFlow compatible edge format
export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
  data?: Record<string, any>;
}

// Convert from database node to ReactFlow compatible node
export const toReactFlowNode = (
    node: Node, 
    nodeType?: NodeType,
    includeParentNode: boolean = false
): ReactFlowNode => {
  return {
    id: node.id,
    position: typeof node.position === 'string' ? JSON.parse(node.position) : node.position,
    data: {
      label: node.label,
      nodeType: nodeType ? nodeType.name : 'Unknown',
      typeId: node.type_id,
      description: node.description || '',
      color: nodeType ? nodeType.color : '#ccc', // Default color if type is not found
      tags: node.tags && typeof node.tags === 'string' ? JSON.parse(node.tags) : [],
      ...(node.data && typeof node.data === 'string' ? JSON.parse(node.data) : node.data || {}),
    },
    ...(includeParentNode && node.parent_id ? { parentNode: node.parent_id } : {}),
  };
};

// Convert from database link to ReactFlow compatible edge
export const toReactFlowEdge = (link: Link): ReactFlowEdge => {
  return {
    id: link.id,
    source: link.source_id,
    target: link.target_id,
    label: link.label,
    type: 'smoothstep', // Default edge type for visual appeal
    data: link.data && typeof link.data === 'string' ?
      JSON.parse(link.data) : link.data
  };
};

// Factory function to create a new node
export const createNode = (
  typeId: string,
  label: string,
  position: Position,
  parentId?: string | null,
  description?: string,
  tags?: string[],
  data?: Record<string, any>
): Node => {
  return {
    id: uuidv4(),
    type_id: typeId,
    label,
    description,
    parent_id: parentId === "" ? null : parentId, // Handle empty string as null
    position,
    tags: tags || [], // Initialize empty tags array if not provided
    data: data || undefined
  };
};

// Factory function to create a new link
export const createLink = (
  sourceId: string,
  targetId: string,
  label?: string,
  type?: string,
  data?: Record<string, any>
): Link => {
  return {
    id: uuidv4(),
    source_id: sourceId,
    target_id: targetId,
    label,
    type,
    data: data || null
  };
};

// Factory function to create a new node type
export const createNodeType = (
  name: string,
  color: string
): NodeType => {
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    color
  };
};