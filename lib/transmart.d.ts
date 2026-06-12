import { TransmartOptions, RunOptions, TransmartStats } from './types';
export declare class Transmart {
    options: Required<TransmartOptions>;
    constructor(options: TransmartOptions);
    run(options: RunOptions): Promise<TransmartStats>;
    private processSingleNamespace;
    private validateParams;
    private isFlatLocaleMode;
    private getBaseLocaleFullPath;
    private getInputNSFilePath;
    private getOutputNSFilePath;
}
