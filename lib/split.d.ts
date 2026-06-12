export declare function splitJSONtoSmallChunks(object: Record<string, unknown>, options: {
    modelContextLimit: number;
    modelContextSplit: number;
}): Record<string, unknown>[];
export declare function isPlainObject(obj: unknown): obj is Record<string, unknown>;
