"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.limit = void 0;
const pLimit = require("p-limit");
const CONCURRENCY = 5;
exports.limit = pLimit(CONCURRENCY);
//# sourceMappingURL=limit.js.map