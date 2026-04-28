import { NextRequest, NextResponse } from 'next/server';
import { getRedis, STATE_KEY } from '@/lib/redis';
import { BarData, DEFAULT_DATA } from '@/lib/types';

// このルートは常に動的（毎回最新を取得したい）
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PIN = process.env.BAR_PIN || '0317';

// In-memory fallback (Redis未設定時のローカル開発用、再起動でリセット)
let memoryState: BarData = DEFAULT_DATA;

async function readState(): Promise<BarData> {
  const redis = getRedis();
  if (!redis) return memoryState;
  try {
    const data = (await redis.get<BarData>(STATE_KEY)) || DEFAULT_DATA;
    return data;
  } catch (e) {
    console.error('redis read failed', e);
    return memoryState;
  }
}

async function writeState(data: BarData): Promise<void> {
  memoryState = data;
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(STATE_KEY, data);
  } catch (e) {
    console.error('redis write failed', e);
  }
}

export async function GET() {
  const data = await readState();
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

export async function POST(req: NextRequest) {
  let body: { pin?: string; data?: BarData };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  if (!body.pin || body.pin !== PIN) {
    return NextResponse.json({ error: 'invalid pin' }, { status: 401 });
  }
  if (!body.data) {
    return NextResponse.json({ error: 'missing data' }, { status: 400 });
  }

  await writeState(body.data);
  return NextResponse.json(body.data);
}
