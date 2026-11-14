export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Safety check for DB binding
      if (!env || !env.DB) {
        return new Response(JSON.stringify({ error: "DB binding is missing from env. Available keys: " + Object.keys(env || {}).join(", ") }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const url = new URL(request.url);

      if (url.pathname === "/api/chat" && request.method === "POST") {
        const body = await request.json();
        const userMessage = body.message;

        await env.DB.prepare(
          "INSERT INTO messages (content) VALUES (?)"
        ).bind(userMessage).run();

        const { results } = await env.DB.prepare(
          "SELECT * FROM messages ORDER BY id DESC LIMIT 10"
        ).all();

        return new Response(JSON.stringify({ success: true, messages: results }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response("Capybara Science Backend is running!", {
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