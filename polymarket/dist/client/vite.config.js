"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vite_1 = require("vite");
const vite_plugin_solid_1 = __importDefault(require("vite-plugin-solid"));
exports.default = (0, vite_1.defineConfig)({
    plugins: [(0, vite_plugin_solid_1.default)()],
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
        },
    },
    build: {
        target: 'esnext',
    },
});
//# sourceMappingURL=vite.config.js.map