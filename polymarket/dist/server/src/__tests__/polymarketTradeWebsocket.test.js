"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tradeConsumerStream_1 = require("../websocket/tradeConsumerStream");
jest.mock('ws', () => {
    const { EventEmitter } = require('events');
    class MockWebSocket extends EventEmitter {
        constructor() {
            super();
            this.readyState = MockWebSocket.OPEN;
            this.send = jest.fn();
            this.close = jest.fn();
        }
        static OPEN = 1;
        readyState;
        send;
        close;
    }
    const ctor = jest.fn(() => new MockWebSocket());
    ctor.OPEN = MockWebSocket.OPEN;
    return {
        __esModule: true,
        default: ctor
    };
});
describe('PolymarketTradeConsumerStream', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });
    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });
    it('subscribes to markets and records trades', async () => {
        const record = jest.fn().mockResolvedValue(undefined);
        const recorder = { record };
        const socket = new tradeConsumerStream_1.PolymarketTradeConsumerStream(recorder, {
            url: 'wss://example.com',
            reconnectDelayMs: 5000,
            heartbeatIntervalMs: 1000,
            channel: 'market',
            auth: {
                apiKey: 'api-key',
                secret: 'api-secret',
                passphrase: 'api-pass'
            },
            headers: { Authorization: 'Bearer test' },
            origin: 'https://example.com',
            protocols: ['json']
        });
        socket.setMarkets([{ marketId: '123', assetId: 'asset-123' }]);
        socket.start();
        const MockWebSocket = require('ws').default;
        expect(MockWebSocket).toHaveBeenCalledWith('wss://example.com/ws/market', ['json'], {
            headers: { Authorization: 'Bearer test' },
            origin: 'https://example.com'
        });
        const instance = MockWebSocket.mock.results[0].value;
        instance.emit('open');
        expect(instance.send).toHaveBeenCalledWith(JSON.stringify({
            type: 'market',
            assets_ids: ['asset-123'],
            auth: {
                apiKey: 'api-key',
                secret: 'api-secret',
                passphrase: 'api-pass'
            }
        }));
        instance.emit('message', JSON.stringify({
            type: 'trades',
            marketId: '123',
            data: [{ id: 't1', price: '0.5' }]
        }));
        await flushPromises();
        expect(record).toHaveBeenCalledWith({
            marketId: '123',
            marketHash: null,
            trades: [{ id: 't1', price: '0.5' }]
        });
        socket.stop();
    });
});
async function flushPromises() {
    await Promise.resolve();
    await Promise.resolve();
}
//# sourceMappingURL=polymarketTradeWebsocket.test.js.map