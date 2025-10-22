"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradeModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const tradeSchema = new mongoose_1.default.Schema({
    tradeId: { type: String, required: true, unique: true, index: true },
    marketId: { type: String, index: true },
    marketHash: { type: String, index: true },
    price: Number,
    size: Number,
    outcome: String,
    side: String,
    occurredAt: Date,
    receivedAt: { type: Date, default: Date.now },
    raw: { type: mongoose_1.default.Schema.Types.Mixed, required: true }
}, {
    timestamps: true
});
exports.TradeModel = mongoose_1.default.models.Trade || mongoose_1.default.model('Trade', tradeSchema);
//# sourceMappingURL=trade.js.map