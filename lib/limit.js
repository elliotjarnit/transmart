"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestRateLimit = exports.limit = void 0;
const pLimit = require("p-limit");
const CONCURRENCY = 5;
const ONE_MINUTE = 60 * 1000;
exports.limit = pLimit(CONCURRENCY);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
class RequestRateLimiter {
    timestamps = [];
    queue = Promise.resolve();
    wait(requestsPerMinuteLimit) {
        if (requestsPerMinuteLimit === undefined) {
            return Promise.resolve();
        }
        const scheduled = this.queue.then(() => this.waitForSlot(requestsPerMinuteLimit));
        this.queue = scheduled.catch(() => undefined);
        return scheduled;
    }
    async waitForSlot(requestsPerMinuteLimit) {
        let isScheduled = false;
        while (!isScheduled) {
            const now = Date.now();
            this.timestamps = this.timestamps.filter((timestamp) => now - timestamp < ONE_MINUTE);
            if (this.timestamps.length < requestsPerMinuteLimit) {
                this.timestamps.push(now);
                isScheduled = true;
                continue;
            }
            const oldestTimestamp = this.timestamps[0];
            await sleep(ONE_MINUTE - (now - oldestTimestamp));
        }
    }
}
const requestRateLimiter = new RequestRateLimiter();
const requestRateLimit = (requestsPerMinuteLimit) => requestRateLimiter.wait(requestsPerMinuteLimit);
exports.requestRateLimit = requestRateLimit;
//# sourceMappingURL=limit.js.map