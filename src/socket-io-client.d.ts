// Declaração manual para compatibilidade com TypeScript 6 + moduleResolution bundler
declare module 'socket.io-client' {
  interface Socket {
    readonly connected: boolean
    readonly id: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(event: string, listener: (...args: any[]) => void): this
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    emit(event: string, ...args: any[]): this
    disconnect(): this
  }

  interface IoOptions {
    auth?: Record<string, string>
    transports?: string[]
    [key: string]: unknown
  }

  function io(uri: string, opts?: IoOptions): Socket

  export { io }
  export type { Socket }
}
