import { GoogleGenAI } from '@google/genai';
import GIFEncoder from 'gif-encoder-2';
import { PNG } from 'pngjs';
import type { IllustrationResult } from '../../../types/illustration';

const IMAGE_MODEL = 'gemini-2.5-flash-image';
const TEXT_MODEL = 'gemini-2.5-flash-lite';

const STYLE_PREFIX =
  'Flat cartoon-style cooking illustration, clean vector art, instructional cookbook style, simple white background, no text labels:';

const FRAME_COUNT = 3;
const GIF_DELAY = 900; // ms per frame
const IMAGE_SIZE = 512;

// In-memory cache: cacheKey -> { data: base64, format: 'gif'|'png' }
const cache = new Map<string, IllustrationResult>();
const MAX_CACHE = 50;

let client: GoogleGenAI | undefined;
const getClient = (): GoogleGenAI => {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) throw new Error('Gemini API key is missing');
    client = new GoogleGenAI({ apiKey });
  }
  return client;
};

// Motion keywords — steps containing these involve visible technique/action
const MOTION_KEYWORDS = [
  'slice', 'cut', 'chop', 'dice', 'mince', 'julienne', 'trim',
  'stir', 'whisk', 'beat', 'mix', 'fold', 'toss', 'blend',
  'knead', 'roll', 'flatten', 'shape', 'press', 'stretch',
  'flip', 'turn', 'sear', 'sauté', 'saute', 'fry', 'grill',
  'pour', 'drizzle', 'spread', 'layer', 'stuff', 'wrap',
  'peel', 'grate', 'shred', 'zest', 'crack', 'squeeze',
  'brush', 'baste', 'glaze', 'score', 'carve',
];

/**
 * Classify whether a cooking step involves motion/technique or is static.
 * Uses fast keyword matching instead of an API call.
 */
function isMotionStep(stepText: string): boolean {
  const lower = stepText.toLowerCase();
  return MOTION_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Generate a single illustration image. Returns a PNG Buffer or null.
 */
async function generateSingleImage(prompt: string): Promise<Buffer | null> {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: [{ role: 'user', parts: [{ text: `${STYLE_PREFIX} ${prompt}` }] }],
      config: {
        responseModalities: ['IMAGE'],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        return Buffer.from(part.inlineData.data, 'base64');
      }
    }
    return null;
  } catch (err) {
    console.error('[IllustrationService] Image gen failed:', (err as Error).message);
    return null;
  }
}

/**
 * Decode a PNG buffer into raw RGBA pixel data + dimensions.
 */
function decodePng(buffer: Buffer): { width: number; height: number; data: Buffer } {
  const png = PNG.sync.read(buffer);
  return { width: png.width, height: png.height, data: png.data };
}

/**
 * Stitch multiple PNG buffers into an animated GIF.
 * Returns a Buffer containing the GIF data.
 */
function stitchGif(pngBuffers: Buffer[]): Buffer {
  // Decode first frame to get dimensions
  const first = decodePng(pngBuffers[0]);
  const { width, height } = first;

  const encoder = new GIFEncoder(width, height);
  encoder.setDelay(GIF_DELAY);
  encoder.setRepeat(0); // loop forever
  encoder.setQuality(10);
  encoder.start();

  // Add first frame
  encoder.addFrame(first.data);

  // Add remaining frames, resizing if needed
  for (let i = 1; i < pngBuffers.length; i++) {
    const decoded = decodePng(pngBuffers[i]);
    if (decoded.width === width && decoded.height === height) {
      encoder.addFrame(decoded.data);
    } else {
      // If dimensions differ, skip this frame rather than crash
      console.warn(
        `[IllustrationService] Frame ${i} size mismatch: ${decoded.width}x${decoded.height} vs ${width}x${height}, skipping`
      );
    }
  }

  encoder.finish();
  return encoder.out.getData();
}

/**
 * Build frame prompts for an animated sequence.
 */
function buildFramePrompts(stepText: string): string[] {
  return [
    `Frame 1 of ${FRAME_COUNT}: The very beginning - "${stepText}". Show ingredients/tools ready, before action starts.`,
    `Frame 2 of ${FRAME_COUNT}: Midway through - "${stepText}". The technique is in progress.`,
    `Frame 3 of ${FRAME_COUNT}: Nearly complete - "${stepText}". Show the result taking shape.`,
  ];
}

/**
 * Generate an illustration for a cooking step.
 * Returns { data: base64String, format: 'gif'|'png' } or null.
 */
export async function generateStepIllustration(stepText: string, cacheKey?: string): Promise<IllustrationResult | null> {
  // Check cache
  if (cacheKey && cache.has(cacheKey)) {
    console.log('[IllustrationService] Cache hit:', cacheKey);
    return cache.get(cacheKey)!;
  }

  console.log('[IllustrationService] Generating for step:', stepText);

  const motion = isMotionStep(stepText);
  let result: IllustrationResult;

  if (motion) {
    console.log('[IllustrationService] Motion step detected, generating', FRAME_COUNT, 'frames');
    const prompts = buildFramePrompts(stepText);
    const frames = await Promise.all(prompts.map((p) => generateSingleImage(p)));
    const validFrames = frames.filter((f): f is Buffer => f !== null);

    if (validFrames.length < 2) {
      // Not enough frames for animation, fall back to static
      const singleFrame = validFrames[0] || (await generateSingleImage(stepText));
      if (!singleFrame) return null;
      result = { data: singleFrame.toString('base64'), format: 'png' };
    } else {
      const gifBuffer = stitchGif(validFrames);
      result = { data: gifBuffer.toString('base64'), format: 'gif' };
    }
  } else {
    console.log('[IllustrationService] Static step detected, generating single image');
    const pngBuffer = await generateSingleImage(stepText);
    if (!pngBuffer) return null;
    result = { data: pngBuffer.toString('base64'), format: 'png' };
  }

  // Cache the result (with eviction)
  if (cacheKey && result) {
    if (cache.size >= MAX_CACHE) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) {
        cache.delete(oldest);
      }
    }
    cache.set(cacheKey, result);
  }

  console.log(
    '[IllustrationService] Generated:',
    result.format,
    '~' + Math.round(result.data.length / 1024) + 'KB'
  );
  return result;
}

/**
 * Generate an illustration for a clarifying question (always static PNG).
 * Returns { data: base64String, format: 'png' } or null.
 */
export async function generateClarifyIllustration(description: string): Promise<IllustrationResult | null> {
  console.log('[IllustrationService] Generating clarify illustration:', description);
  const pngBuffer = await generateSingleImage(description);
  if (!pngBuffer) return null;
  return { data: pngBuffer.toString('base64'), format: 'png' };
}
