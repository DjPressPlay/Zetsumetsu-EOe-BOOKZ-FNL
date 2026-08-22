import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

export interface CompressionResult {
  buffer: Buffer;
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  savedPercent: number;
  ratio: string;
  preset: 'ebook' | 'screen' | 'printer' | 'prepress';
  isCompressed: boolean;
  executionTimeMs: number;
  engine: string;
}

export type CompressionPreset = 'ebook' | 'screen' | 'printer' | 'prepress';

/**
 * Checks if Ghostscript binary is available on the host system.
 */
export const checkGhostscriptAvailable = async (): Promise<{ available: boolean; version?: string; error?: string }> => {
  return new Promise((resolve) => {
    execFile('gs', ['--version'], (err, stdout) => {
      if (err) {
        resolve({ available: false, error: err.message });
      } else {
        resolve({ available: true, version: stdout.trim() });
      }
    });
  });
};

/**
 * Compresses a PDF Buffer using Ghostscript's pdfwrite engine.
 * Rebuilds the PDF page-by-page, downsamples high-DPI raster images,
 * subsets embedded fonts, and deduplicates object streams.
 */
export const compressPdfBuffer = async (
  inputBuffer: Buffer,
  preset: CompressionPreset = 'ebook'
): Promise<CompressionResult> => {
  const startTime = Date.now();
  const originalSize = inputBuffer.length;
  const randomId = crypto.randomBytes(8).toString('hex');
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `zetsu_in_${Date.now()}_${randomId}.pdf`);
  const outputPath = path.join(tempDir, `zetsu_out_${Date.now()}_${randomId}.pdf`);

  try {
    // 1. Write the input buffer to a temporary file
    await fs.writeFile(inputPath, inputBuffer);

    // 2. Configure Ghostscript parameters for optimal compression and compatibility
    const dpi = preset === 'screen' ? '72' : preset === 'ebook' ? '150' : '300';
    const args = [
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      `-dPDFSETTINGS=/${preset}`,
      '-dNOPAUSE',
      '-dQUIET',
      '-dBATCH',
      '-dDetectDuplicateImages=true',
      '-dCompressFonts=true',
      '-dSubsetFonts=true',
      '-dEmbedAllFonts=true',
      '-dColorImageDownsampleType=/Bicubic',
      `-dColorImageResolution=${dpi}`,
      '-dGrayImageDownsampleType=/Bicubic',
      `-dGrayImageResolution=${dpi}`,
      '-dMonoImageDownsampleType=/Bicubic',
      `-dMonoImageResolution=${preset === 'screen' ? '150' : '300'}`,
      `-sOutputFile=${outputPath}`,
      inputPath
    ];

    // 3. Execute Ghostscript
    await new Promise<void>((resolve, reject) => {
      execFile('gs', args, { maxBuffer: 100 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) {
          const errMsg = stderr || stdout || err.message;
          reject(new Error(`Ghostscript failed to process PDF: ${errMsg}`));
        } else {
          resolve();
        }
      });
    });

    // 4. Read the optimized output file
    const compressedBuffer = await fs.readFile(outputPath);
    const compressedSize = compressedBuffer.length;
    const executionTimeMs = Date.now() - startTime;

    // 5. Evaluate if compression yielded size reduction
    const isSmaller = compressedSize < originalSize;
    const finalBuffer = isSmaller ? compressedBuffer : inputBuffer;
    const finalSize = finalBuffer.length;
    const savedBytes = Math.max(0, originalSize - finalSize);
    const savedPercent = originalSize > 0 ? Math.round((savedBytes / originalSize) * 100) : 0;
    const ratio = originalSize > 0 ? ((finalSize / originalSize) * 100).toFixed(1) + '%' : '100%';

    return {
      buffer: finalBuffer,
      originalSize,
      compressedSize: finalSize,
      savedBytes,
      savedPercent,
      ratio,
      preset,
      isCompressed: isSmaller,
      executionTimeMs,
      engine: 'Ghostscript 9.55.0'
    };
  } finally {
    // 6. Clean up temporary files safely
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
  }
};
