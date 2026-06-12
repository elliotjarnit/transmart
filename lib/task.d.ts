import { Transmart } from './transmart';
import { RunWork } from './types';
interface TaskResult {
    content: string;
    index: number;
}
export declare class Task {
    private transmart;
    private work;
    constructor(transmart: Transmart, work: RunWork);
    start(onProgress: (current: number, total: number) => any): Promise<string>;
    private run;
    parse(content: string): Record<string, any>;
    pack(result: TaskResult[]): Record<string, any>;
}
export {};
