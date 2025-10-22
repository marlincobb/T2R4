"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nock_1 = __importDefault(require("nock"));
nock_1.default.disableNetConnect();
nock_1.default.enableNetConnect('127.0.0.1');
//# sourceMappingURL=setup.js.map