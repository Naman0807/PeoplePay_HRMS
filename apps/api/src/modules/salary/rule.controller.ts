import type { Request, Response, NextFunction } from 'express';
import * as ruleService from './rule.service';
import { ok, created } from '../../utils/apiResponse';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const rules = await ruleService.listRules(req.params.structureId);
    res.json(ok(rules));
  } catch (err) {
    next(err);
  }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const rule = await ruleService.getRule(req.params.id);
    res.json(ok(rule));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const rule = await ruleService.createRule(req.params.structureId, req.body);
    res.status(201).json(created(rule));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const rule = await ruleService.updateRule(req.params.id, req.body);
    res.json(ok(rule));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await ruleService.deleteRule(req.params.id);
    res.json(ok({ message: 'Rule deleted successfully' }));
  } catch (err) {
    next(err);
  }
}

export async function reorder(req: Request, res: Response, next: NextFunction) {
  try {
    const rules = await ruleService.reorderRules(req.body.rule_ids);
    res.json(ok(rules));
  } catch (err) {
    next(err);
  }
}