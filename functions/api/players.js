export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API route
    if (url.pathname === "/api/players") {
      try {
        let count = await env.STATS_KV.get("active_players");

        if (!count) count = "1248";

        const newCount = parseInt(count) + 1;
        await env.STATS_KV.put("active_players", newCount.toString());

        return new Response(JSON.stringify({ count: newCount }), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
        });
      }
    }

    // ✅ FIX: let everything else pass through normally
    return fetch(request);
  },
};
