import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { z, ZodError } from "zod";
import { AuthService } from "./auth.service";
import { AuthPasswordService } from "./auth-password.service";
import { Public } from "./public.decorator";
import { loadEnv } from "@cc/config";
import { RolesGuard } from "./roles.guard";
import { RateLimit, RateLimitGuard } from "../../core/rate-limit.guard";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const trackingLoginSchema = z.object({
  trackingId: z.string().min(6),
  phoneLast4: z.string().regex(/^\d{4}$/),
});

const registerCustomerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(7).optional(),
});

function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new BadRequestException(err.flatten());
    }
    throw err;
  }
}

@Controller("auth")
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly passwords: AuthPasswordService,
  ) {}

  @Public()
  @RateLimit(20, 60_000)
  @Post("login")
  async login(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const dto = parseBody(loginSchema, body);
    const result = await this.auth.loginWithPassword(dto.email, dto.password);
    this.setCookie(res, result.token);
    return result;
  }

  @Public()
  @RateLimit(5, 60_000)
  @Post("forgot-password")
  forgot(@Body() body: unknown) {
    const dto = parseBody(z.object({ email: z.string().email() }), body);
    return this.passwords.requestReset(dto.email);
  }

  @Public()
  @RateLimit(10, 60_000)
  @Post("reset-password")
  reset(@Body() body: unknown) {
    const dto = parseBody(
      z.object({
        token: z.string().min(20),
        password: z.string().min(8),
      }),
      body,
    );
    return this.passwords.resetPassword(dto.token, dto.password);
  }

  @Public()
  @RateLimit(20, 60_000)
  @Post("login/tracking")
  async loginTracking(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const dto = parseBody(trackingLoginSchema, body);
    const result = await this.auth.loginWithTrackingId(dto.trackingId, dto.phoneLast4);
    this.setCookie(res, result.token);
    return result;
  }

  @Public()
  @RateLimit(10, 60_000)
  @Post("register")
  async register(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const dto = parseBody(registerCustomerSchema, body);
    const result = await this.auth.registerCustomer(dto);
    this.setCookie(res, result.token);
    return result;
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) res: Response) {
    const env = loadEnv();
    res.clearCookie("cc_token", {
      httpOnly: true,
      sameSite: "lax",
      secure: env.COOKIE_SECURE,
      path: "/",
    });
    return { ok: true };
  }

  @Get("me")
  @UseGuards(RolesGuard)
  async me(@Req() req: Request & { user?: { sub: string } }) {
    if (!req.user?.sub) throw new UnauthorizedException();
    return this.auth.me(req.user.sub);
  }

  private setCookie(res: Response, token: string) {
    const env = loadEnv();
    res.cookie("cc_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.COOKIE_SECURE,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
