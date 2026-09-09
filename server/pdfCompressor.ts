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
  passesRun: number;
  isCompressed: boolean;
  exceedsSupabaseLimit: boolean;
  error?: string;
}

export interface FileCompressionResult {
  outputPath: string;
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  savedPercent: number;
  isCompressed: boolean;
  passesRun: number;
}

/**
 * Runs Ghostscript with image downsampling and JPEG re-encoding.
 * Forces Ghostscript to decompress and downsample embedded high-resolution JPEG streams
 * via -dPassThroughJPEGImages=false, matching command-line Ghostscript behavior.
 */
export const runGhostscriptCommand = (
  inputPath: string, 
  outputPath: string, 
  preset: 'printer' | 'ebook' | 'screen',
  dpi: number
): Promise<void> => {
  const args = [
    '-sDEVICE=pdfwrite',
    '-dCompatibilityLevel=1.4',
    `-dPDFSETTINGS=/${preset}`,
    '-dNOPAUSE',
    '-dQUIET',
    '-dBATCH',
    '-dPDFSTOPONERROR=false',
    // Force re-encoding & downsampling of embedded images (essential for embedded JPEGs)
    '-dPassThroughJPEGImages=false',
    '-dPassThroughJPXImages=false',
    '-dDetectDuplicateImages=true',
    '-dCompressFonts=true',
    '-dSubsetFonts=true',
    '-dEmbedAllFonts=true',
    '-dAutoFilterColorImages=true',
    '-dAutoFilterGrayImages=true',
    '-dDownsampleColorImages=true',
    '-dColorImageDownsampleType=/Bicubic',
    `-dColorImageResolution=${dpi}`,
    '-dDownsampleGrayImages=true',
    '-dGrayImageDownsampleType=/Bicubic',
    `-dGrayImageResolution=${dpi}`,
    '-dDownsampleMonoImages=true',
    `-dMonoImageResolution=${Math.min(dpi * 2, 300)}`,
    `-sOutputFile=${outputPath}`,
    inputPath
  ];

  return new Promise((resolve, reject) => {
    execFile('gs', args, { maxBuffer: 300 * 1024 * 1024, timeout: 180000 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || stdout || err.message));
      } else {
        resolve();
      }
    });
  });
};

/**
 * Universal fail-safe Ghostscript invocation without custom downsample thresholds.
 */
export const runFailsafeGhostscript = (inputPath: string, outputPath: string): Promise<void> => {
  const args = [
    '-sDEVICE=pdfwrite',
    '-dCompatibilityLevel=1.4',
    '-dPDFSETTINGS=/screen',
    '-dNOPAUSE',
    '-dQUIET',
    '-dBATCH',
    '-dPDFSTOPONERROR=false',
    '-dPassThroughJPEGImages=false',
    `-sOutputFile=${outputPath}`,
    inputPath
  ];

  return new Promise((resolve, reject) => {
    execFile('gs', args, { maxBuffer: 300 * 1024 * 1024, timeout: 180000 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || stdout || err.message));
      } else {
        resolve();
      }
    });
  });
};

/**
 * High-performance disk-to-disk compression pipeline for large (e.g. 50MB–250MB) files.
 * Streams files without holding multi-hundred-megabyte buffers in Node.js V8 memory.
 */
export const compressPdfFile = async (inputFilePath: string): Promise<FileCompressionResult> => {
  const stat = await fs.stat(inputFilePath);
  const originalSize = stat.size;
  const tempDir = os.tmpdir();
  const randomId = crypto.randomBytes(8).toString('hex');

  const out1Path = path.join(tempDir, `comp1_${Date.now()}_${randomId}.pdf`);
  const out2Path = path.join(tempDir, `comp2_${Date.now()}_${randomId}.pdf`);
  const failsafePath = path.join(tempDir, `failsafe_${Date.now()}_${randomId}.pdf`);

  let bestOutputPath = inputFilePath;
  let bestSize = originalSize;
  let passesRun = 0;

  // Pass 1: High quality downsample
  // For files > 100MB, start at 150 DPI /ebook to ensure immediate reduction
  // For files < 100MB, start at 180 DPI /printer
  const initialPreset: 'printer' | 'ebook' = originalSize > 80 * 1024 * 1024 ? 'ebook' : 'printer';
  const initialDpi = originalSize > 80 * 1024 * 1024 ? 150 : 180;

  try {
    await runGhostscriptCommand(inputFilePath, out1Path, initialPreset, initialDpi);
    const s1 = (await fs.stat(out1Path)).size;
    passesRun = 1;
    if (s1 < bestSize) {
      bestSize = s1;
      bestOutputPath = out1Path;
    }
  } catch (err: any) {
    console.warn('GS file Pass 1 note:', err.message);
  }

  // Pass 2: If the document is still > 40 MB (approaching Supabase's 50 MB hard limit),
  // run standard screen downsampling at 96 DPI to safely fit within limits.
  if (bestSize > 40 * 1024 * 1024) {
    try {
      await runGhostscriptCommand(inputFilePath, out2Path, 'screen', 96);
      const s2 = (await fs.stat(out2Path)).size;
      passesRun = 2;
      if (s2 < bestSize) {
        bestSize = s2;
        bestOutputPath = out2Path;
      }
    } catch (err: any) {
      console.warn('GS file Pass 2 note:', err.message);
    }
  }

  // Fallback: If neither pass produced a smaller file, run failsafe
  if (bestSize >= originalSize) {
    try {
      await runFailsafeGhostscript(inputFilePath, failsafePath);
      const sF = (await fs.stat(failsafePath)).size;
      passesRun++;
      if (sF < bestSize) {
        bestSize = sF;
        bestOutputPath = failsafePath;
      }
    } catch (fsErr: any) {
      console.warn('GS file failsafe note:', fsErr.message);
    }
  }

  const savedBytes = Math.max(0, originalSize - bestSize);
  const savedPercent = originalSize > 0 ? (savedBytes / originalSize) * 100 : 0;
  const isCompressed = bestSize < originalSize;

  return {
    outputPath: bestOutputPath,
    originalSize,
    compressedSize: bestSize,
    savedBytes,
    savedPercent,
    isCompressed,
    passesRun
  };
};

/**
 * Buffer-based compression pipeline for small documents (< 20 MB).
 */
export const autoCompressPdfBuffer = async (inputBuffer: Buffer): Promise<CompressionResult> => {
  const originalSize = inputBuffer.length;
  const randomId = crypto.randomBytes(8).toString('hex');
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `buf_in_${Date.now()}_${randomId}.pdf`);

  try {
    await fs.writeFile(inputPath, inputBuffer);
    const result = await compressPdfFile(inputPath);
    
    let finalBuffer = inputBuffer;
    if (result.isCompressed && result.outputPath !== inputPath) {
      finalBuffer = await fs.readFile(result.outputPath);
    }

    return {
      buffer: finalBuffer,
      originalSize,
      compressedSize: finalBuffer.length,
      savedBytes: Math.max(0, originalSize - finalBuffer.length),
      savedPercent: originalSize > 0 ? ((originalSize - finalBuffer.length) / originalSize) * 100 : 0,
      passesRun: result.passesRun,
      isCompressed: finalBuffer.length < originalSize,
      exceedsSupabaseLimit: finalBuffer.length > 50 * 1024 * 1024
    };
  } catch (err: any) {
    return {
      buffer: inputBuffer,
      originalSize,
      compressedSize: originalSize,
      savedBytes: 0,
      savedPercent: 0,
      passesRun: 0,
      isCompressed: false,
      exceedsSupabaseLimit: originalSize > 50 * 1024 * 1024,
      error: err?.message || 'Compression failed'
    };
  } finally {
    // Cleanup temporary files
    await fs.unlink(inputPath).catch(() => {});
  }
};
