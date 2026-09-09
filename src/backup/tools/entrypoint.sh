#!/bin/sh
set -e

# =====================================================================
#     Sets up a cron job to run backup.sh nightly at 3 AM, then keeps
#     the container alive running crond in the foreground.
# =====================================================================

echo "0 3 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root

echo "[~] Running an initial backup on startup..."
/usr/local/bin/backup.sh || echo "[!] Initial backup failed, will retry on next cron run"

echo "[~] Starting cron daemon (nightly backups at 3 AM)"
touch /var/log/backup.log
crond -f -l 2