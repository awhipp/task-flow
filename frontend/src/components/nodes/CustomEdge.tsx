import React from 'react';
import {
  BaseEdge,
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  useReactFlow,
} from 'reactflow';
import { useGraph } from '../../contexts/GraphContext';

const CustomEdge = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  data,
}: EdgeProps) => {
  const { deleteNodeLink } = useGraph();
  const reactFlowInstance = useReactFlow();
  
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Handle edge deletion
  const onEdgeClick = (evt: React.MouseEvent, edgeId: string) => {
    evt.stopPropagation();
    
    // Extract the actual link ID from the edge data if it exists
    // ReactFlow prefixes edge IDs with "reactflow__edge-" when they're created via the UI
    const actualId = data?.id || edgeId;
    
    if (window.confirm('Are you sure you want to delete this connection?')) {
      deleteNodeLink(actualId);
    }
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 12,
              pointerEvents: 'all',
              backgroundColor: 'white',
              padding: '2px 4px',
              borderRadius: 4,
              border: '1px solid #ccc',
            }}
            className="edge-label"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
      {/* Invisible wider path for better click interaction */}
      <path
        d={edgePath}
        fill="none"
        strokeWidth={15}
        stroke="transparent"
        strokeOpacity={0}
        onClick={(event) => onEdgeClick(event, id)}
        style={{ cursor: 'pointer' }}
      />
      {/* Small delete button visible on hover */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY - 15}px)`,
            fontSize: 16,
            pointerEvents: 'all',
            background: '#ff5252',
            color: 'white',
            borderRadius: '50%',
            width: 20,
            height: 20,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            opacity: 0, // Hidden by default
            transition: 'opacity 0.3s',
          }}
          className="edge-delete-button"
          onClick={(event) => onEdgeClick(event, id)}
        >
          ×
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default CustomEdge;