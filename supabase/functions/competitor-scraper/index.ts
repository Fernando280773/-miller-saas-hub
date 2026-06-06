import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url, product_id, competitor_name } = await req.json();

    if (!url || !product_id || !competitor_name) {
      return new Response(JSON.stringify({ error: "Missing required fields: url, product_id, competitor_name" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // 1. Call Scraping API (JigsawStack) or fallback to mock
    let price = 24.99;
    const jigsawKey = Deno.env.get("JIGSAWSTACK_KEY");
    
    if (jigsawKey && jigsawKey !== "your_key_here") {
      const scrapeResp = await fetch("https://api.jigsawstack.com/v1/ai/scrape", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-api-key": jigsawKey
        },
        body: JSON.stringify({ url, element_prompts: ["price"] }),
      });
      const data = await scrapeResp.json();
      if (data && data.price) {
        price = parseFloat(data.price.replace(/[^0-9.]/g, ""));
      }
    } else {
      // Mock price fallback if no key is set
      price = Math.round((15 + Math.random() * 85) * 100) / 100;
    }

    // 2. Save to competitor_pricing table
    const { data: insertData, error: insertError } = await supabase
      .from("competitor_pricing")
      .insert({
        product_id,
        competitor_url: url,
        competitor_name,
        price,
        is_active: true
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, price, data: insertData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 400, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
