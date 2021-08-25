declare namespace telnetlib {
  interface Telnet {
    connect(host: string, port: number, options?: any): Promise<void>;
    disconnect(): Promise<void>;
    write(data: string): Promise<void>;
    on(event: string, callback: Function): void;
    on(event: 'connect', callback: (socket: Socket) => void): void;
    on(event: 'data', callback: (data: string) => void): void;
    on(event: 'end', callback: () => void): void;
    on(event: 'error', callback: (error: Error) => void): void;
    on(event: 'close', callback: () => void): void;
  }
}
