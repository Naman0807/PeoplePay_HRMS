import type { Request, Response, NextFunction } from 'express';
import * as structureService from './structure.service';
import { ok, created } from '../../utils/apiResponse';

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const structures = await structureService.listStructures();
    res.json(ok(structures));
  } catch (err) {
    next(err);
  }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const structure = await structureService.getStructure(req.params.id);
    res.json(ok(structure));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const structure = await structureService.createStructure(req.body);
    res.status(201).json(created(structure));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const structure = await structureService.updateStructure(req.params.id, req.body);
    res.json(ok(structure));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await structureService.deleteStructure(req.params.id);
    res.json(ok({ message: 'Structure deleted successfully' }));
  } catch (err) {
    next(err);
  }
}
