export declare class Preset {
    name: string;
    defines: {
        MSIZE: number;
        SKIN_DETECTION: boolean;
    };
    uniforms: {
        Brightness: number;
        SIGMA: number;
        BSIGMA: number;
    };
    constructor(name?: string);
}
