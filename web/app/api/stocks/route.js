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
      const sampleStocks = [
        { ticker: 'BMNR', exchange: 'NYSE', price: 24.36, change: 6.7, name: 'BitMine Immersion', nameHE: 'BitMine Immersion', why: 'Ethereum treasury $14.9B', whyHE: 'אוצר Ethereum $14.9B', sentiment: 'BULLISH', marketCap: '$3.2B', volume: '+6.7%', catalyst: 'Treasury', reddit: true },
        { ticker: 'SOFI', exchange: 'NASDAQ', price: 18.31, change: 32.0, name: 'SoFi Technologies', nameHE: 'SoFi Tech', why: 'Fintech momentum strong', whyHE: 'תנופה fintech חזקה', sentiment: 'BULLISH', marketCap: '$14.8B', volume: 'High', catalyst: 'Earnings', reddit: true },
        { ticker: 'RIVN', exchange: 'NASDAQ', price: 16.97, change: -2.1, name: 'Rivian Automotive', nameHE: 'Rivian', why: 'EV sector pullback', whyHE: 'נסיגה EV', sentiment: 'NEUTRAL', marketCap: '$18.5B', volume: 'Elevated', reddit: false },
        { ticker: 'JOBY', exchange: 'NYSE', price: 9.42, change: 5.3, name: 'Joby Aviation', nameHE: 'Joby Aviation', why: 'Urban air mobility approved', whyHE: 'ניידות אוויר', sentiment: 'BULLISH', marketCap: '$2.1B', volume: '+5.3%', reddit: true },
        { ticker: 'NOK', exchange: 'NYSE', price: 4.18, change: -3.2, name: 'Nokia Oyj', nameHE: 'Nokia', why: 'R&D restructuring', whyHE: 'הערכה מחדש R&D', sentiment: 'BEARISH', marketCap: '$23.4B', volume: '+2.1M', reddit: false },
        { ticker: 'POET', exchange: 'NASDAQ', price: 8.27, change: 7.9, name: 'POET Technologies', nameHE: 'POET Tech', why: 'AI semiconductor demand', whyHE: 'ביקוש AI semiconductors', sentiment: 'BULLISH', marketCap: '$625M', volume: '+7.9%', redis: true },
        { ticker: 'OCFN', exchange: 'NASDAQ', price: 19.08, change: 4.2, name: 'OceanFirst Financial', nameHE: 'OceanFirst', why: 'Regional bank strength', whyHE: 'כוח בנקים אזוריים', sentiment: 'BULLISH', marketCap: '$891M', volume: '+4.2%', reddit: false },
        { ticker: 'BTCT', exchange: 'OTC', price: 2.84, change: 12.1, name: 'BTC Digital Ltd', nameHE: 'BTC Digital', why: 'Bitcoin mining recovery', whyHE: 'התאוששות כרייה', sentiment: 'BULLISH', marketCap: '$742M', volume: '+12.1%', reddit: true },
        { ticker: 'MARA', exchange: 'NASDAQ', price: 15.42, change: 8.9, name: 'Marathon Digital', nameHE: 'Marathon Digital', why: 'BTC mining efficiency gains', whyHE: 'יעילות כרייה', sentiment: 'BULLISH', marketCap: '$2.1B', volume: '+8.9%', reddit: true },
        { ticker: 'CLSK', exchange: 'NASDAQ', price: 12.55, change: 6.3, name: 'CleanSpark Inc', nameHE: 'CleanSpark', why: 'Renewable mining focus', whyHE: 'כרייה עם סקות חדשות', sentiment: 'BULLISH', marketCap: '$1.8B', volume: '+6.3%', reddit: true },
        { ticker: 'RIOT', exchange: 'NASDAQ', price: 11.28, change: 9.4, name: 'Riot Platforms', nameHE: 'Riot', why: 'Bitcoin infrastructure play', whyHE: 'תשתיות Bitcoin', sentiment: 'BULLISH', marketCap: '$3.5B', volume: '+9.4%', reddit: true },
        { ticker: 'CIFR', exchange: 'NASDAQ', price: 8.76, change: 5.1, name: 'Cipher Mining', nameHE: 'Cipher Mining', why: 'Mining capacity expansion', whyHE: 'הרחבת כושר כרייה', sentiment: 'BULLISH', marketCap: '$950M', volume: '+5.1%', reddit: false },
        { ticker: 'CORE', exchange: 'NASDAQ', price: 6.89, change: 3.7, name: 'Core Scientific', nameHE: 'Core Scientific', why: 'Mining operations growing', whyHE: 'פעולות כרייה גדלות', sentiment: 'NEUTRAL', marketCap: '$820M', volume: '+3.7%', reddit: false },
        { ticker: 'SRUUF', exchange: 'OTC', price: 5.34, change: 4.2, name: 'Surge Bitcoin Mining', nameHE: 'Surge Mining', why: 'Hashrate increase', whyHE: 'עלייה בHashrate', sentiment: 'BULLISH', marketCap: '$650M', volume: '+4.2%', reddit: true },
        { ticker: 'DMGI', exchange: 'OTC', price: 3.21, change: 6.8, name: 'DMG Blockchain', nameHE: 'DMG Blockchain', why: 'Mining expansion news', whyHE: 'חדשות הרחבה', sentiment: 'BULLISH', marketCap: '$580M', volume: '+6.8%', reddit: true }
      ];
      stocksData = {
        date: new Date().toISOString(),
        stocks: sampleStocks
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
