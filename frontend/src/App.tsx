import { useState, useCallback } from 'react';
import ReactFlow, {
  Controls,
  Background,
  BackgroundVariant,
  NodeTypes,
  EdgeTypes,
  Panel,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css';
import CustomNode from './components/nodes/CustomNode';
import CustomEdge from './components/nodes/CustomEdge';
import { useGraph } from './contexts/GraphContext';
import { NodeType } from './services/api';
import NodeTypeManager from './components/NodeTypeManager';
import TableView from './components/table/TableView';

// Define custom node types outside of component to prevent re-creation on each render
const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

// Define custom edge types
const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

// View mode enum
enum ViewMode {
  GRAPH = 'graph',
  TABLE = 'table'
}

function App() {
  const {
    nodes,
    edges,
    nodeTypes: availableNodeTypes,
    currentParentId,
    isLoading,
    error,
    onNodesChange,
    onEdgesChange,
    onConnect,
    navigateUp,
    addNode,
    navigateToSubgraph,
    breadcrumbs,
  } = useGraph();

  const [nodeName, setNodeName] = useState('');
  const [nodeDescription, setNodeDescription] = useState('');
  const [nodeLink, setNodeLink] = useState('');
  const [selectedNodeType, setSelectedNodeType] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [showAddNodeForm, setShowAddNodeForm] = useState(false);
  const [showNodeTypeManager, setShowNodeTypeManager] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GRAPH);
  const reactFlowInstance = useReactFlow();

  // Function to handle adding a tag
  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  // Function to handle removing a tag
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Function to handle adding a new node
  const handleAddNode = useCallback(async () => {
    if (!nodeName || !selectedNodeType) return;

    // Find the center of the viewport
    const { x, y, zoom } = reactFlowInstance.getViewport();
    const centerX = (window.innerWidth / 2 - x) / zoom;
    const centerY = (window.innerHeight / 2 - y) / zoom;

    // Add the new node
    const nodeData = nodeLink ? { link: nodeLink } : undefined;
    
    await addNode(
      selectedNodeType,
      nodeName,
      { x: centerX, y: centerY },
      nodeDescription,
      tags.length > 0 ? tags : undefined,
      nodeData
    );

    // Reset form
    setNodeName('');
    setNodeDescription('');
    setNodeLink('');
    setTags([]);
    setShowAddNodeForm(false);
  }, [nodeName, nodeDescription, nodeLink, selectedNodeType, tags, addNode, reactFlowInstance]);

  // Function to handle node click in table view
  const handleNodeClick = useCallback((nodeId: string, label: string) => {
    navigateToSubgraph(nodeId, label);
  }, [navigateToSubgraph]);

  // Toggle between graph and table view
  const toggleViewMode = useCallback(() => {
    setViewMode(prev => prev === ViewMode.GRAPH ? ViewMode.TABLE : ViewMode.GRAPH);
  }, []);

  // Reset form fields
  const resetForm = () => {
    setNodeName('');
    setNodeDescription('');
    setNodeLink('');
    setSelectedNodeType('');
    setTags([]);
    setShowAddNodeForm(false);
  };

  return (
    <div className="app-container">
      {/* Header Bar */}
      <div className="main-header-bar">
        <h1>Task Flow</h1>
      </div>

      <div className="flow-container">
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
          </div>
        )}

        {error && (
          <div className="error-message">
            Error: {error}
          </div>
        )}

        {viewMode === ViewMode.GRAPH ? (
          <ReactFlow
            nodes={nodes.map(node => ({
              ...node,
              type: 'custom', // Use our custom node component for all nodes
            }))}
            edges={edges.map(edge => ({
              ...edge,
              type: 'custom', // Use our custom edge component for all edges
            }))}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
          >
            <Controls />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />

            <Panel position="top-left">
              <div className="breadcrumb-container">
                <div className="breadcrumb">
                  <button onClick={() => navigateUp()}>
                    {currentParentId ? 'Back to Parent' : 'Root'}
                  </button>
                  {breadcrumbs.length > 0 && (
                    <span className="breadcrumb-path">
                      / <span className="root">Root</span>
                      {breadcrumbs.map((item, index) => (
                        <span key={item.id}>
                          {' / '} 
                          <span className="breadcrumb-item">
                            {item.label}
                          </span>
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              </div>
            </Panel>

            <Panel position="top-right">
              <div className="node-actions">
                {!showAddNodeForm ? (
                  <div className="action-buttons">
                    <button onClick={() => setShowAddNodeForm(true)} className="add-node-btn">
                      + Add Node
                    </button>
                    <button onClick={() => setShowNodeTypeManager(true)} className="manage-types-btn">
                      Manage Node Types
                    </button>
                  </div>
                ) : (
                  <div className="add-node-form">
                    <select
                      value={selectedNodeType}
                      onChange={(e) => setSelectedNodeType(e.target.value)}
                      required
                    >
                      <option value="">Select Node Type</option>
                      {availableNodeTypes.map((type: NodeType) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Node Name"
                      value={nodeName}
                      onChange={(e) => setNodeName(e.target.value)}
                      required
                    />
                    <textarea
                      placeholder="Description (optional)"
                      value={nodeDescription}
                      onChange={(e) => setNodeDescription(e.target.value)}
                    />
                    
                    <input
                      type="text"
                      placeholder="Link URL (optional)"
                      value={nodeLink}
                      onChange={(e) => setNodeLink(e.target.value)}
                    />
                    
                    {/* Tags section */}
                    <div className="tags-section">
                      <div className="tag-input-container">
                        <input
                          type="text"
                          placeholder="Add tag (optional)"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                        />
                        <button 
                          onClick={handleAddTag}
                          className="tag-add-btn"
                        >
                          +
                        </button>
                      </div>
                      {tags.length > 0 && (
                        <div className="tags-list">
                          {tags.map(tag => (
                            <div key={tag} className="tag-item">
                              {tag}
                              <span 
                                onClick={() => handleRemoveTag(tag)}
                                className="tag-remove"
                              >
                                ×
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="form-actions">
                      <button onClick={handleAddNode}>Add</button>
                      <button onClick={resetForm}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          </ReactFlow>
        ) : (
          <div className="table-container">
            <div className="table-header">
              <div className="breadcrumb-container">
                <div className="breadcrumb">
                  <button onClick={() => navigateUp()}>
                    {currentParentId ? 'Back to Parent' : 'Root'}
                  </button>
                  {breadcrumbs.length > 0 && (
                    <span className="breadcrumb-path">
                      / <span className="root">Root</span>
                      {breadcrumbs.map((item, index) => (
                        <span key={item.id}>
                          {' / '} 
                          <span className="breadcrumb-item">
                            {item.label}
                          </span>
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              </div>
              <div className="node-actions">
                <div className="action-buttons">
                  <button onClick={() => setShowAddNodeForm(true)} className="add-node-btn">
                    + Add Node
                  </button>
                  <button onClick={() => setShowNodeTypeManager(true)} className="manage-types-btn">
                    Manage Node Types
                  </button>
                </div>
              </div>
            </div>
            
            <TableView onNodeClick={handleNodeClick} />
            
            {showAddNodeForm && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <div className="add-node-modal">
                    <div className="modal-header">
                      <h2>Add New Node</h2>
                      <button className="close-button" onClick={resetForm}>×</button>
                    </div>
                    <div className="add-node-form">
                      <select
                        value={selectedNodeType}
                        onChange={(e) => setSelectedNodeType(e.target.value)}
                        required
                      >
                        <option value="">Select Node Type</option>
                        {availableNodeTypes.map((type: NodeType) => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Node Name"
                        value={nodeName}
                        onChange={(e) => setNodeName(e.target.value)}
                        required
                      />
                      <textarea
                        placeholder="Description (optional)"
                        value={nodeDescription}
                        onChange={(e) => setNodeDescription(e.target.value)}
                      />
                      
                      <input
                        type="text"
                        placeholder="Link URL (optional)"
                        value={nodeLink}
                        onChange={(e) => setNodeLink(e.target.value)}
                      />
                      
                      {/* Tags section */}
                      <div className="tags-section">
                        <div className="tag-input-container">
                          <input
                            type="text"
                            placeholder="Add tag (optional)"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                          />
                          <button 
                            onClick={handleAddTag}
                            className="tag-add-btn"
                          >
                            +
                          </button>
                        </div>
                        {tags.length > 0 && (
                          <div className="tags-list">
                            {tags.map(tag => (
                              <div key={tag} className="tag-item">
                                {tag}
                                <span 
                                  onClick={() => handleRemoveTag(tag)}
                                  className="tag-remove"
                                >
                                  ×
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="form-actions">
                        <button onClick={handleAddNode}>Add</button>
                        <button onClick={resetForm}>Cancel</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* View Toggle Bar at bottom */}
      <div className="view-toggle-bar">
        <button 
          className={`view-toggle-btn ${viewMode === ViewMode.GRAPH ? 'active' : ''}`} 
          onClick={() => setViewMode(ViewMode.GRAPH)}
        >
          Graph View
        </button>
        <button 
          className={`view-toggle-btn ${viewMode === ViewMode.TABLE ? 'active' : ''}`} 
          onClick={() => setViewMode(ViewMode.TABLE)}
        >
          Table View
        </button>
      </div>

      {/* Node Type Manager Modal */}
      {showNodeTypeManager && (
        <div className="modal-overlay">
          <div className="modal-content">
            <NodeTypeManager onClose={() => setShowNodeTypeManager(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
