import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser, RequirePermission, Roles } from '@ore/core';
import { JwtPayload } from '@ore/core';
import { Role, taxComponentClassificationSchema, taxReviewResolveSchema, taxRuleUpsertSchema } from '@ore/contracts';
import { TaxEngineService } from './tax-engine.service';

@Controller('admin/tax')
@UseGuards(AuthGuard)
@Roles(Role.ADMIN)
export class TaxController {
  constructor(private readonly tax: TaxEngineService) {}

  @Get('rules')
  @RequirePermission('tax.rule.read')
  rules(@Query('taxType') taxType?: string) {
    return this.tax.listRules(taxType);
  }

  @Post('rules')
  @RequirePermission('tax.rule.manage')
  upsertRule(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = taxRuleUpsertSchema.parse(body);
    return this.tax.upsertRule(user, dto);
  }

  @Post('classifications')
  @RequirePermission('tax.classification.create')
  classify(@Body() body: unknown) {
    const dto = taxComponentClassificationSchema.parse(body);
    return this.tax.classifyGenericComponent(dto);
  }

  @Get('ledger')
  @RequirePermission('tax.ledger.read')
  ledger(@Query('orderId') orderId?: string, @Query('taxType') taxType?: string, @Query('taxPeriod') taxPeriod?: string) {
    return this.tax.listTaxLedger({ orderId, taxType, taxPeriod });
  }

  @Get('wht-decisions')
  @RequirePermission('tax.wht.read')
  wht(@Query('supplierId') supplierId?: string, @Query('status') status?: string, @Query('taxYear') taxYear?: string) {
    return this.tax.listWhtDecisions({ supplierId, status, taxYear: taxYear ? Number(taxYear) : undefined });
  }

  @Get('reviews')
  @RequirePermission('tax.review.read')
  reviews(@Query('status') status?: string) {
    return this.tax.listReviewCases(status);
  }

  @Post('reviews/:id/resolve')
  @RequirePermission('tax.review.resolve')
  resolveReview(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = taxReviewResolveSchema.parse(body);
    return this.tax.resolveReviewCase(user, id, dto.note);
  }
}
