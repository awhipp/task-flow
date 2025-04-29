import React, { useState, useEffect } from 'react';
import { createNodeType, getNodeTypes, NodeType } from '../services/api';
import { useGraph } from '../contexts/GraphContext';

interface NodeTypeManagerProps {
  onClose: () => void;
}

const NodeTypeManager: React.FC<NodeTypeManagerProps> = ({ onClose }) => {
  const { loadNodeTypes } = useGraph();
  const [nodeTypes, setNodeTypes] = useState<NodeType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newType, setNewType] = useState({ name: '', color: '#3498db' });

  // Load existing node types when component mounts
  useEffect(() => {
    const fetchNodeTypes = async () => {
      setIsLoading(true);
      try {
        const response = await getNodeTypes();
        if (response.success && response.data) {
          setNodeTypes(response.data);
        } else {
          setError(response.error || 'Failed to load node types');
        }
      } catch (err) {
        setError('Error fetching node types');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNodeTypes();
  }, []);

  // Handle creating a new node type
  const handleCreateNodeType = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newType.name.trim()) {
      setError('Type name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await createNodeType(newType.name, newType.color);
      if (response.success && response.data) {
        setNodeTypes([...nodeTypes, response.data]);
        setNewType({ name: '', color: '#3498db' });
        
        // Refresh node types in the graph context
        await loadNodeTypes();
      } else {
        setError(response.error || 'Failed to create node type');
      }
    } catch (err) {
      setError('Error creating node type');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="node-type-manager">
      <div className="manager-header">
        <h2>Manage Node Types</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="existing-types">
        <h3>Existing Types</h3>
        {isLoading ? (
          <div className="loading">Loading...</div>
        ) : (
          <div className="type-list">
            {nodeTypes.length === 0 ? (
              <p>No node types defined yet.</p>
            ) : (
              <ul>
                {nodeTypes.map(type => (
                  <li key={type.id} className="type-item">
                    <div
                      className="color-preview"
                      style={{ backgroundColor: type.color }}
                    ></div>
                    <span>{type.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="create-type">
        <h3>Create New Type</h3>
        <form onSubmit={handleCreateNodeType}>
          <div className="form-group">
            <label htmlFor="typeName">Name:</label>
            <input
              id="typeName"
              type="text"
              value={newType.name}
              onChange={(e) => setNewType({ ...newType, name: e.target.value })}
              placeholder="Type name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="typeColor">Color:</label>
            <input
              id="typeColor"
              type="color"
              value={newType.color}
              onChange={(e) => setNewType({ ...newType, color: e.target.value })}
            />
          </div>

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Type'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NodeTypeManager;