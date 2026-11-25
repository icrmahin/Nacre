export type BuildState = "idle" | "building" | "ready";

export interface PaletteToken {
    readonly name: string;
    value: string;
    enabled?: boolean;
}

export class NacrePalette {
    constructor(private readonly tokens: PaletteToken[]) {}

    resolve(name: string, fallback = "#15191B"): string {
        const token = this.tokens.find((item) => item.name === name);
        return token?.enabled === false ? fallback : token?.value ?? fallback;
    }
}

export function resolveSignalAccent(active: boolean, fallback = "#697577"): string {
    return active ? "#F16B52" : fallback;
}

export const signalAccent = "#F16B52";
export const contrastRatio = (foreground: number, background: number): number =>
    Math.max(foreground, background) / Math.min(foreground, background);
