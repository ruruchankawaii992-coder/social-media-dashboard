# =============================================================================
# Database initialization container
# =============================================================================
# Uses postgres:16-alpine as the base image. The init.sql and seed.sql
# scripts are placed in docker-entrypoint-initdb.d/ where PostgreSQL's
# entrypoint runs them automatically on first database start.
#
# Scripts run in alphabetical order, so 01-init.sql runs before 02-seed.sql.
# =============================================================================

FROM postgres:16-alpine

# Copy schema and seed scripts into the auto-execution directory.
# The entrypoint runs all .sql and .sh files in this directory on first start.
COPY init.sql  /docker-entrypoint-initdb.d/01-init.sql
COPY seed.sql  /docker-entrypoint-initdb.d/02-seed.sql
