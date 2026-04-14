import type { Request, Response } from 'express';
import {
  IMPORT_FILE_ORDER,
  IMPORT_TEMPLATES,
  importSpreadsheet,
  listImportBatches,
  resetSystemData,
  rollbackImportBatch,
} from '../services/adminImport.service.js';
import {
  createElection,
  deleteElection,
  getElectionDetails,
  getElectionSetupSummary,
  listElections,
  updateElection,
  updateElectionStatus,
} from '../services/election.service.js';

export async function getAdminElections(_req: Request, res: Response) {
  res.json({ success: true, data: await listElections() });
}

export async function postAdminElection(req: Request, res: Response) {
  const election = await createElection(req.body, req.user?.email || req.user?.uid);
  res.status(201).json({ success: true, data: election });
}

export async function getAdminElectionById(req: Request, res: Response) {
  const election = await getElectionDetails(req.params.id);
  if (!election) {
    return res.status(404).json({ success: false, message: 'Election not found' });
  }
  res.json({ success: true, data: election });
}

export async function putAdminElection(req: Request, res: Response) {
  const election = await updateElection(req.params.id, req.body, req.user?.email || req.user?.uid);
  res.json({ success: true, data: election });
}

export async function patchAdminElectionStatus(req: Request, res: Response) {
  const election = await updateElectionStatus(
    req.params.id,
    req.body?.status,
    req.user?.email || req.user?.uid,
  );
  res.json({ success: true, data: election });
}

export async function deleteAdminElection(req: Request, res: Response) {
  const result = await deleteElection(req.params.id, req.user?.email || req.user?.uid);
  res.json({ success: true, data: result });
}

export async function getAdminElectionSetupSummary(req: Request, res: Response) {
  res.json({ success: true, data: await getElectionSetupSummary(req.params.id) });
}

export async function getImportConfig(_req: Request, res: Response) {
  res.json({
    success: true,
    data: {
      order: IMPORT_FILE_ORDER,
      templates: IMPORT_TEMPLATES,
    },
  });
}

export async function getImportBatches(req: Request, res: Response) {
  const electionId = typeof req.query.electionId === 'string' ? req.query.electionId : undefined;
  res.json({ success: true, data: await listImportBatches(electionId) });
}

export async function postImport(req: Request, res: Response) {
  const kind = String(req.params.kind || '').replace(/-/g, '_');
  if (!(kind in IMPORT_TEMPLATES)) {
    return res.status(404).json({ success: false, message: 'Import type not supported' });
  }

  if (!req.file?.buffer) {
    return res.status(400).json({ success: false, message: 'Upload a CSV or XLSX file in the "file" field' });
  }

  const electionId =
    typeof req.body?.electionId === 'string'
      ? req.body.electionId
      : typeof req.query.electionId === 'string'
        ? req.query.electionId
        : null;
  const summary = await importSpreadsheet(kind as keyof typeof IMPORT_TEMPLATES, req.file, req.user?.email, electionId);
  res.status(201).json({ success: true, data: summary });
}

export async function deleteImportBatch(req: Request, res: Response) {
  const result = await rollbackImportBatch(req.params.batchId, req.user?.email || req.user?.uid);
  res.json({ success: true, data: result });
}

export async function postResetSystemData(req: Request, res: Response) {
  const result = await resetSystemData(req.user?.email || req.user?.uid);
  res.json({ success: true, data: result });
}
