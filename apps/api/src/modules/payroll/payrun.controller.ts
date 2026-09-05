import type { Request, Response, NextFunction } from 'express';
import * as payrunService from './payrun.service';
import { ok, created } from '../../utils/apiResponse';

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const payruns = await payrunService.listPayruns();
    res.json(ok(payruns));
  } catch (err) {
    next(err);
  }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const payrun = await payrunService.getPayrun(req.params.id);
    res.json(ok(payrun));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const payrun = await payrunService.createPayrun(req.body, req.user!.id);
    res.status(201).json(created(payrun));
  } catch (err) {
    next(err);
  }
}

export async function getEligibleEmployees(req: Request, res: Response, next: NextFunction) {
  try {
    const employees = await payrunService.getEligibleEmployees(req.params.id);
    res.json(ok(employees));
  } catch (err) {
    next(err);
  }
}

export async function selectEmployees(req: Request, res: Response, next: NextFunction) {
  try {
    await payrunService.selectEmployees(req.params.id, req.body.employee_ids);
    res.json(ok({ message: 'Employees selected successfully' }));
  } catch (err) {
    next(err);
  }
}

export async function compute(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await payrunService.computePayrun(req.params.id);
    res.json(ok(result));
  } catch (err) {
    next(err);
  }
}

export async function validate(req: Request, res: Response, next: NextFunction) {
  try {
    const payrun = await payrunService.validatePayrun(req.params.id);
    res.json(ok(payrun));
  } catch (err) {
    next(err);
  }
}

export async function markPaid(req: Request, res: Response, next: NextFunction) {
  try {
    const payrun = await payrunService.markPayrunPaid(req.params.id);
    res.json(ok(payrun));
  } catch (err) {
    next(err);
  }
}

export async function listEmployees(req: Request, res: Response, next: NextFunction) {
  try {
    const employees = await payrunService.listPayrunEmployees(req.params.id);
    res.json(ok(employees));
  } catch (err) {
    next(err);
  }
}

export async function listPayslips(req: Request, res: Response, next: NextFunction) {
  try {
    const payslips = await payrunService.listPayrunPayslips(req.params.id);
    res.json(ok(payslips));
  } catch (err) {
    next(err);
  }
}