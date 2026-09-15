@echo off
set DB_TYPE=postgres
set DATABASE_URL=postgres://ore:ore_dev_pw_123@127.0.0.1:5432/oredelivery
set ORCHESTRATION=distributed
set REDIS_URL=redis://:ore_dev_redis_123@127.0.0.1:6379
set NATS_URL=nats://ore-bus:ore_dev_nats_123@127.0.0.1:4222
call pnpm seed
exit /b %ERRORLEVEL%
