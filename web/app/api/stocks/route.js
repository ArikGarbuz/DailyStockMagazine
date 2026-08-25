import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    // Read latest stocks data from JSON file
    const dataDir = path.join(process.cwd(), '..', 'data');

    // Get list of files and find latest
    let files = [];
    try {
      files = await fs.readdir(dataDir);
    } catch (err) {
      console.log('Data directory not found yet, returning sample data');
    }

    let stocksData = null;

    if (files && files.length > 0) {
      // Get latest file
      const jsonFiles = files.filter(f => f.endsWith('.json')).sort().reverse();

      if (jsonFiles.length > 0) {
        const filePath = path.join(dataDir, jsonFiles[0]);
        const data = await fs.readFile(filePath, 'utf-8');
        stocksData = JSON.parse(data);
      }
    }

    // Fallback sample data if no real data exists
    if (!stocksData) {
      stocksData = {
        date: new Date().toISOString(),
        stocks: [
          {
            ticker: 'BMNR',
            exchange: 'NYSE',
            price: 24.36,
            change: 6.7,
            name: 'BitMine Immersion Technologies',
            nameHE: 'טכנולוגיות BitMine Immersion',
            why: 'Massive Ethereum treasury announcement. Holdings valued at $14.9B.',
            whyHE: 'הודעה על אוצר ענק של Ethereum. ההחזקות מוערכות ב-$14.9B.',
            sentiment: 'BULLISH',
            marketCap: '$3.2B',
            marketCapHE: '$3.2B',
            volume: '+6.7%',
            catalyst: 'Treasury Strength',
            reddit: true
          },
          {
            ticker: 'SOFI',
            exchange: 'NASDAQ',
            price: 18.31,
            change: 32.0,
            name: 'SoFi Technologies Inc',
            nameHE: 'SoFi Technologies',
            why: 'Strong fintech momentum. Consumer credit resilience outperforming.',
            whyHE: 'תנופה חזקה של fintech. עמידות אשראי לצרכנים עוברת ציפיות.',
            sentiment: 'BULLISH',
            marketCap: '$14.8B',
            marketCapHE: '$14.8B',
            volume: 'High',
            catalyst: 'Earnings Beat',
            reddit: true
          }
        ]
      };
    }

    return Response.json(stocksData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    });
  } catch (error) {
    console.error('Error fetching stocks:', error);

    return Response.json(
      { error: 'Failed to fetch stocks', message: error.message },
      { status: 500 }
    );
  }
}
