#!/bin/bash
# ==============================================================================
# PWEZACORE LINODE NANODE (1GB RAM) MASTER BOOTSTRAP & HARDENING SUITE
# Target: Ubuntu 24.04 LTS | Linode Frankfurt 2 (172.105.15.14)
# Domain: pwezacore.online, www.pwezacore.online
# ==============================================================================

set -euo pipefail

echo "================================================================="
echo " Starting PwezaCore Linode VPS Provisioning & Hardening..."
echo "================================================================="

export DEBIAN_FRONTEND=noninteractive

# ------------------------------------------------------------------------------
# PHASE 1: SYSTEM HARDENING, MEMORY & SWAP CONFIGURATION
# ------------------------------------------------------------------------------
echo ""
echo ">>> [PHASE 1] Updating packages and installing core utilities..."
apt-get update -y
apt-get upgrade -y
apt-get install -y ufw curl wget git gnupg lsb-release fail2ban jq htop unzip

echo ">>> [PHASE 1] Configuring 2 GB Swap file for 1 GB RAM stability..."
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  if ! grep -q '/swapfile' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
  sysctl vm.swappiness=20
  if ! grep -q 'vm.swappiness' /etc/sysctl.conf; then
    echo 'vm.swappiness=20' >> /etc/sysctl.conf
  else
    sed -i 's/vm.swappiness=.*/vm.swappiness=20/' /etc/sysctl.conf
  fi
fi

echo ">>> [PHASE 1] Configuring UFW Firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable

echo ">>> [PHASE 1] Enabling and starting Fail2ban..."
systemctl enable fail2ban
systemctl restart fail2ban

# ------------------------------------------------------------------------------
# PHASE 2: NODE.JS LTS & PM2 RUNTIME ENVIRONMENT
# ------------------------------------------------------------------------------
echo ""
echo ">>> [PHASE 2] Installing Node.js LTS (v20.x) and PM2..."
if ! command -v node >/dev/null 2>&1 || [[ $(node -v) != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

npm install -g pm2
pm2 startup systemd -u root --hp /root || true

# ------------------------------------------------------------------------------
# PHASE 3: POSTGRESQL TUNING & DATABASE SETUP (RLS PRESERVED)
# ------------------------------------------------------------------------------
echo ""
echo ">>> [PHASE 3] Installing PostgreSQL and extensions..."
apt-get install -y postgresql postgresql-contrib

echo ">>> [PHASE 3] Tuning PostgreSQL for 1 GB RAM Nanode specs..."
PG_CONF=$(find /etc/postgresql/ -name postgresql.conf | head -n 1)

if [ -f "$PG_CONF" ]; then
  # Backup existing config
  cp "$PG_CONF" "${PG_CONF}.bak"

  # Apply low-footprint RAM tuning
  sed -i "s/^#\?shared_buffers\s*=.*/shared_buffers = 256MB/" "$PG_CONF"
  sed -i "s/^#\?work_mem\s*=.*/work_mem = 4MB/" "$PG_CONF"
  sed -i "s/^#\?maintenance_work_mem\s*=.*/maintenance_work_mem = 64MB/" "$PG_CONF"
  sed -i "s/^#\?effective_cache_size\s*=.*/effective_cache_size = 512MB/" "$PG_CONF"
  sed -i "s/^#\?listen_addresses\s*=.*/listen_addresses = '127.0.0.1'/" "$PG_CONF"

  systemctl restart postgresql
  systemctl enable postgresql
fi

echo ">>> [PHASE 3] Setting up database 'pwezacore', roles, and cryptographic extensions..."
# Ensure pwezacore database exists
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw pwezacore; then
  sudo -u postgres createdb pwezacore
fi

sudo -u postgres psql << 'EOF'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pweza_admin') THEN
    CREATE ROLE pweza_admin WITH LOGIN ENCRYPTED PASSWORD 'PwezaCoreSecure2026!';
  ELSE
    ALTER ROLE pweza_admin WITH PASSWORD 'PwezaCoreSecure2026!';
  END IF;
END $$;
GRANT ALL PRIVILEGES ON DATABASE pwezacore TO pweza_admin;
EOF

sudo -u postgres psql -d pwezacore << 'EOF'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
GRANT ALL ON SCHEMA public TO pweza_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO pweza_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO pweza_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO pweza_admin;
EOF

# ------------------------------------------------------------------------------
# PHASE 4: AUTOMATED SUPABASE SECURITY & PERFORMANCE LINTER
# ------------------------------------------------------------------------------
echo ""
echo ">>> [PHASE 4] Deploying automated Supabase Security & Performance Audit CLI..."
cat << 'EOF' > /usr/local/bin/supabase-audit.sh
#!/bin/bash
echo "============================================="
echo " PWEZACORE DATABASE SECURITY & HEALTH AUDIT "
echo " Date: $(date -u)"
echo "============================================="

echo ""
echo "[1] Checking Tables without Row-Level Security (RLS)..."
sudo -u postgres psql -d pwezacore -t -c "
SELECT 'ALERT: Table [' || schemaname || '.' || tablename || '] has RLS DISABLED!' AS unshielded_table
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
" | sed '/^$/d'

echo ""
echo "[2] Checking Missing Indexes on Foreign Keys (Performance Warning)..."
sudo -u postgres psql -d pwezacore -t -c "
SELECT 'WARN: FK column [' || c.conrelid::regclass || '.' || a.attname || '] missing index' AS missing_fk_index
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE c.contype = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid AND a.attnum = ANY(i.indkey)
  );
" | sed '/^$/d'

echo ""
echo "[3] Table Bloat / High Sequential Scans vs Index Scans..."
sudo -u postgres psql -d pwezacore -t -c "
SELECT 'PERF: ' || relname || ' (Seq scans: ' || seq_scan || ', Idx scans: ' || COALESCE(idx_scan, 0) || ')'
FROM pg_stat_user_tables 
WHERE seq_scan > 100 AND (idx_scan IS NULL OR idx_scan < seq_scan);
" | sed '/^$/d'

echo ""
echo "============================================="
echo " AUDIT COMPLETED "
echo "============================================="
EOF

chmod +x /usr/local/bin/supabase-audit.sh

echo ">>> [PHASE 4] Configuring Daily Audit Cron Job (03:00 UTC)..."
(crontab -l 2>/dev/null | grep -v 'supabase-audit.sh' || true; echo "0 3 * * * /usr/local/bin/supabase-audit.sh >> /var/log/db-audit.log 2>&1") | crontab -

# ------------------------------------------------------------------------------
# PHASE 5: REVERSE PROXY & AUTOMATED SSL (CADDY)
# ------------------------------------------------------------------------------
echo ""
echo ">>> [PHASE 5] Installing Caddy Web Server..."
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg --yes
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update -y
apt-get install -y caddy

echo ">>> [PHASE 5] Configuring /etc/caddy/Caddyfile with Auto-SSL & Strict Security Headers..."
cat << 'EOF' > /etc/caddy/Caddyfile
pwezacore.online, www.pwezacore.online {
    encode gzip zstd
    reverse_proxy 127.0.0.1:3000

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
EOF

systemctl restart caddy
systemctl enable caddy

# ------------------------------------------------------------------------------
# PHASE 6: RESTORATION HELPER SCRIPT FOR DATA MIGRATION
# ------------------------------------------------------------------------------
echo ""
echo ">>> [PHASE 6] Creating Database Ingestion Helper (/usr/local/bin/restore-pwezacore-dump)..."
cat << 'EOF' > /usr/local/bin/restore-pwezacore-dump
#!/bin/bash
set -euo pipefail

DUMP_FILE="${1:-/root/pwezacore_dump.sql}"

if [ ! -f "$DUMP_FILE" ]; then
  echo "Error: Dump file $DUMP_FILE not found."
  echo "Usage: restore-pwezacore-dump /path/to/pwezacore_dump.sql"
  exit 1
fi

echo "Restoring database from $DUMP_FILE..."
sudo -u postgres psql -d pwezacore < "$DUMP_FILE"

echo ""
echo "Verifying tables loaded:"
sudo -u postgres psql -d pwezacore -c "\dt"

echo ""
echo "Running Supabase security and RLS compliance audit..."
/usr/local/bin/supabase-audit.sh
EOF

chmod +x /usr/local/bin/restore-pwezacore-dump

echo ""
echo "================================================================="
echo " PWEZACORE VPS PROVISIONING COMPLETE!"
echo " Status Summary:"
echo " - Swap: $(swapon --show --noheadings | awk '{print $3}' || echo 'Active') active"
echo " - Node.js: $(node -v) | NPM: $(npm -v) | PM2: $(pm2 -v)"
echo " - PostgreSQL: $(systemctl is-active postgresql)"
echo " - Caddy: $(systemctl is-active caddy)"
echo " - Firewall: $(ufw status | grep -w 'Status: active' || echo 'inactive')"
echo " - Supabase CLI Audit: /usr/local/bin/supabase-audit.sh (ready)"
echo "================================================================="
