import knex from 'knex';

// Create an in-memory SQLite database as specified in requirements
const db = knex({
  client: 'better-sqlite3',
  connection: {
    // filename: ':memory:' // In-memory SQLite database
    filename: './db.sqlite' // Persistent SQLite database file
  },
  useNullAsDefault: true
});

// Initialize the database schema
export const initializeDatabase = async () => {
  // Check if tables already exist to prevent re-creation errors
  const nodeTableExists = await db.schema.hasTable('nodes');
  const linkTableExists = await db.schema.hasTable('links');
  const typeTableExists = await db.schema.hasTable('node_types');

  // Create node_types table to store user-defined node types
  if (!typeTableExists) {
    await db.schema.createTable('node_types', table => {
      table.string('id').primary();
      table.string('name').notNullable();
      table.string('color').notNullable(); // For visual representation in the graph
      table.timestamps(true, true);
    });
  }

  // Create nodes table with self-referencing parent relationship for hierarchy
  if (!nodeTableExists) {
    await db.schema.createTable('nodes', table => {
      table.string('id').primary();
      table.string('type_id').references('id').inTable('node_types');
      table.string('label').notNullable();
      table.string('description').nullable();
      table.string('parent_id').references('id').inTable('nodes').nullable(); // For hierarchical relationships
      table.json('position').notNullable(); // Store x,y coordinates for the graph
      table.json('tags').nullable(); // Add tags array for node metadata
      table.json('data').nullable(); // Flexible additional data storage
      table.timestamps(true, true);
    });
  }

  // Create links table to represent connections between nodes
  if (!linkTableExists) {
    await db.schema.createTable('links', table => {
      table.string('id').primary();
      table.string('source_id').references('id').inTable('nodes').notNullable();
      table.string('target_id').references('id').inTable('nodes').notNullable();
      table.string('label').nullable();
      table.string('type').nullable(); // e.g., "dependency", "related", etc.
      table.json('data').nullable(); // Flexible additional data storage
      table.timestamps(true, true);
    });
  }

  // Insert some default node types if they don't exist
  const types = await db('node_types').select();
  // Check each type to see if it exists
    const typeIds = ['initiative', 'epic', 'task', 'subtask', 'design spec', 'proposal'];
    const existingTypes = await db('node_types').whereIn('id', typeIds).select('id');
    const existingTypeIds = existingTypes.map(type => type.id);
    const missingTypes = typeIds.filter(typeId => !existingTypeIds.includes(typeId));

    // If any types are missing, insert them
    if (missingTypes.length > 0) {
      const defaultTypes = [
        { id: 'initiative', name: 'Initiative', color: '#3F51B5' }, // Indigo
        { id: 'epic', name: 'Epic', color: '#673AB7' }, // Deep Purple
        { id: 'task', name: 'Task', color: '#2196F3' }, // Blue
        { id: 'subtask', name: 'Sub Task', color: '#00BCD4' }, // Cyan
        { id: 'design spec', name: 'Design Spec', color: '#009688' }, // Teal
        { id: 'proposal', name: 'Proposal', color: '#4CAF50' }, // Green
      ].filter(type => missingTypes.includes(type.id));

      // Insert the missing types into the node_types table

      await db('node_types').insert(defaultTypes);
    }
};

export default db;