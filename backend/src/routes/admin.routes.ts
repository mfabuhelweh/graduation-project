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
import {
  adminMiddleware,
  electionManagementMiddleware,
} from '../middleware/adminMiddleware.js';
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
adminRoutes.post(
  '/import/:kind',
  electionManagementMiddleware,
  upload.single('file'),
  asyncHandler(postImport),
);
adminRoutes.delete('/import/batches/:batchId', electionManagementMiddleware, asyncHandler(deleteImportBatch));
adminRoutes.post('/system/reset-data', electionManagementMiddleware, asyncHandler(postResetSystemData));

adminRoutes.get('/elections', asyncHandler(getAdminElections));
adminRoutes.post('/elections', electionManagementMiddleware, asyncHandler(postAdminElection));
adminRoutes.get('/elections/:id/setup-summary', asyncHandler(getAdminElectionSetupSummary));
adminRoutes.get('/elections/:id', asyncHandler(getAdminElectionById));
adminRoutes.put('/elections/:id', electionManagementMiddleware, asyncHandler(putAdminElection));
adminRoutes.patch('/elections/:id/status', electionManagementMiddleware, asyncHandler(patchAdminElectionStatus));
adminRoutes.delete('/elections/:id', electionManagementMiddleware, asyncHandler(deleteAdminElection));
