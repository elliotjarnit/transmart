/**
 * A function that returns a hash of the input data and output file paths
 * If any of the input data or output file paths change, the hash will change
 * @param inputNSFilePath
 * @param outputNSFilePath
 * @returns
 */
export declare const getPairHash: (inputNSFilePath: string, outputNSFilePath: string) => string;
