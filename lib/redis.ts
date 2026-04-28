import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;

/**
 * Upstash Redis クライアントを取得。
 * Vercel + Upstash インテグレーションを使うと
 * 自動で KV_REST_API_URL / KV_REST_API_TOKEN
 * もしくは UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 * のいずれかが設定される。両方に対応。
 */
export function getRedis(): Redis | null {
  if (_redis) return _redis;

  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null; // ローカル開発などでRedisが設定されていない場合
  }

  _redis = new Redis({ url, token });
  return _redis;
}

export const STATE_KEY = 'mauve-bar:state';
