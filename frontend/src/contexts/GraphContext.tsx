import React, { createContext, useState, useContext, useCallback, useEffect, ReactNode } from 'react';
import { 
  Node, 
  Edge, 
  OnNodesChange, 
  OnEdgesChange, 
  OnConnect, 
  applyNodeChanges, 
  applyEdgeChanges, 
  addEdge, 
  Connection 
} from 'reactflow';
import { 
  getGraph, 
  createNode as apiCreateNode, 
  updateNode as apiUpdateNode, 
  deleteNode as apiDeleteNode,
  createLink as apiCreateLink,
  deleteLink as apiDeleteLink,
  NodeData,
  NodeType,
  NodeCreatePayload,
  getNodeTypes,
  getNode,
  getAllNodes,
} from '../services/api';

// Define a type for breadcrumb items
interface BreadcrumbItem {
  id: string;
  label: string;
}

interface GraphContextProps {
  nodes: Node<NodeData>[];
  edges: Edge[];
  nodeTypes: NodeType[];
  currentParentId: string | null;
  isLoading: boolean;
  error: string | null;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  navigateToSubgraph: (parentId: string, parentLabel: string) => void;
  navigateUp: () => void;
  addNode: (type: string, label: string, position: { x: number; y: number }, description?: string) => Promise<Node<NodeData> | null>;
  updateNode: (id: string, updates: Partial<NodeCreatePayload>) => Promise<boolean>;
  deleteNode: (id: string) => Promise<boolean>;
  createNodeLink: (sourceId: string, targetId: string, label?: string) => Promise<Edge | null>;
  deleteNodeLink: (id: string) => Promise<boolean>;
  loadNodeTypes: () => Promise<void>;
  createNodeType: (name: string, color: string) => Promise<void>;
  breadcrumbs: BreadcrumbItem[];
  getAllNodesAcrossGraphs: () => Promise<Node<NodeData>[]>;
}

interface GraphProviderProps {
  children: ReactNode;
}

// Create the context
const GraphContext = createContext<GraphContextProps | undefined>(undefined);

// Custom hook to use the graph context
export const useGraph = () => {
  const context = useContext(GraphContext);
  if (context === undefined) {
    throw new Error('useGraph must be used within a GraphProvider');
  }
  return context;
};

// Provider component to wrap around components that need graph state
export const GraphProvider = ({ children }: GraphProviderProps) => {
  const [nodes, setNodes] = useState<Node<NodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [nodeTypes, setNodeTypes] = useState<NodeType[]>([]);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load graph data when component mounts or parentId changes
  const loadGraph = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getGraph(currentParentId || undefined);
      if (response.success && response.data) {
        // Remove parentNode properties for nodes in a subgraph view to avoid ReactFlow parent-child errors
        const processedNodes = currentParentId 
          ? response.data.nodes.map(node => ({
              ...node,
              parentNode: undefined // Remove parentNode property in subgraph view
            }))
          : response.data.nodes;
          
        setNodes(processedNodes);
        setEdges(response.data.edges);
      } else {
        setError(response.error || 'Failed to load graph data');
      }
    } catch (err) {
      console.error('Error loading graph:', err);
      setError('Error loading graph data');
    } finally {
      setIsLoading(false);
    }
  }, [currentParentId]);

  // Load node types
  const loadNodeTypes = useCallback(async () => {
    try {
      const response = await getNodeTypes();
      if (response.success && response.data) {
        setNodeTypes(response.data);
      }
    } catch (err) {
      console.error('Error loading node types:', err);
    }
  }, []);

  // Function to get all nodes across all graphs
  const getAllNodesAcrossGraphs = useCallback(async () => {
    try {
      const response = await getAllNodes();
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (err) {
      console.error('Error loading all nodes:', err);
      return [];
    }
  }, []);

  // Handle nodes changes (position, selection, etc.)
  const onNodesChange: OnNodesChange = useCallback(
    async (changes) => {
      // First apply changes to the UI for immediate feedback
      setNodes((prevNodes) => applyNodeChanges(changes, prevNodes));
      
      // Then update position in backend for any position changes (not for selection changes)
      const positionChanges = changes.filter(
        change => change.type === 'position' && change.position && change.id
      );
      
      // Batch position updates to avoid excessive API calls
      if (positionChanges.length > 0) {
        // Use a small delay to batch updates when nodes are being dragged
        const updatePositions = async () => {
          for (const change of positionChanges) {
            if (change.type === 'position' && change.position && change.id) {
              try {
                await apiUpdateNode(change.id as string, {
                  position: change.position
                });
              } catch (err) {
                console.error(`Error updating position for node ${change.id}:`, err);
              }
            }
          }
        };
        
        // Execute position updates
        updatePositions();
      }
    },
    []
  );

  // Handle edges changes
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setEdges((prevEdges) => applyEdgeChanges(changes, prevEdges));
    },
    []
  );

  // Handle connecting nodes
  const onConnect: OnConnect = useCallback(
    async (connection) => {
      try {
        if (connection.source && connection.target) {
          // First create the link in the backend
          const response = await apiCreateLink({
            source_id: connection.source,
            target_id: connection.target
          });

          if (response.success && response.data) {
            // Then add the edge to the UI with the correct ID from the backend
            setEdges((prevEdges) => addEdge({
              ...connection,
              id: response.data ? response.data.id : '', // Use the ID from the backend if available
              data: { id: response.data?.id || '' }, // Store the real ID in the data for deletion
              type: 'custom',
              animated: false,
            }, prevEdges));
          }
        }
      } catch (err) {
        console.error('Error creating link:', err);
        // If API call fails, reload the graph to get the accurate state
        loadGraph();
      }
    },
    [loadGraph]
  );

  // Navigate to a subgraph
  const navigateToSubgraph = useCallback((parentId: string, parentLabel: string) => {
    setBreadcrumbs(prev => [...prev, { id: parentId, label: parentLabel }]);
    setCurrentParentId(parentId);
  }, []);

  // Navigate up one level in the hierarchy
  const navigateUp = useCallback(() => {
    if (breadcrumbs.length === 0) {
      setCurrentParentId(null);
      return;
    }

    // Remove the current parent from the stack and set the new current parent to the previous item
    const newBreadcrumbs = [...breadcrumbs];
    newBreadcrumbs.pop();
    setBreadcrumbs(newBreadcrumbs);
    setCurrentParentId(newBreadcrumbs.length > 0 ? newBreadcrumbs[newBreadcrumbs.length - 1].id : null);
  }, [breadcrumbs]);

  // Add a new node
  const addNode = useCallback(
    async (type: string, label: string, position: { x: number; y: number }, description?: string, tags?: string[]): Promise<Node<NodeData> | null> => {
      try {
        console.log(`Adding node with parent_id: ${currentParentId}`);
        
        // Create the node in the backend
        const response = await apiCreateNode({
          type_id: type,
          label,
          description,
          position,
          parent_id: currentParentId,
          tags // Include tags in node creation
        });

        if (response.success && response.data) {
          console.log(`Node created successfully: ${JSON.stringify(response.data)}`);
          const newNode = response.data;
          
          // For nodes in subgraphs, ReactFlow needs the parent node to be in the same graph instance
          // Create a node without the parentNode property for ReactFlow's rendering
          const nodeForReactFlow = {
            ...newNode,
            // Remove parentNode property when we're in a subgraph view to avoid ReactFlow parent-child errors
            parentNode: undefined  
          };
          
          setNodes((prevNodes) => [...prevNodes, nodeForReactFlow]);
          return newNode;
        } else {
          // Display the error from the API if available
          const errorMessage = response.error || 'Failed to create node';
          console.error(`Error from API: ${errorMessage}`);
          setError(errorMessage);
          return null;
        }
      } catch (err) {
        console.error('Error adding node:', err);
        setError('Error creating node. Please try again.');
        return null;
      }
    },
    [currentParentId, setError]
  );

  // Update a node
  const updateNode = useCallback(
    async (id: string, updates: Partial<NodeCreatePayload>): Promise<boolean> => {
      try {
        const response = await apiUpdateNode(id, updates);
        if (response.success && response.data) {
          setNodes((prevNodes) =>
            prevNodes.map((node) =>
              node.id === id ? { ...node, ...response.data } : node
            )
          );
          return true;
        }
        return false;
      } catch (err) {
        console.error(`Error updating node ${id}:`, err);
        return false;
      }
    },
    []
  );

  // Delete a node
  const deleteNode = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const response = await apiDeleteNode(id);
        if (response.success) {
          setNodes((prevNodes) => prevNodes.filter((node) => node.id !== id));
          // Also remove any edges connected to this node
          setEdges((prevEdges) =>
            prevEdges.filter(
              (edge) => edge.source !== id && edge.target !== id
            )
          );
          return true;
        }
        return false;
      } catch (err) {
        console.error(`Error deleting node ${id}:`, err);
        return false;
      }
    },
    []
  );

  // Create a link between nodes
  const createNodeLink = useCallback(
    async (sourceId: string, targetId: string, label?: string): Promise<Edge | null> => {
      try {
        const response = await apiCreateLink({
          source_id: sourceId,
          target_id: targetId,
          label
        });

        if (response.success && response.data) {
          const newEdge = response.data;
          setEdges((prevEdges) => [...prevEdges, newEdge]);
          return newEdge;
        }
        return null;
      } catch (err) {
        console.error('Error creating link:', err);
        return null;
      }
    },
    []
  );

  // Delete a link
  const deleteNodeLink = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        // For links created by ReactFlow that have been automatically prefixed
        const actualId = id.startsWith('reactflow__edge-') ? 
          id.split('reactflow__edge-')[1] : id;

        console.log('Deleting link with ID:', actualId);
        
        const response = await apiDeleteLink(actualId);
        if (response.success) {
          setEdges((prevEdges) => prevEdges.filter((edge) => {
            // Check both the edge ID and the ID stored in data
            return edge.id !== id && (edge.data?.id !== actualId);
          }));
          return true;
        }
        return false;
      } catch (err) {
        console.error(`Error deleting link ${id}:`, err);
        return false;
      }
    },
    []
  );

  // Create a new node type
  const createNodeType = useCallback(
    async (name: string, color: string): Promise<void> => {
      try {
        const response = await getNodeTypes();
        if (response.success && response.data) {
          setNodeTypes((prevTypes) => [...prevTypes, { id: name.toLowerCase().replace(/\s+/g, '-'), name, color }]);
        }
      } catch (err) {
        console.error('Error creating node type:', err);
      }
    },
    []
  );

  // Effect to load graph data when currentParentId changes
  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  // Load node types when component mounts
  useEffect(() => {
    loadNodeTypes();
  }, [loadNodeTypes]);

  const value = {
    nodes,
    edges,
    nodeTypes,
    currentParentId,
    isLoading,
    error,
    onNodesChange,
    onEdgesChange,
    onConnect,
    navigateToSubgraph,
    navigateUp,
    addNode,
    updateNode,
    deleteNode,
    createNodeLink,
    deleteNodeLink,
    loadNodeTypes,
    createNodeType,
    breadcrumbs,
    getAllNodesAcrossGraphs
  };

  return <GraphContext.Provider value={value}>{children}</GraphContext.Provider>;
};

export default GraphContext;