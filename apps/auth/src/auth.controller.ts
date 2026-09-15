import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { AuthGuard, CurrentUser, Internal, Public } from '@ore/core';
import { JwtPayload } from '@ore/core';
import { AuthTokens, adminLoginSchema, refreshTokenSchema, requestOtpSchema, verifyOtpSchema } from '@ore/contracts';

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').optional().nullable(),
  termsAccepted: z.boolean().optional(),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('request-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: process.env.NODE_ENV === 'production' ? 5 : 100, ttl: 60000 } })
  async requestOtp(@Body() body: unknown) {
    const dto = requestOtpSchema.parse(body);
    return this.auth.requestOtp(dto);
  }

  @Post('verify-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async verifyOtp(@Body() body: unknown): Promise<AuthTokens> {
    const dto = verifyOtpSchema.parse(body);
    return this.auth.verifyOtp(dto);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  refresh(@Body() body: unknown): Promise<AuthTokens> {
    const dto = refreshTokenSchema.parse(body);
    return this.auth.refresh(dto.refreshToken);
  }

  @Patch('profile')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  updateProfile(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = updateProfileSchema.parse(body);
    return this.auth.updateProfile(user.sub, dto);
  }

  @Post('admin/login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  adminLogin(@Body() body: unknown) {
    return this.auth.adminLogin(adminLoginSchema.parse(body));
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: JwtPayload) {
    return user;
  }

  /**
   * Revoke a refresh token on logout (audit F-SEC-13). The caller passes the refresh
   * token being logged out of; the service verifies it belongs to the authenticated
   * caller before recording the revocation. Idempotent.
   */
  @Post('session/revoke')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async revokeSession(@CurrentUser() user: JwtPayload, @Body() body: { refreshToken: string }) {
    if (!body?.refreshToken) throw new BadRequestException('refreshToken is required');
    return this.auth.revokeSession(user.sub, body.refreshToken);
  }

  @Get('internal/users/:id')
  @Internal()
  userById(@Param('id') id: string) {
    return this.auth.userById(id);
  }
}
