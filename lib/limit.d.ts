import * as pLimit from 'p-limit';
export declare const limit: pLimit.Limit;
export declare const requestRateLimit: (requestsPerMinuteLimit?: number) => Promise<void>;
