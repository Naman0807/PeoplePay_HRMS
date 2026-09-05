import { Request, Response, NextFunction } from 'express';
import * as contractService from './contract.service';
import { ok, created } from '../../utils/apiResponse';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await contractService.listContracts(req.query as any);
    res.json(ok(result));
  } catch (err) {
    next(err);
  }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await contractService.getContract(req.params.id);
    res.json(ok(result));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await contractService.createContract(req.body);
    res.status(201).json(created(result));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await contractService.updateContract(req.params.id, req.body);
    res.json(ok(result));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await contractService.deleteContract(req.params.id);
    res.json(ok({ message: 'Contract deleted' }));
  } catch (err) {
    next(err);
  }
}
