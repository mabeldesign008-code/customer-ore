/** Consistent error envelope: { error: { code, message, statusCode, traceId } } */
import { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
export declare class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger;
    catch(exception: unknown, host: ArgumentsHost): void;
}
//# sourceMappingURL=filter.d.ts.map