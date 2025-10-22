"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const tradeProducerStream_1 = require("../websocket/tradeProducerStream");
const findMock = jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([])
});
jest.mock('../models/trade', () => ({
    TradeModel: {
        find: (...args) => findMock(...args)
    }
}));
jest.mock('ws', () => {
    const { EventEmitter } = require('events');
    class MockWebSocket extends EventEmitter {
        constructor() {
            super();
            this.readyState = 1;
            this.send = jest.fn();
            this.close = jest.fn();
        }
        readyState;
        send;
        close;
    }
    MockWebSocket.OPEN = 1;
    class MockWebSocketServer extends EventEmitter {
        constructor(options) {
            super();
            this.options = options;
        }
        options;
        close = jest.fn();
    }
    return {
        __esModule: true,
        default: MockWebSocket,
        WebSocketServer: MockWebSocketServer,
        RawData: Buffer
    };
});
describe('registerTradeProducerStream', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });
    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
        findMock.mockClear();
    });
    it('streams trades to subscribers', async () => {
        const trades = [
            { id: 't1', price: '0.42', size: '120' },
            { id: 't2', price: '0.57', size: '80' }
        ];
        const getTrades = jest.fn().mockResolvedValue(trades);
        const record = jest.fn();
        const recorder = { record };
        const server = {};
        const wss = (0, tradeProducerStream_1.registerTradeProducerStream)(server, { getTrades }, {
            pollIntervalMs: 30,
            defaultLimit: 2
        }, recorder);
        const socket = new ws_1.default();
        const request = { url: '/ws/polymarket/trades?marketId=market-123&limit=2' };
        wss.emit('connection', socket, request);
        await flushPromises();
        jest.advanceTimersByTime(35);
        await flushPromises();
        jest.advanceTimersByTime(35);
        await flushPromises();
        const payloads = socket.send.mock.calls.map(([payload]) => JSON.parse(payload));
        expect(getTrades).toHaveBeenCalledWith({
            marketId: 'market-123',
            limit: 2
        });
        expect(socket.send).toHaveBeenCalled();
        expect(record).toHaveBeenCalledWith({
            marketId: 'market-123',
            marketHash: null,
            trades
        });
        wss.close();
    });
    it('rejects connections without identifiers', async () => {
        const getTrades = jest.fn();
        const wss = (0, tradeProducerStream_1.registerTradeProducerStream)({}, { getTrades }, {
            pollIntervalMs: 30,
            defaultLimit: 2
        }, { record: jest.fn() });
        const socket = new ws_1.default();
        const closeSpy = jest.spyOn(socket, 'close');
        wss.emit('connection', socket, { url: '/ws/polymarket/trades' });
        expect(closeSpy).toHaveBeenCalledWith(1008, 'Missing market identifier');
        expect(getTrades).not.toHaveBeenCalled();
        wss.close();
    });
});
async function flushPromises() {
    await Promise.resolve();
    await Promise.resolve();
}
//# sourceMappingURL=polymarketTradeStream.test.js.map