declare module 'gif-encoder-2' {
  import { Readable } from 'stream';

  class GIFEncoder {
    constructor(width: number, height: number, algorithm?: string, useOptimizer?: boolean, totalFrames?: number);
    start(): void;
    finish(): void;
    setRepeat(repeat: number): void;
    setDelay(delay: number): void;
    setQuality(quality: number): void;
    setTransparent(color: number | string): void;
    addFrame(ctx: CanvasRenderingContext2D | ImageData | Buffer): void;
    out: { getData(): Buffer };
    createReadStream(): Readable;
  }

  export default GIFEncoder;
}

declare module 'pngjs' {
  import { Duplex } from 'stream';

  interface PNGOptions {
    width?: number;
    height?: number;
    fill?: boolean;
    filterType?: number;
    colorType?: number;
    inputColorType?: number;
    bitDepth?: number;
    inputHasAlpha?: boolean;
    bgColor?: { red: number; green: number; blue: number };
  }

  export class PNG extends Duplex {
    constructor(options?: PNGOptions);
    width: number;
    height: number;
    data: Buffer;
    gamma: number;
    static sync: {
      read(buffer: Buffer, options?: PNGOptions): PNG;
      write(png: PNG): Buffer;
    };
    pack(): this;
    parse(data: Buffer, callback?: (error: Error | null, data: PNG) => void): this;
    on(event: string, callback: (...args: unknown[]) => void): this;
  }
}
