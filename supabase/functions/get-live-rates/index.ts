import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CoinGeckoPrice {
  usd: number;
  usd_24h_change: number;
  usd_24h_vol: number;
  usd_market_cap: number;
}

interface CoinGeckoResponse {
  [key: string]: CoinGeckoPrice;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const cryptoIds = [
      'bitcoin',
      'ethereum',
      'tether',
      'binancecoin',
      'solana',
      'ripple',
      'cardano',
      'dogecoin',
      'tron',
      'litecoin'
    ];

    const coingeckoUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds.join(',')}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`;
    
    const response = await fetch(coingeckoUrl);
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data: CoinGeckoResponse = await response.json();

    const pairMapping: { [key: string]: string } = {
      'bitcoin': 'BTC-USD',
      'ethereum': 'ETH-USD',
      'tether': 'USDT-USD',
      'binancecoin': 'BNB-USD',
      'solana': 'SOL-USD',
      'ripple': 'XRP-USD',
      'cardano': 'ADA-USD',
      'dogecoin': 'DOGE-USD',
      'tron': 'TRX-USD',
      'litecoin': 'LTC-USD'
    };

    const updates = [];
    const historyInserts = [];

    for (const [coinId, priceData] of Object.entries(data)) {
      const pair = pairMapping[coinId];
      if (!pair) continue;

      const rateData = {
        pair,
        price: priceData.usd,
        price_change_24h: priceData.usd_24h_change || 0,
        volume_24h: priceData.usd_24h_vol || 0,
        high_24h: priceData.usd * 1.02,
        low_24h: priceData.usd * 0.98,
        market_cap: priceData.usd_market_cap || 0,
        last_updated: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from('exchange_rates')
        .upsert(rateData, { onConflict: 'pair' });

      if (upsertError) {
        console.error(`Error upserting ${pair}:`, upsertError);
      } else {
        updates.push(pair);
        
        historyInserts.push({
          pair,
          price: priceData.usd,
          timestamp: new Date().toISOString(),
        });
      }
    }

    if (historyInserts.length > 0) {
      const { error: historyError } = await supabase
        .from('rate_history')
        .insert(historyInserts);

      if (historyError) {
        console.error('Error inserting history:', historyError);
      }
    }

    const { data: rates, error: fetchError } = await supabase
      .from('exchange_rates')
      .select('*')
      .order('pair');

    if (fetchError) {
      throw fetchError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated: updates,
        rates: rates,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});