/**
 * Chunked Array Processing & Atomic Firestore Batch Worker
 * Safely processes up to 5,000+ student records without triggering 
 * network timeouts or front-end memory drops.
 * 
 * - Chunks validated spreadsheet rows into arrays of exactly 500 items (Firestore limit).
 * - Commits each 500-student cluster using atomic writeBatch().
 * - Enforces complete atomicity: if row 421 throws a validation error 
 *   (e.g., bad duplicate data structure), the entire block rolls back cleanly.
 */

import { doc, writeBatch, db } from '../firebase';
import { FeeUploadBatchItem, Student } from '../types/fee';
import { toPaisa, fromPaisa, paisaSub } from '../utils/paisaMath';

export const FIRESTORE_MAX_BATCH_SIZE = 500;

export interface ChunkProgress {
  currentChunkIndex: number;
  totalChunks: number;
  processedRows: number;
  totalRows: number;
  currentChunkSize: number;
  isRollingBack: boolean;
  rollbackReason?: string;
  completedClusterHashes: string[];
  isCompleted: boolean;
  error?: string;
}

export interface ChunkWorkerOptions {
  chunkSize?: number;
  onProgress?: (progress: ChunkProgress) => void;
  // Optional audit test hook: simulate failure at specific 1-based row number (e.g. 421)
  simulateErrorAtRow?: number;
  // Additional promotion target semester (if batch includes promotion)
  targetSemester?: number;
  academicSession?: string;
}

export interface ChunkWorkerResult {
  success: boolean;
  totalProcessed: number;
  totalChunksCommitted: number;
  rolledBackChunkIndex?: number;
  failedRowNumber?: number;
  failedItemRollNo?: string;
  error?: string;
  clusterHashes: string[];
}

/**
 * Splits an array into sub-arrays of strictly bounded size (500 items).
 */
export function chunkArray<T>(items: T[], chunkSize: number = FIRESTORE_MAX_BATCH_SIZE): T[][] {
  if (!items || items.length === 0) return [];
  const safeChunkSize = Math.max(1, Math.min(chunkSize, FIRESTORE_MAX_BATCH_SIZE));
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += safeChunkSize) {
    chunks.push(items.slice(i, i + safeChunkSize));
  }
  return chunks;
}

/**
 * Validates a single 500-student cluster for duplicate keys, malformed objects,
 * or corrupted financial data prior to queueing onto writeBatch().
 * Throws an explicit descriptive error if any row is corrupted.
 */
export function validateClusterAtomicity(
  cluster: FeeUploadBatchItem[],
  chunkIndex: number,
  globalOffset: number,
  simulateErrorAtRow?: number
): void {
  const seenRollNumbers = new Set<string>();

  for (let i = 0; i < cluster.length; i++) {
    const item = cluster[i];
    const currentRowNumber = item.rowNumber || (globalOffset + i + 1);

    // Simulated error check for testing and AG audit demonstrations
    if (simulateErrorAtRow && currentRowNumber === simulateErrorAtRow) {
      throw new Error(
        `[Cluster Validation Error] Row ${currentRowNumber} (Roll No: ${item.rollNo || 'UNKNOWN'}): Simulated bad duplicate data structure triggered. Entire 500-student transaction block aborted.`
      );
    }

    if (!item.rollNo || typeof item.rollNo !== 'string' || item.rollNo.trim() === '') {
      throw new Error(
        `[Cluster Validation Error] Row ${currentRowNumber}: Missing or malformed student roll number. Entire 500-student transaction block aborted.`
      );
    }

    const cleanRollNo = item.rollNo.trim().toUpperCase();
    if (seenRollNumbers.has(cleanRollNo)) {
      throw new Error(
        `[Cluster Validation Error] Row ${currentRowNumber} (Roll No: ${cleanRollNo}): Bad duplicate data structure detected in cluster. Entire 500-student transaction block aborted.`
      );
    }
    seenRollNumbers.add(cleanRollNo);

    // Financial validation in integer Paisa
    const newTotalPaisa = toPaisa(item.newTotalFeePayable);
    if (!Number.isFinite(newTotalPaisa) || newTotalPaisa < 0) {
      throw new Error(
        `[Cluster Validation Error] Row ${currentRowNumber} (Roll No: ${cleanRollNo}): Invalid negative or corrupted fee value (₹${item.newTotalFeePayable}). Entire 500-student transaction block aborted.`
      );
    }
  }
}

/**
 * Recursive Worker Loop for Chunked Array Processing with Atomic writeBatch Commit
 */
export async function executeChunkedBatchUpload(
  validatedItems: FeeUploadBatchItem[],
  existingStudents: Student[],
  options: ChunkWorkerOptions = {}
): Promise<ChunkWorkerResult> {
  const chunkSize = options.chunkSize || FIRESTORE_MAX_BATCH_SIZE;
  const chunks = chunkArray(validatedItems, chunkSize);
  const totalChunks = chunks.length;
  const totalRows = validatedItems.length;

  if (totalRows === 0) {
    return {
      success: true,
      totalProcessed: 0,
      totalChunksCommitted: 0,
      clusterHashes: [],
    };
  }

  const clusterHashes: string[] = [];
  let processedRowCount = 0;

  // Student lookup index by roll number for fast matching without nested O(N^2) loops
  const studentByRoll = new Map<string, Student>();
  for (const stu of existingStudents) {
    studentByRoll.set(stu.rollNo.trim().toUpperCase(), stu);
  }

  /**
   * Recursive worker step: processes exactly one chunk of 500 rows.
   */
  async function processNextChunk(chunkIndex: number): Promise<ChunkWorkerResult> {
    if (chunkIndex >= totalChunks) {
      // All chunks successfully completed!
      if (options.onProgress) {
        options.onProgress({
          currentChunkIndex: totalChunks,
          totalChunks,
          processedRows: totalRows,
          totalRows,
          currentChunkSize: 0,
          isRollingBack: false,
          completedClusterHashes: clusterHashes,
          isCompleted: true,
        });
      }

      return {
        success: true,
        totalProcessed: processedRowCount,
        totalChunksCommitted: clusterHashes.length,
        clusterHashes,
      };
    }

    const currentCluster = chunks[chunkIndex];
    const globalOffset = chunkIndex * chunkSize;

    if (options.onProgress) {
      options.onProgress({
        currentChunkIndex: chunkIndex + 1,
        totalChunks,
        processedRows: processedRowCount,
        totalRows,
        currentChunkSize: currentCluster.length,
        isRollingBack: false,
        completedClusterHashes: clusterHashes,
        isCompleted: false,
      });
    }

    try {
      // Step 1: Pre-validation of the entire 500-row cluster
      // If ANY row in this cluster (e.g. row 421) fails validation, it throws and aborts before writeBatch()
      validateClusterAtomicity(
        currentCluster,
        chunkIndex,
        globalOffset,
        options.simulateErrorAtRow
      );

      // Step 2: Prepare atomic Firestore writeBatch
      const batch = writeBatch(db);
      const timestamp = new Date().toISOString();

      for (let i = 0; i < currentCluster.length; i++) {
        const item = currentCluster[i];
        const cleanRoll = item.rollNo.trim().toUpperCase();
        const matchedStudent = studentByRoll.get(cleanRoll);

        const studentId = matchedStudent ? matchedStudent.id : `STU-${cleanRoll}`;
        const studentDocRef = doc(db, 'students', studentId);

        const newTotalPaisa = toPaisa(item.newTotalFeePayable);
        const currentPaidPaisa = toPaisa(matchedStudent?.paidFee || 0);
        const newPendingPaisa = paisaSub(newTotalPaisa, currentPaidPaisa, true);

        const updatePayload: Record<string, unknown> = {
          id: matchedStudent?.id || studentId,
          course: matchedStudent?.course || 'B.Tech',
          name: matchedStudent?.name || item.studentName || 'Student',
          rollNo: cleanRoll,
          semester: options.targetSemester || item.promotedSemester || matchedStudent?.semester || 1,
          totalFee: fromPaisa(newTotalPaisa),
          paidFee: matchedStudent?.paidFee ?? 0,
          pendingFee: Math.max(0, fromPaisa(newPendingPaisa)),
          updatedAt: timestamp,
          lastBatchUpdate: {
            batchRow: item.rowNumber || (globalOffset + i + 1),
            chunkIndex,
            appliedAt: timestamp,
            academicSession: options.academicSession || '2025-2026',
          },
        };

        // If batch includes student promotion
        if (options.targetSemester && options.targetSemester > 0) {
          updatePayload.promotionStatus = 'Promoted';
        } else if (item.promotedSemester && item.promotedSemester > 0) {
          updatePayload.promotionStatus = 'Promoted';
        }

        batch.set(studentDocRef, updatePayload, { merge: true });
      }

      // Step 3: Atomic commit of the 500-student block
      await batch.commit();

      const clusterHash = `CLUSTER-${chunkIndex + 1}-OF-${totalChunks}-${Date.now().toString(36).toUpperCase()}`;
      clusterHashes.push(clusterHash);
      processedRowCount += currentCluster.length;

      // Yield control to event loop to eliminate UI freeze and memory drops
      await new Promise((resolve) => setTimeout(resolve, 25));

      // Step 4: Tail-recursive invocation of the next 500-row chunk
      return processNextChunk(chunkIndex + 1);

    } catch (err: unknown) {
      // Step 5: Atomicity Rollback Handler
      // The current 500-student batch was not committed, preventing partial database state
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.warn(`[Batch Worker Rollback] Chunk ${chunkIndex + 1} rolled back cleanly:`, errorMessage);

      if (options.onProgress) {
        options.onProgress({
          currentChunkIndex: chunkIndex + 1,
          totalChunks,
          processedRows: processedRowCount,
          totalRows,
          currentChunkSize: currentCluster.length,
          isRollingBack: true,
          rollbackReason: errorMessage,
          completedClusterHashes: clusterHashes,
          isCompleted: false,
          error: errorMessage,
        });
      }

      // Extract failed row number if present in error message
      const rowMatch = errorMessage.match(/Row\s+(\d+)/i);
      const failedRowNumber = rowMatch ? parseInt(rowMatch[1], 10) : undefined;

      return {
        success: false,
        totalProcessed: processedRowCount,
        totalChunksCommitted: clusterHashes.length,
        rolledBackChunkIndex: chunkIndex,
        failedRowNumber,
        error: errorMessage,
        clusterHashes,
      };
    }
  }

  // Start the recursive loop from chunk 0
  return processNextChunk(0);
}
