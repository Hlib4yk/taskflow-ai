#!/usr/bin/env bash
# Creates one Postgres database per microservice on first container boot,
# modeling a "database per service" layout on a single shared Postgres instance.
set -e

for DB in authdb tasksdb; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    SELECT 'CREATE DATABASE $DB'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB')\gexec
EOSQL
done
