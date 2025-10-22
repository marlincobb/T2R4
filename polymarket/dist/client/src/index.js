"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web_1 = require("solid-js/web");
const App_1 = __importDefault(require("./App"));
const root = document.getElementById('root');
if (!root) {
    throw new Error('Failed to find the root element');
}
(0, web_1.render)(() => <App_1.default />, root);
//# sourceMappingURL=index.js.map