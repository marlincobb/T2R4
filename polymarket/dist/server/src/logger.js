"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.L = void 0;
const LEVEL_PRIORITY = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};
function resolveLogLevel() {
    const raw = (process.env.LOG_LEVEL ?? process.env.NODE_LOG_LEVEL ?? '').toLowerCase();
    if (raw === 'error' || raw === 'warn' || raw === 'info' || raw === 'debug') {
        return raw;
    }
    return 'info';
}
class Logger {
    minLevel;
    constructor(level) {
        this.minLevel = LEVEL_PRIORITY[level];
    }
    error(message, ...optionalParams) {
        this.log('error', message, optionalParams);
    }
    warn(message, ...optionalParams) {
        this.log('warn', message, optionalParams);
    }
    info(message, ...optionalParams) {
        this.log('info', message, optionalParams);
    }
    debug(message, ...optionalParams) {
        this.log('debug', message, optionalParams);
    }
    log(level, message, optionalParams = []) {
        if (LEVEL_PRIORITY[level] > this.minLevel) {
            return;
        }
        const target = console[level];
        if (typeof target === 'function') {
            target(message, ...optionalParams);
        }
    }
}
exports.L = new Logger(resolveLogLevel());
//# sourceMappingURL=logger.js.map