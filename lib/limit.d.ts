import * as pLimit from 'p-limit';
export declare const limit: pLimit.Limit;
interface RequestLimitOptions {
    requestsPerMinuteLimit?: number;
    tokensPerMinuteLimit?: number;
    tokenCount?: number;
}
export declare const requestRateLimit: (options: RequestLimitOptions) => Promise<void>;
export {};
