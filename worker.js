export default {
  async fetch(request, env, ctx) {
    // 1. Handle CORS so your Surge frontend can talk to this worker
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*", // Or replace with your exact "https://your-domain.surge.sh"
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);

      // 2. Handle a POST request for saving/retrieving chat messages
      if (url.pathname === "/api/chat" && request.method === "POST") {
        const body = await request.json();
        const userMessage = body.message;

        // Example D1 database insert query using your binding
        // (Make sure you have a table created in D1, e.g., messages)
        await env.DB.prepare(
          "INSERT INTO messages (content) VALUES (?)"
        ).bind(userMessage).run();

        // Fetch recent messages back
        const { results } = await env.DB.prepare(
          "SELECT * FROM messages ORDER BY id DESC LIMIT 10"
        ).all();

        return new Response(JSON.stringify({ success: true, messages: results }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Default fallback route
      return new Response("Capybara Science Backend is running!", {
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });

    } catch (err) {
      // Catch errors (like a 500 issue) and return the message for debugging
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
