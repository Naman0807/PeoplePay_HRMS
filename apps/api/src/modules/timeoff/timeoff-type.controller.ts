import type { Request, Response, NextFunction } from 'express';
import * as timeOffTypeService from './timeoff-type.service';
import { ok } from '../../utils/apiResponse';
import { created } from '../../utils/apiResponse';

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const timeOffTypes = await timeOffTypeService.listTimeOffTypes();
    res.json(ok(timeOffTypes));
  } catch (err) {
    next(err);
  }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const timeOffType = await timeOffTypeService.getTimeOffType(req.params.id);
    res.json(ok(timeOffType));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const timeOffType = await timeOffTypeService.createTimeOffType(req.body);
    res.status(201).json(created(timeOffType));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const timeOffType = await timeOffTypeService.updateTimeOffType(req.params.id, req.body);
    res.json(ok(timeOffType));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await timeOffTypeService.deleteTimeOffType(req.params.id);
    res.json(ok(result));
  } catch (err) {
    next(err);
  }
}