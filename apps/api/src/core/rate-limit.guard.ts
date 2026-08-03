import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";

export const RATE_LIMIT_KEY = "rateLimit";
export const RateLimit = (limit: number, windowMs: number) =>
  SetMetadata(RATE_LIMIT_KEY, { limit, windowMs });

type Bucket = { count: number; resetAt: number };

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();
  private readonly reflector = new Reflector();

  canActivate(context: ExecutionContext): boolean {
    const cfg = this.reflector.getAllAndOverride<{ limit: number; windowMs: number }>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!cfg) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const ip =
      (typeof req.headers["x-forwarded-for"] === "string"
        ? req.headers["x-forwarded-for"].split(",")[0]?.trim()
        : null) ||
      req.ip ||
      "unknown";
    const key = `${context.getClass().name}:${context.getHandler().name}:${ip}`;
    const now = Date.now();
    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + cfg.windowMs });
      return true;
    }

    existing.count += 1;
    if (existing.count > cfg.limit) {
      throw new HttpException("Too many requests. Please try again later.", HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
