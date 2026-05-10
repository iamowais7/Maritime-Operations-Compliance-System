#!/bin/sh
echo "Running migrations..."
npx prisma migrate deploy

echo "Seeding database..."
npx ts-node prisma/seed.ts

echo "Starting server..."
node dist/index.js
