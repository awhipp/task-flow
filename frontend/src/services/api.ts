import axios from 'axios';
import { 
  Node, 
  Edge, 
  Position,
  XYPosition 
} from 'reactflow';

// Define the API URL for the backend
const API_URL = 'http://localhost:3001/api';

// Type definitions for our API responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Interface for node types
export interface NodeType {
  id: string;
  name: string;
  color: string;
  created_at?: string;
  updated_at?: string;
}

// Node data interface for additional properties
export interface NodeData {
  label: string;
  nodeType: string;
  typeId: string;
  description?: string;
  color: string;
  tags?: string[]; // Added tags for node metadata
  [key: string]: any;
}

// Backend node creation payload
export interface NodeCreatePayload {
  type_id: string;
  label: string;
  description?: string;
  parent_id?: string | null;
  position: { x: number, y: number };
  tags?: string[]; // Added tags field
  data?: Record<string, any>;
}

// Backend link creation payload
export interface LinkCreatePayload {
  source_id: string;
  target_id: string;
  label?: string;
  type?: string;
  data?: Record<string, any>;
}

// GraphData interface for API responses
export interface GraphData {
  nodes: Node<NodeData>[];
  edges: Edge[];
}

// Node Types API

// Get all node types
export const getNodeTypes = async (): Promise<ApiResponse<NodeType[]>> => {
  try {
    const response = await axios.get(`${API_URL}/node-types`);
    return response.data;
  } catch (error) {
    console.error('Error fetching node types:', error);
    return { success: false, error: 'Failed to fetch node types' };
  }
};

// Create a new node type
export const createNodeType = async (name: string, color: string): Promise<ApiResponse<NodeType>> => {
  try {
    const response = await axios.post(`${API_URL}/node-types`, { name, color });
    return response.data;
  } catch (error) {
    console.error('Error creating node type:', error);
    return { success: false, error: 'Failed to create node type' };
  }
};

// Nodes API

// Get nodes (optionally filtered by parent ID)
export const getNodes = async (parentId?: string): Promise<ApiResponse<Node<NodeData>[]>> => {
  try {
    const url = parentId ? `${API_URL}/nodes?parentId=${parentId}` : `${API_URL}/nodes`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching nodes:', error);
    return { success: false, error: 'Failed to fetch nodes' };
  }
};

// Get all nodes across all graphs
export const getAllNodes = async (): Promise<ApiResponse<Node<NodeData>[]>> => {
  try {
    const response = await axios.get(`${API_URL}/nodes/all`);
    return response.data;
  } catch (error) {
    console.error('Error fetching all nodes:', error);
    return { success: false, error: 'Failed to fetch all nodes' };
  }
};

// Get a specific node by ID
export const getNodeById = async (id: string): Promise<ApiResponse<Node<NodeData>>> => {
  try {
    const response = await axios.get(`${API_URL}/nodes/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching node ${id}:`, error);
    return { success: false, error: `Failed to fetch node ${id}` };
  }
};

// Create a new node
export const createNode = async (node: NodeCreatePayload): Promise<ApiResponse<Node<NodeData>>> => {
  try {
    const response = await axios.post(`${API_URL}/nodes`, node);
    return response.data;
  } catch (error) {
    console.error('Error creating node:', error);
    return { success: false, error: 'Failed to create node' };
  }
};

// Update a node
export const updateNode = async (id: string, updates: Partial<NodeCreatePayload>): Promise<ApiResponse<Node<NodeData>>> => {
  try {
    const response = await axios.put(`${API_URL}/nodes/${id}`, updates);
    return response.data;
  } catch (error) {
    console.error(`Error updating node ${id}:`, error);
    return { success: false, error: `Failed to update node ${id}` };
  }
};

// Delete a node
export const deleteNode = async (id: string): Promise<ApiResponse<any>> => {
  try {
    const response = await axios.delete(`${API_URL}/nodes/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting node ${id}:`, error);
    return { success: false, error: `Failed to delete node ${id}` };
  }
};

// Links API

// Get all links
export const getLinks = async (): Promise<ApiResponse<Edge[]>> => {
  try {
    const response = await axios.get(`${API_URL}/links`);
    return response.data;
  } catch (error) {
    console.error('Error fetching links:', error);
    return { success: false, error: 'Failed to fetch links' };
  }
};

// Create a new link
export const createLink = async (link: LinkCreatePayload): Promise<ApiResponse<Edge>> => {
  try {
    const response = await axios.post(`${API_URL}/links`, link);
    return response.data;
  } catch (error) {
    console.error('Error creating link:', error);
    return { success: false, error: 'Failed to create link' };
  }
};

// Delete a link
export const deleteLink = async (id: string): Promise<ApiResponse<any>> => {
  try {
    const response = await axios.delete(`${API_URL}/links/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting link ${id}:`, error);
    return { success: false, error: `Failed to delete link ${id}` };
  }
};

// Graph API

// Get full graph (optionally filtered by parent ID)
export const getGraph = async (parentId?: string): Promise<ApiResponse<GraphData>> => {
  try {
    const url = parentId ? `${API_URL}/graph?parentId=${parentId}` : `${API_URL}/graph`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching graph:', error);
    return { success: false, error: 'Failed to fetch graph' };
  }
};