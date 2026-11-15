export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (!env || !env.DB) {
      return new Response(JSON.stringify({ error: "Database binding DB is missing." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const url = new URL(request.url);

      // GET all messages with their latest profile overrides
      if (url.pathname === "/api/messages" && request.method === "GET") {
        const { results } = await env.DB.prepare(
          `SELECT m.*, 
                  COALESCE(p.username, m.username) as username,
                  COALESCE(p.avatar_url, m.avatar_url) as avatar_url,
                  COALESCE(p.frame_url, m.frame_url) as frame_url,
                  COALESCE(p.effect_url, m.effect_url) as effect_url
           FROM messages m
           LEFT JOIN profiles p ON m.user_id = p.user_id
           ORDER BY datetime(m.created_at) ASC`
        ).all();

        return new Response(JSON.stringify(results || []), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // POST a new message (snapshots profile at time of sending)
      if (url.pathname === "/api/messages" && request.method === "POST") {
        const body = await request.json();
        const id = Date.now().toString();
        const {
          username,
          content,
          image_url,
          user_id,
          avatar_url,
          frame_url,
          effect_url,
          reply_to
        } = body;

        await env.DB.prepare(
          `INSERT INTO messages (id, username, content, image_url, user_id, avatar_url, frame_url, effect_url, reply_to) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          id,
          username || "Anonymous",
          content || "",
          image_url || null,
          user_id || null,
          avatar_url || null,
          frame_url || null,
          effect_url || null,
          reply_to ? JSON.stringify(reply_to) : null
        ).run();

        const { results } = await env.DB.prepare("SELECT * FROM messages WHERE id = ?").bind(id).all();
        return new Response(JSON.stringify(results[0] || { success: true }), {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // UPDATE user profile in the dedicated profiles table (No message overwriting!)
      if (url.pathname === "/api/profile" && request.method === "PUT") {
        const body = await request.json();
        const { user_id, username, avatar_url, frame_url, effect_url } = body;

        if (!user_id) {
          return new Response(JSON.stringify({ error: "user_id is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await env.DB.prepare(
          `INSERT INTO profiles (user_id, username, avatar_url, frame_url, effect_url, updated_at) 
           VALUES (?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(user_id) DO UPDATE SET 
             username = excluded.username,
             avatar_url = excluded.avatar_url,
             frame_url = excluded.frame_url,
             effect_url = excluded.effect_url,
             updated_at = datetime('now')`
        ).bind(
          user_id,
          username || "Anonymous",
          avatar_url || null,
          frame_url || null,
          effect_url || null
        ).run();

        return new Response(JSON.stringify({ success: true, message: "Profile updated successfully" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // DELETE a message
      if (url.pathname.startsWith("/api/messages/") && request.method === "DELETE") {
        const id = url.pathname.split("/").pop();
        await env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(id).run();
        return new Response(JSON.stringify({ message: "Deleted successfully" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response("Capybara Worker is online!", {
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
