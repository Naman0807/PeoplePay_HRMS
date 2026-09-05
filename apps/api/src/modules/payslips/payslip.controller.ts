import type { Request, Response, NextFunction } from 'express';
import * as payslipService from './payslip.service';
import { ok } from '../../utils/apiResponse';
import type { ListPayslipsQuery } from './payslip.validation';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { items, meta } = await payslipService.listPayslips(
      req.user!.id,
      req.user!.role,
      req.query as unknown as ListPayslipsQuery
    );
    res.json(ok(items, meta));
  } catch (err) {
    next(err);
  }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const payslip = await payslipService.getPayslip(
      req.params.id,
      req.user!.id,
      req.user!.role
    );
    res.json(ok(payslip));
  } catch (err) {
    next(err);
  }
}

export async function listItems(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await payslipService.listPayslipItems(
      req.params.id,
      req.user!.id,
      req.user!.role
    );
    res.json(ok(items));
  } catch (err) {
    next(err);
  }
}