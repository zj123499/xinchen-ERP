#!/bin/bash
exec >/tmp/dbuild.log 2>&1 </dev/null
cd /home/ubuntu/xinchen-erp
docker rm -f xinchen-erp 2>/dev/null
docker compose build
docker compose up -d
echo DONE
echo "EXITCODE=$?"
