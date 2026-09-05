import type { Request, Response, NextFunction } from 'express';
import * as requestService from './request.service';
import { ok, created } from '../../utils/apiResponse';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const employeeId = req.query.employee_id as string | undefined;
    const requests = await requestService.listRequests(req.user!.id, req.user!.role, employeeId);
    res.json(ok(requests));
  } catch (err) {
    next(err);
  }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const request = await requestService.getRequest(req.params.id);
    res.json(ok(request));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const request = await requestService.createRequest(req.body, req.user!.id, req.user!.role);
    res.status(201).json(created(request));
  } catch (err) {
    next(err);
  }
}

export async function submit(req: Request, res: Response, next: NextFunction) {
  try {
    const request = await requestService.submitRequest(req.params.id);
    res.json(ok(request));
  } catch (err) {
    next(err);
  }
}

export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    const request = await requestService.approveRequest(req.params.id, req.user!.id);
    res.json(ok(request));
  } catch (err) {
    next(err);
  }
}

export async function refuse(req: Request, res: Response, next: NextFunction) {
  try {
    const request = await requestService.refuseRequest(req.params.id, req.user!.id);
    res.json(ok(request));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const request = await requestService.updateRequest(req.params.id, req.body);
    res.json(ok(request));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await requestService.deleteRequest(req.params.id);
    res.json(ok(result));
  } catch (err) {
    next(err);
  }
}