import type { Request, Response, NextFunction } from 'express';
import * as allocationService from './allocation.service';
import { ok, created } from '../../utils/apiResponse';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const employeeId = req.query.employee_id as string | undefined;
    const allocations = await allocationService.listAllocations(
      req.user!.id,
      req.user!.role,
      employeeId
    );
    res.json(ok(allocations));
  } catch (err) {
    next(err);
  }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const allocation = await allocationService.getAllocation(
      req.params.id,
      req.user!.id,
      req.user!.role
    );
    res.json(ok(allocation));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const allocation = await allocationService.createAllocation(req.body);
    res.status(201).json(created(allocation));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const allocation = await allocationService.updateAllocation(req.params.id, req.body);
    res.json(ok(allocation));
  } catch (err) {
    next(err);
  }
}

export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    const allocation = await allocationService.approveAllocation(req.params.id);
    res.json(ok(allocation));
  } catch (err) {
    next(err);
  }
}

export async function refuse(req: Request, res: Response, next: NextFunction) {
  try {
    const allocation = await allocationService.refuseAllocation(req.params.id);
    res.json(ok(allocation));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await allocationService.deleteAllocation(req.params.id);
    res.json(ok(result));
  } catch (err) {
    next(err);
  }
}
