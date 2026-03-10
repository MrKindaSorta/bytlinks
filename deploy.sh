#!/bin/bash
set -e

echo "=== BytLinks Cloudflare Deployment ==="
echo ""

# 1. Check wrangler auth
echo "Checking Cloudflare authentication..."
if ! wrangler whoami 2>/dev/null | grep -q "Account"; then
  echo "ERROR: Not authenticated. Run: wrangler login"
  echo "  Or set CLOUDFLARE_API_TOKEN environment variable."
  exit 1
fi
echo "✓ Authenticated"

# 2. Create D1 database (idempotent — will skip if exists)
echo ""
echo "Creating D1 database..."
D1_OUTPUT=$(wrangler d1 create bytlinks-db 2>&1 || true)
if echo "$D1_OUTPUT" | grep -q "already exists"; then
  echo "✓ D1 database already exists"
  DB_ID=$(wrangler d1 list --json 2>/dev/null | grep -A2 '"bytlinks-db"' | grep '"uuid"' | sed 's/.*"\([a-f0-9-]*\)".*/\1/' || echo "")
else
  DB_ID=$(echo "$D1_OUTPUT" | grep "database_id" | sed 's/.*= "\(.*\)"/\1/')
  echo "✓ D1 database created: $DB_ID"
fi

if [ -z "$DB_ID" ]; then
  echo "Could not extract D1 database ID. Please update wrangler.toml manually."
  echo "Run: wrangler d1 list"
else
  # Update wrangler.toml with real database ID
  sed -i "s/REPLACE_WITH_REAL_D1_ID/$DB_ID/" apps/worker/wrangler.toml
  echo "✓ Updated wrangler.toml with database ID: $DB_ID"
fi

# 3. Create R2 bucket
echo ""
echo "Creating R2 bucket..."
R2_OUTPUT=$(wrangler r2 bucket create bytlinks-uploads 2>&1 || true)
if echo "$R2_OUTPUT" | grep -q "already exists"; then
  echo "✓ R2 bucket already exists"
else
  echo "✓ R2 bucket created"
fi

# 4. Run database migrations
echo ""
echo "Running database schema on production D1..."
wrangler d1 execute bytlinks-db --remote --file=./schema.sql
echo "✓ Schema applied"

# 5. Set secrets (prompt user)
echo ""
echo "Setting secrets..."
echo "You'll be prompted to enter your JWT_SECRET."
echo "(Use a strong random string, e.g.: openssl rand -hex 32)"
wrangler secret put JWT_SECRET
echo "✓ JWT_SECRET set"

# 6. Build frontend
echo ""
echo "Building frontend..."
npm run build:web
echo "✓ Frontend built"

# 7. Deploy
echo ""
echo "Deploying to Cloudflare Workers..."
cd apps/worker
wrangler deploy
cd ../..

echo ""
echo "=== Deployment Complete ==="
echo "Your site is live! Check the URL printed above."
echo ""
echo "Next steps:"
echo "  - Add a custom domain in Cloudflare Dashboard → Workers & Pages → bytlinks-worker → Settings → Domains & Routes"
echo "  - Set STRIPE_SECRET_KEY if you need billing: wrangler secret put STRIPE_SECRET_KEY"
