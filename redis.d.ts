/**
 * Type declaration for optional 'redis' dependency.
 * Used by realtime-bus when REDIS_URL is set; package may not be present in all environments.
 */
declare module 'redis' {
  interface RedisClient {
    connect(): Promise<void>
    publish(channel: string, message: string): Promise<number>
    on(event: string, handler: () => void): void
    subscribe(channel: string, listener: (message: string) => void): Promise<void>
  }
  export function createClient(options: { url: string }): RedisClient
}
