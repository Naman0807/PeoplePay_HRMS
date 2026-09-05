import { NextFunction, Request, Response } from 'express';
import { ok } from '../../utils/apiResponse';
import * as service from './dashboard.service';

export async function getKpis(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getKpis();
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
}

export async function getAttendanceChart(req: Request, res: Response, next: NextFunction) {
  try {
    const days = Number(req.query.days) || 30;
    const data = await service.getAttendanceChart(days);
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
}

export async function getDepartmentChart(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getDepartmentChart();
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
}

export async function getPayrollChart(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getPayrollChart();
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
}
