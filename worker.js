export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Explicitly check if the D1 database binding exists
    if (!env || !env.DB) {
      return new Response(JSON.stringify({ 
        error: "Database binding 'DB' is missing. Check wrangler.toml and wrangler deploy." 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const url = new URL(request.url);

      // 1. GET all messages
      if (url.pathname === "/api/messages" && request.method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT * FROM messages ORDER BY datetime(created_at) ASC"
        ).all();

        return new Response(JSON.stringify(results || []), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. POST a new message
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

      // 3. DELETE a message
      if (url.pathname.startsWith("/api/messages/") && request.method === "DELETE") {
        const id = url.pathname.split("/").pop();
        await env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(id).run();
        return new Response(JSON.stringify({ message: "Message deleted successfully" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response("Capybara Science Cloudflare Backend is running!", {
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
