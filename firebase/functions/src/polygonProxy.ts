//firebase/functions/src/polygonProxy.ts
import fetch from 'node-fetch';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { Request, Response } from 'express';

export const POLYGON_API_KEY = defineSecret('POLYGON_API_KEY');

type PolygonBarResponse = {
  bars: {
    t: string;
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
  }[];
  next_page_token?: string;
};

export const polygonProxy = onRequest({ secrets: [POLYGON_API_KEY] }, async (req: Request, res: Response) => {
  const { symbol, timeframe } = req.query;

  if (!symbol || typeof symbol !== 'string' || !timeframe || typeof timeframe !== 'string') {
    res.status(400).json({ error: 'Missing or invalid symbol or timeframe' });
    return;
  }

  const API_KEY = process.env.POLYGON_API_KEY!;
  const BASE_URL = `https://api.polygon.io/v2/aggs/ticker`;

  const now = new Date();
  const endISO = now.toISOString();
  const startISO = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year back

  const url = `${BASE_URL}/${symbol}/range/1/${timeframe}/${startISO}/${endISO}?adjusted=true&sort=asc&limit=50000&apiKey=${API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Polygon API failed: ${response.status} - ${errorBody}`);
    }

    const data = await response.json() as PolygonBarResponse;
    res.status(200).json(data);
  } catch (err) {
    console.error('❌ polygonProxy error:', err);
    res.status(500).json({ error: 'Failed to fetch Polygon data' });
  }
});
