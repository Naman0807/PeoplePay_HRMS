import type { Request, Response, NextFunction } from 'express';
import * as attendanceService from './attendance.service';
import { ok, created } from '../../utils/apiResponse';
import type { ListAttendanceQuery, UpdateAttendanceInput } from './attendance.validation';

export async function punchIn(req: Request, res: Response, next: NextFunction) {
  try {
    const record = await attendanceService.punchIn(req.user!.id);
    res.status(201).json(created(record));
  } catch (err) {
    next(err);
  }
}

export async function punchOut(req: Request, res: Response, next: NextFunction) {
  try {
    const record = await attendanceService.punchOut(req.user!.id);
    res.json(ok(record));
  } catch (err) {
    next(err);
  }
}

export async function listOwn(req: Request, res: Response, next: NextFunction) {
  try {
    const records = await attendanceService.listOwnAttendance(
      req.user!.id,
      req.query as unknown as ListAttendanceQuery
    );
    res.json(ok(records));
  } catch (err) {
    next(err);
  }
}

export async function listAll(req: Request, res: Response, next: NextFunction) {
  try {
    const records = await attendanceService.listAllAttendance(
      req.query as unknown as ListAttendanceQuery
    );
    res.json(ok(records));
  } catch (err) {
    next(err);
  }
}

export async function listExceptions(req: Request, res: Response, next: NextFunction) {
  try {
    const records = await attendanceService.listExceptions(
      req.query as unknown as ListAttendanceQuery
    );
    res.json(ok(records));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const record = await attendanceService.updateAttendance(
      req.params.id,
      req.body as UpdateAttendanceInput,
      req.user!.id
    );
    res.json(ok(record));
  } catch (err) {
    next(err);
  }
}
