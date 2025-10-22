type LogLevel = 'error' | 'warn' | 'info' | 'debug';
declare class Logger {
    private readonly minLevel;
    constructor(level: LogLevel);
    error(message?: unknown, ...optionalParams: unknown[]): void;
    warn(message?: unknown, ...optionalParams: unknown[]): void;
    info(message?: unknown, ...optionalParams: unknown[]): void;
    debug(message?: unknown, ...optionalParams: unknown[]): void;
    private log;
}
export declare const L: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map