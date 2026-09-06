import type { Request, Response, NextFunction } from 'express';
import * as scheduleService from './schedule.service';
import { ok, created } from '../../utils/apiResponse';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const schedules = await scheduleService.listSchedules(req.query as any);
    res.json(ok(schedules));
  } catch (err) {
    next(err);
  }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const schedule = await scheduleService.getSchedule(req.params.id);
    res.json(ok(schedule));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const schedule = await scheduleService.createSchedule(req.body);
    res.status(201).json(created(schedule));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const schedule = await scheduleService.updateSchedule(req.params.id, req.body);
    res.json(ok(schedule));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const schedule = await scheduleService.deleteSchedule(req.params.id);
    res.json(ok(schedule));
  } catch (err) {
    next(err);
  }
}
