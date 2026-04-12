import { Router } from 'express';
import multer from 'multer';
import {
  deleteAdminElection,
  deleteImportBatch,
  getAdminElectionById,
  getAdminElections,
  getAdminElectionSetupSummary,
  getImportBatches,
  getImportConfig,
  patchAdminElectionStatus,
  postResetSystemData,
  postAdminElection,
  postImport,
  putAdminElection,
} from '../controllers/admin.controller.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

export const adminRoutes = Router();

adminRoutes.use(authMiddleware, adminMiddleware);

adminRoutes.get('/import/config', asyncHandler(getImportConfig));
adminRoutes.get('/import/batches', asyncHandler(getImportBatches));
adminRoutes.post('/import/:kind', upload.single('file'), asyncHandler(postImport));
adminRoutes.delete('/import/batches/:batchId', asyncHandler(deleteImportBatch));
adminRoutes.post('/system/reset-data', asyncHandler(postResetSystemData));

adminRoutes.get('/elections', asyncHandler(getAdminElections));
adminRoutes.post('/elections', asyncHandler(postAdminElection));
adminRoutes.get('/elections/:id/setup-summary', asyncHandler(getAdminElectionSetupSummary));
adminRoutes.get('/elections/:id', asyncHandler(getAdminElectionById));
adminRoutes.put('/elections/:id', asyncHandler(putAdminElection));
adminRoutes.patch('/elections/:id/status', asyncHandler(patchAdminElectionStatus));
adminRoutes.delete('/elections/:id', asyncHandler(deleteAdminElection));
