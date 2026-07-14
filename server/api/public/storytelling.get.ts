import { defineEventHandler } from 'h3'

export default defineEventHandler(async () => {
  const db = useDatabase()
  // Ensure the table exists before querying, just in case migration hasn't run yet
  try {
    const result = await db.sql`
      SELECT id, title, description, nodes_path, custom_messages
      FROM story_routes
      ORDER BY created_at DESC
    `
    const rows = result.rows || []
    
    return rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      nodes_path: row.nodes_path ? JSON.parse(row.nodes_path) : [],
      custom_messages: row.custom_messages ? JSON.parse(row.custom_messages) : {}
    }))
  } catch (e) {
    // If table doesn't exist, return empty array
    return []
  }
})
