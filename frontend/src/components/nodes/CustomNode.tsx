import React, { useState, memo } from 'react';
import { Handle, Position, NodeProps, NodeToolbar } from 'reactflow';
import { NodeData } from '../../services/api';
import { useGraph } from '../../contexts/GraphContext';

// Calculate a contrasting text color based on background color
const getContrastColor = (hexColor: string): string => {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Calculate luminance - a formula to determine if background is light or dark
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light backgrounds, white for dark backgrounds
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

// Get a complementary color for tags based on the node type color
const getComplementaryColor = (hexColor: string): string => {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Create a complementary color (not exactly opposite but visually distinct)
  const newR = (r + 80) % 256;
  const newG = (g + 120) % 256;
  const newB = (b + 160) % 256;
  
  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

// Custom node component with styling and interaction features
const CustomNode = ({ id, data, selected }: NodeProps<NodeData>) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const [description, setDescription] = useState(data.description || '');
  
  // Ensure tags are properly initialized from data
  const [tags, setTags] = useState<string[]>(() => {
    // Handle different possible formats of tags coming from the database
    if (data.tags && Array.isArray(data.tags)) {
      return data.tags;
    } else if (data.tags && typeof data.tags === 'string') {
      try {
        // Attempt to parse if it's a JSON string
        const parsed = JSON.parse(data.tags);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  
  const [newTag, setNewTag] = useState('');
  
  const { navigateToSubgraph, updateNode, deleteNode } = useGraph();
  
  // Handle adding a new tag
  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      const updatedTags = [...tags, newTag];
      setTags(updatedTags);
      setNewTag('');
    }
  };
  
  // Handle removing a tag
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  // Handle saving changes to node label, description, and tags
  const handleSave = async () => {
    const success = await updateNode(id, { 
      label, 
      description,
      tags,
    });
    
    if (success) {
      setIsEditing(false);
    }
  };
  
  // Handle opening the subgraph view
  const handleOpenSubgraph = () => {
    navigateToSubgraph(id, data.label);
  };
  
  // Handle deleting the node
  const handleDelete = async () => {
    // Confirm before deleting
    if (window.confirm(`Are you sure you want to delete "${data.label}"? This will also delete all child nodes and connections.`)) {
      await deleteNode(id);
    }
  };
  
  // Determine colors
  const backgroundColor = '#ffffff'; // White background for better readability
  const nodeTypeColor = data.color || '#3498db'; 
  const tagColor = getComplementaryColor(nodeTypeColor);
  const nodeTypeBorderColor = nodeTypeColor;
  const nodeBorderColor = selected ? '#1a192b' : '#e0e0e0';
  
  // Determine text colors with good contrast
  const nodeTypeTextColor = getContrastColor(nodeTypeColor);
  const tagTextColor = getContrastColor(tagColor);
  
  return (
    <>
      {/* Input handle at the top */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#555' }}
      />
      
      {/* Node toolbar with actions */}
      <NodeToolbar isVisible={selected} position={Position.Top}>
        <div className="node-toolbar">
          {!isEditing ? (
            <>
              <button onClick={() => setIsEditing(true)}>Edit</button>
              <button onClick={handleOpenSubgraph}>Open Subgraph</button>
              <button onClick={handleDelete}>Delete</button>
            </>
          ) : (
            <>
              <button onClick={handleSave}>Save</button>
              <button onClick={() => setIsEditing(false)}>Cancel</button>
            </>
          )}
        </div>
      </NodeToolbar>
      
      {/* Node content */}
      <div
        className="custom-node"
        style={{
          backgroundColor,
          borderColor: nodeBorderColor,
          padding: '12px',
          borderRadius: '6px',
          borderWidth: '2px',
          borderStyle: 'solid',
          width: '240px',
          fontSize: '12px',
          boxShadow: selected ? '0 0 10px rgba(0, 0, 0, 0.2)' : '0 2px 5px rgba(0, 0, 0, 0.1)',
        }}
      >
        {isEditing ? (
          <div className="node-edit-form">
            {/* Node name edit */}
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="node-edit-label"
              style={{
                width: '95%',
                marginBottom: '8px',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            />
            
            {/* Description edit */}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              className="node-edit-description"
              style={{
                width: '95%',
                height: '60px',
                resize: 'none',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                marginBottom: '8px',
                fontSize: '12px'
              }}
            />
            
            {/* Tags edit */}
            <div className="tags-edit-section" style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', marginBottom: '4px' }}>
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Add tag"
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                />
                <button 
                  onClick={handleAddTag}
                  style={{
                    marginLeft: '4px',
                    padding: '4px 8px',
                    background: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Add
                </button>
              </div>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {tags.map(tag => (
                  <div 
                    key={tag} 
                    style={{
                      background: tagColor,
                      color: tagTextColor,
                      padding: '2px 6px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {tag}
                    <span 
                      onClick={() => handleRemoveTag(tag)}
                      style={{
                        marginLeft: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      ×
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Node name - Now at the top and highlighted */}
            <div
              className="custom-node-title"
              style={{
                fontWeight: 'bold',
                fontSize: '16px',
                marginBottom: '8px',
                color: '#2c3e50',
                borderBottom: '1px solid #eee',
                paddingBottom: '6px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {data.label}
            </div>
            
            {/* Description */}
            {data.description && (
              <div
                className="custom-node-description"
                style={{
                  fontSize: '12px',
                  color: '#555',
                  marginBottom: '8px',
                  maxHeight: '60px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {data.description}
              </div>
            )}
            
            {/* Node type - Now below the description with background color */}
            <div style={{ marginBottom: '8px' }}>
              <div
                className="custom-node-type"
                style={{
                  display: 'inline-block',
                  backgroundColor: nodeTypeColor,
                  color: nodeTypeTextColor,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  fontSize: '11px',
                  border: `1px solid ${nodeTypeBorderColor}`,
                }}
              >
                {data.nodeType}
              </div>
            </div>
            
            {/* Tags */}
            {(data.tags && data.tags.length > 0) && (
              <div
                className="custom-node-tags"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                  marginBottom: '6px',
                }}
              >
                {(Array.isArray(data.tags) ? data.tags : []).map((tag, index) => (
                  <div
                    key={index}
                    className="tag"
                    style={{
                      backgroundColor: tagColor,
                      color: tagTextColor,
                      padding: '2px 6px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: '500',
                    }}
                  >
                    {tag}
                  </div>
                ))}
              </div>
            )}
            
            {/* Navigation indicator */}
            <div
              className="node-subgraph-indicator"
              onClick={handleOpenSubgraph}
              style={{
                textAlign: 'center',
                fontSize: '11px',
                color: '#3498db',
                cursor: 'pointer',
                padding: '2px 0',
                borderTop: '1px solid #eee',
                marginTop: '4px',
              }}
            >
              {data.hasChildren ? 'View Subgraph →' : 'Open →'}
            </div>
          </>
        )}
      </div>
      
      {/* Output handle at the bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#555' }}
      />
    </>
  );
};

// Use React.memo to optimize rendering performance
export default memo(CustomNode);