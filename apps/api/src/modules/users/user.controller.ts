import type { Request, Response, NextFunction } from 'express';
import * as userService from './user.service';
import { ok, created } from '../../utils/apiResponse';
import type { ListUsersQuery } from './user.validation';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { items, meta } = await userService.listUsers(
      req.query as unknown as ListUsersQuery
    );
    res.json(ok(items, meta));
  } catch (err) {
    next(err);
  }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.getUser(req.params.id);
    res.json(ok(user));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(created(user));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    res.json(ok(user));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.deleteUser(req.params.id);
    res.json(ok(user));
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.updateUserStatus(req.params.id, req.body);
    res.json(ok(user));
  } catch (err) {
    next(err);
  }
}

export async function listPending(_req: Request, res: Response, next: NextFunction) {
  try {
    const users = await userService.listPendingUsers();
    res.json(ok(users));
  } catch (err) {
    next(err);
  }
}

export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.approveUser(req.params.id);
    res.json(ok(user));
  } catch (err) {
    next(err);
  }
}

export async function reject(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.rejectUser(req.params.id);
    res.json(ok(user));
  } catch (err) {
    next(err);
  }
}