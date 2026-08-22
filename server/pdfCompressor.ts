import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const MAX_TARGET_BYTES = 45 * 1024 * 1024; // 45 MB (Safely below Supabase's 50 MB limit)

/**
 * Runs a single Ghostscript compression pass on a file with explicit downsampling and DCT re-encoding.
 */
const runGsPass = (inputPath: string, outputPath: string, dpi: number): Promise<void> => {
  const args = [
    '-sDEVICE=pdfwrite',
    '-dCompatibilityLevel=1.4',
    '-dNOPAUSE',
    '-dQUIET',
    '-dBATCH',
    // Force re-encoding and downsampling of color images
    '-dDownsampleColorImages=true',
    '-dColorImageDownsampleType=/Bicubic',
    `-dColorImageResolution=${dpi}`,
    '-dAutoFilterColorImages=false',
    '-dColorImageFilter=/DCTEncode',
    // Force re-encoding and downsampling of grayscale images
    '-dDownsampleGrayImages=true',
    '-dGrayImageDownsampleType=/Bicubic',
    `-dGrayImageResolution=${dpi}`,
    '-dAutoFilterGrayImages=false',
    '-dGrayImageFilter=/DCTEncode',
    // Mono images
    '-dDownsampleMonoImages=true',
    '-dMonoImageDownsampleType=/Bicubic',
    `-dMonoImageResolution=${Math.min(dpi * 2, 300)}`,
    // Optimization and font subsetting
    '-dDetectDuplicateImages=true',
    '-dCompressFonts=true',
    '-dSubsetFonts=true',
    '-dEmbedAllFonts=true',
    '-dOptimize=true',
    '-dPreserveEPSInfo=false',
    '-dPreserveOPIComments=false',
    '-dDoOutputAtts=false',
    `-sOutputFile=${outputPath}`,
    inputPath
  ];

  return new Promise((resolve, reject) => {
    execFile('gs', args, { maxBuffer: 150 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        const msg = stderr || stdout || err.message;
        reject(new Error(`Ghostscript processing failed: ${msg}`));
      } else {
        resolve();
      }
    });
  });
};

/**
 * Automatically optimizes a PDF buffer:
 * - Pass 1: Crisp 150 DPI with full DCT re-encoding & font deduplication
 * - If still over 45 MB, executes an automatic second pass at 96 DPI
 * - If still over 45 MB, executes a final pass at 72 DPI to guarantee storage compliance
 */
export const autoCompressPdfBuffer = async (inputBuffer: Buffer): Promise<Buffer> => {
  const originalSize = inputBuffer.length;
  const randomId = crypto.randomBytes(8).toString('hex');
  const tempDir = os.tmpdir();

  const inputPath = path.join(tempDir, `raw_${Date.now()}_${randomId}.pdf`);
  const pass1Path = path.join(tempDir, `pass1_${Date.now()}_${randomId}.pdf`);
  const pass2Path = path.join(tempDir, `pass2_${Date.now()}_${randomId}.pdf`);

  try {
    await fs.writeFile(inputPath, inputBuffer);

    // Pass 1: Standard high-quality 150 DPI optimization
    await runGsPass(inputPath, pass1Path, 150);
    let bestResultBuffer = await fs.readFile(pass1Path);

    // If still exceeds 45 MB, run Pass 2 automatically at 96 DPI
    if (bestResultBuffer.length > MAX_TARGET_BYTES) {
      await runGsPass(inputPath, pass2Path, 96);
      const pass2Buffer = await fs.readFile(pass2Path);
      if (pass2Buffer.length < bestResultBuffer.length) {
        bestResultBuffer = pass2Buffer;
      }
    }

    // If still exceeds 45 MB, run final 72 DPI pass
    if (bestResultBuffer.length > MAX_TARGET_BYTES) {
      await runGsPass(inputPath, pass2Path, 72);
      const pass3Buffer = await fs.readFile(pass2Path);
      if (pass3Buffer.length < bestResultBuffer.length) {
        bestResultBuffer = pass3Buffer;
      }
    }

    // Return the compressed buffer if smaller, or original if already smaller
    if (bestResultBuffer.length < originalSize) {
      return bestResultBuffer;
    }

    return inputBuffer;
  } catch (err) {
    console.error('Ghostscript compression fallback:', err);
    return inputBuffer;
  } finally {
    // Cleanup temporary files
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(pass1Path).catch(() => {});
    await fs.unlink(pass2Path).catch(() => {});
  }
};
