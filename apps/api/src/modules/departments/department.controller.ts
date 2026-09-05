import type { Request, Response, NextFunction } from 'express';
import * as departmentService from './department.service';
import { ok, created } from '../../utils/apiResponse';

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const departments = await departmentService.listDepartments();
    res.json(ok(departments));
  } catch (err) {
    next(err);
  }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const department = await departmentService.getDepartment(req.params.id);
    res.json(ok(department));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const department = await departmentService.createDepartment(req.body);
    res.status(201).json(created(department));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const department = await departmentService.updateDepartment(req.params.id, req.body);
    res.json(ok(department));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const department = await departmentService.deleteDepartment(req.params.id);
    res.json(ok(department));
  } catch (err) {
    next(err);
  }
}
