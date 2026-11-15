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

    // Safety check for DB binding
    if (!env || !env.DB) {
      return new Response(JSON.stringify({ error: "Database binding DB is missing." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const url = new URL(request.url);

      // GET all messages
      if (url.pathname === "/api/messages" && request.method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT * FROM messages ORDER BY datetime(created_at) ASC"
        ).all();

        return new Response(JSON.stringify(results || []), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // POST a new message
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

      // UPDATE user profile metadata across all their messages
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
          `UPDATE messages 
           SET username = ?, avatar_url = ?, frame_url = ?, effect_url = ? 
           WHERE user_id = ?`
        ).bind(
          username || "Anonymous",
          avatar_url || null,
          frame_url || null,
          effect_url || null,
          user_id
        ).run();

        return new Response(JSON.stringify({ success: true, message: "Profile updated across messages" }), {
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
