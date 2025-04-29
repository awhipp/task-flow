import { FastifyInstance } from 'fastify';
import db from '../db/config';
import { 
  Node, Link, NodeType, 
  createNode, createLink, createNodeType,
  toReactFlowNode, toReactFlowEdge
} from '../models/node';
import { v4 as uuidv4 } from 'uuid';

// Register all node-related routes
export default async function nodeRoutes(fastify: FastifyInstance) {
  // Get all node types
  fastify.get('/api/node-types', async (request, reply) => {
    try {
      const types = await db('node_types').select('*');
      return { success: true, data: types };
    } catch (error) {
      console.error('Error fetching node types:', error);
      return reply.status(500).send({ success: false, error: 'Internal server error' });
    }
  });

  // Create a new node type
  fastify.post<{ Body: Omit<NodeType, 'id'> }>('/api/node-types', async (request, reply) => {
    try {
      const { name, color } = request.body;
      const newNodeType = createNodeType(name, color);
      
      await db('node_types').insert(newNodeType);
      return { success: true, data: newNodeType };
    } catch (error) {
      console.error('Error creating node type:', error);
      return reply.status(500).send({ success: false, error: 'Internal server error' });
    }
  });

  // Get all nodes and optionally filter by parent ID
  fastify.get<{ Querystring: { parentId?: string } }>('/api/nodes', async (request, reply) => {
    try {
      const { parentId } = request.query;
      let query = db('nodes').select('*');
      
      if (parentId) {
        query = query.where('parent_id', parentId);
      } else {
        // If no parent ID provided, get top-level nodes (null parent_id)
        query = query.whereNull('parent_id');
      }
      
      const nodes = await query;
      const nodeTypes = await db('node_types').select('*');
      
      // Convert to ReactFlow format
      const reactFlowNodes = nodes.map(node => {
        const nodeType = nodeTypes.find(type => type.id === node.type_id);
        return toReactFlowNode(node, nodeType);
      });
      
      return { success: true, data: reactFlowNodes };
    } catch (error) {
      console.error('Error fetching nodes:', error);
      return reply.status(500).send({ success: false, error: 'Internal server error' });
    }
  });

  // Get all nodes across all graphs
  fastify.get('/api/nodes/all', async (request, reply) => {
    try {
      // Get all nodes regardless of parent_id
      const nodes = await db('nodes').select('*');
      const nodeTypes = await db('node_types').select('*');
      
      // Convert to ReactFlow format with parent information
      const reactFlowNodes = await Promise.all(nodes.map(async node => {
        const nodeType = nodeTypes.find(type => type.id === node.type_id);
        const reactFlowNode = toReactFlowNode(node, nodeType);
        
        // If node has a parent, get the parent info for additional context
        if (node.parent_id) {
          const parentNode = await db('nodes').where('id', node.parent_id).first();
          if (parentNode) {
            reactFlowNode.data.parentName = parentNode.label;
          }
        }
        
        return reactFlowNode;
      }));
      
      return { success: true, data: reactFlowNodes };
    } catch (error) {
      console.error('Error fetching all nodes:', error);
      return reply.status(500).send({ success: false, error: 'Internal server error' });
    }
  });

  // Get a specific node by ID
  fastify.get<{ Params: { id: string } }>('/api/nodes/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const node = await db('nodes').where('id', id).first();
      
      if (!node) {
        return reply.status(404).send({ success: false, error: 'Node not found' });
      }
      
      const nodeType = await db('node_types').where('id', node.type_id).first();
      const reactFlowNode = toReactFlowNode(node, nodeType);
      
      return { success: true, data: reactFlowNode };
    } catch (error) {
      console.error('Error fetching node:', error);
      return reply.status(500).send({ success: false, error: 'Internal server error' });
    }
  });

  // Create a new node
  fastify.post<{ Body: Omit<Node, 'id' | 'created_at' | 'updated_at'> }>('/api/nodes', async (request, reply) => {
    try {
      const { type_id, label, description, parent_id, position, tags, data } = request.body;
      
      console.log(`Creating node with parent_id: ${parent_id}`);
      
      // Validate that the parent node exists if a parent_id is provided
      if (parent_id) {
        console.log(`Checking if parent node ${parent_id} exists`);
        const parentNode = await db('nodes').where('id', parent_id).first();
        if (!parentNode) {
          console.log(`Parent node ${parent_id} not found`);
          return reply.status(400).send({ 
            success: false, 
            error: `Parent node with ID ${parent_id} not found` 
          });
        }
        console.log(`Parent node ${parent_id} found: ${parentNode.label}`);
      }
      
      const newNode = createNode(
        type_id,
        label,
        position,
        parent_id,
        description,
        tags, // Added tags parameter
        data
      );
      
      // For database storage, position and tags need to be JSON strings
      const nodeToInsert = {
        ...newNode,
        position: JSON.stringify(position),
        tags: tags ? JSON.stringify(tags) : null, // Store tags as JSON string
        data: data ? JSON.stringify(data) : null
      };
      
      console.log(`Inserting node with ID ${newNode.id} and parent_id ${newNode.parent_id}`);
      await db('nodes').insert(nodeToInsert);
      
      const nodeType = await db('node_types').where('id', type_id).first();
      const reactFlowNode = toReactFlowNode(newNode, nodeType);
      
      console.log(`Successfully created node: ${JSON.stringify(reactFlowNode)}`);
      return { success: true, data: reactFlowNode };
    } catch (error) {
      console.error('Error creating node:', error);
      return reply.status(500).send({ success: false, error: 'Internal server error' });
    }
  });

  // Update a node
  fastify.put<{ Params: { id: string }, Body: Partial<Node> }>('/api/nodes/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const updates = request.body;
      
      // Check if the node exists
      const node = await db('nodes').where('id', id).first();
      if (!node) {
        return reply.status(404).send({ success: false, error: 'Node not found' });
      }
      
      // Prepare updates - stringify position, tags, and data objects
      const updateData: any = { ...updates };
      if (updateData.position) {
        updateData.position = typeof updateData.position === 'string' 
          ? updateData.position 
          : JSON.stringify(updateData.position);
      }
      if (updateData.tags) {
        updateData.tags = typeof updateData.tags === 'string'
          ? updateData.tags
          : JSON.stringify(updateData.tags);
      }
      if (updateData.data) {
        updateData.data = typeof updateData.data === 'string'
          ? updateData.data
          : JSON.stringify(updateData.data);
      }
      
      await db('nodes').where('id', id).update(updateData);
      
      // Get the updated node
      const updatedNode = await db('nodes').where('id', id).first();
      const nodeType = await db('node_types').where('id', updatedNode.type_id).first();
      const reactFlowNode = toReactFlowNode(updatedNode, nodeType);
      
      return { success: true, data: reactFlowNode };
    } catch (error) {
      console.error('Error updating node:', error);
      return reply.status(500).send({ success: false, error: 'Internal server error' });
    }
  });

  // Delete a node
  fastify.delete<{ Params: { id: string } }>('/api/nodes/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      // First, check if node exists
      const node = await db('nodes').where('id', id).first();
      if (!node) {
        return reply.status(404).send({ success: false, error: 'Node not found' });
      }
      
      console.log(`Deleting node with ID: ${id}`);
      
      // Begin transaction to delete node and related links
      try {
        await db.transaction(async trx => {
          // Delete all links connected to this node
          await trx('links')
            .where('source_id', id)
            .orWhere('target_id', id)
            .delete();
          
          // Delete all child nodes (recursive deletion)
          const childNodes = await trx('nodes').where('parent_id', id).select('id');
          for (const child of childNodes) {
            // This is a simplified approach - a proper recursive deletion would be more complex
            await trx('links')
              .where('source_id', child.id)
              .orWhere('target_id', child.id)
              .delete();
            await trx('nodes').where('id', child.id).delete();
          }
          
          // Delete the node itself
          await trx('nodes').where('id', id).delete();
        });
        
        return { success: true, message: 'Node and related data deleted successfully' };
      } catch (transactionError) {
        console.error('Transaction error while deleting node:', transactionError);
        return reply.status(500).send({ success: false, error: 'Failed to delete node and related data' });
      }
    } catch (error) {
      console.error('Error deleting node:', error);
      return reply.status(500).send({ success: false, error: 'Internal server error' });
    }
  });

  // Get all links
  fastify.get('/api/links', async (request, reply) => {
    try {
      const links = await db('links').select('*');
      const reactFlowEdges = links.map(link => toReactFlowEdge(link));
      return { success: true, data: reactFlowEdges };
    } catch (error) {
      console.error('Error fetching links:', error);
      return reply.status(500).send({ success: false, error: 'Internal server error' });
    }
  });

  // Create a new link between nodes
  fastify.post<{ Body: Omit<Link, 'id' | 'created_at' | 'updated_at'> }>('/api/links', async (request, reply) => {
    try {
      const { source_id, target_id, label, type, data } = request.body;
      
      // Validate that both source and target nodes exist
      const sourceNode = await db('nodes').where('id', source_id).first();
      const targetNode = await db('nodes').where('id', target_id).first();
      
      if (!sourceNode || !targetNode) {
        return reply.status(400).send({ 
          success: false, 
          error: 'Source or target node does not exist' 
        });
      }
      
      const newLink = createLink(source_id, target_id, label, type, data);
      
      // For database storage, data needs to be JSON string
      const linkToInsert = {
        ...newLink,
        data: data ? JSON.stringify(data) : null
      };
      
      await db('links').insert(linkToInsert);
      
      const reactFlowEdge = toReactFlowEdge(newLink);
      return { success: true, data: reactFlowEdge };
    } catch (error) {
      console.error('Error creating link:', error);
      return reply.status(500).send({ success: false, error: 'Internal server error' });
    }
  });

  // Delete a link
  fastify.delete<{ Params: { id: string } }>('/api/links/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      console.log(`Attempting to delete link with ID: ${id}`);
      
      // Check if the link exists
      const link = await db('links').where('id', id).first();
      if (!link) {
        console.log(`Link with ID ${id} not found`);
        return reply.status(404).send({ success: false, error: 'Link not found' });
      }
      
      console.log(`Found link: ${JSON.stringify(link)}, proceeding with deletion`);
      
      try {
        const deleteCount = await db('links').where('id', id).delete();
        console.log(`Deleted ${deleteCount} links with ID ${id}`);
        
        if (deleteCount === 0) {
          return reply.status(500).send({ success: false, error: 'Failed to delete link' });
        }
        
        return { success: true, message: 'Link deleted successfully' };
      } catch (deleteError) {
        console.error(`Error during link deletion: ${deleteError}`);
        return reply.status(500).send({ success: false, error: 'Error during link deletion' });
      }
    } catch (error) {
      console.error('Error deleting link:', error);
      return reply.status(500).send({ success: false, error: 'Internal server error' });
    }
  });

  // Get full graph including nodes and links (optionally filtered by parent)
  fastify.get<{ Querystring: { parentId?: string } }>('/api/graph', async (request, reply) => {
    try {
      const { parentId } = request.query;
      
      // Get nodes based on parent filter
      let nodesQuery = db('nodes').select('*');
      if (parentId) {
        nodesQuery = nodesQuery.where('parent_id', parentId);
      } else {
        // If no parent ID provided, get top-level nodes
        nodesQuery = nodesQuery.whereNull('parent_id');
      }
      
      const nodes = await nodesQuery;
      const nodeIds = nodes.map(node => node.id);
      
      // Get all node types for reference
      const nodeTypes = await db('node_types').select('*');
      
      // Get links connected to these nodes
      const links = await db('links')
        .whereIn('source_id', nodeIds)
        .orWhereIn('target_id', nodeIds)
        .select('*');
      
      // Convert to ReactFlow format
      const reactFlowNodes = nodes.map(node => {
        const nodeType = nodeTypes.find(type => type.id === node.type_id);
        return toReactFlowNode(node, nodeType);
      });
      
      const reactFlowEdges = links.map(link => toReactFlowEdge(link));
      
      return { 
        success: true, 
        data: { 
          nodes: reactFlowNodes, 
          edges: reactFlowEdges 
        } 
      };
    } catch (error) {
      console.error('Error fetching graph:', error);
      return reply.status(500).send({ success: false, error: 'Internal server error' });
    }
  });
}