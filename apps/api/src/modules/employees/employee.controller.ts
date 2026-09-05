import type { Request, Response, NextFunction } from 'express';
import * as employeeService from './employee.service';
import { ok, created } from '../../utils/apiResponse';
import type { ListEmployeesQuery, DirectoryQuery } from './employee.validation';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { items, meta } = await employeeService.listEmployees(
      req.query as unknown as ListEmployeesQuery,
      req.user!.id,
      req.user!.role
    );
    res.json(ok(items, meta));
  } catch (err) {
    next(err);
  }
}

export async function getDirectory(req: Request, res: Response, next: NextFunction) {
  try {
    const employees = await employeeService.listDirectory(req.query as unknown as DirectoryQuery);
    res.json(ok(employees));
  } catch (err) {
    next(err);
  }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const employee = await employeeService.getEmployee(
      req.params.id,
      req.user!.id,
      req.user!.role
    );
    res.json(ok(employee));
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const employee = await employeeService.getMyEmployee(req.user!.id);
    res.json(ok(employee));
  } catch (err) {
    next(err);
  }
}

export async function getFormData(_req: Request, res: Response, next: NextFunction) {
  try {
    const formData = await employeeService.getFormData();
    res.json(ok(formData));
  } catch (err) {
    next(err);
  }
}

export async function getKanban(_req: Request, res: Response, next: NextFunction) {
  try {
    const kanban = await employeeService.getKanban();
    res.json(ok(kanban));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const employee = await employeeService.createEmployee(req.body);
    res.status(201).json(created(employee));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const employee = await employeeService.updateEmployee(req.params.id, req.body);
    res.json(ok(employee));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const employee = await employeeService.deleteEmployee(req.params.id);
    res.json(ok(employee));
  } catch (err) {
    next(err);
  }
}