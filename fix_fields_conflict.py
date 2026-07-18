#!/usr/bin/env python3
"""
修复 NocoBase 数据库字段类型冲突问题

错误信息：
fields with same column must be of the same type
{"key":"oznz7ctjfk0","name":"receivedBy","type":"belongsTo","interface":"m2o",
 "collectionName":"payments","target":"employees","foreignKey":"received_by"}

问题原因：
数据库中 payments 集合的 receivedBy 字段存在两条记录，一条 type=string，一条 type=belongsTo，
导致 NocoBase 启动时字段校验失败。

修复方式（按优先级）：
方案 A：通过 SSH 执行（推荐）
方案 B：复制 SQL 手动执行
"""

# ============================================================
# 方案 A: 直接在服务器上执行修复
# ============================================================
import subprocess, sys, os

SERVER = "111.229.72.128"
SSH_USER = "root"  # 如果不同请修改

# 尝试查找 NocoBase 的数据库配置
def find_db_config():
    """尝试从 docker-compose 或容器 env 中获取数据库信息"""
    commands = [
        # 查找 docker-compose 文件
        "docker inspect $(docker ps -q --filter 'name=nocobase') 2>/dev/null | python3 -c \"import sys,json; d=json.load(sys.stdin); [print(k,'=',v) for k,v in d[0]['Config']['Env'] if 'DB' in k or 'DATABASE' in k]\" 2>/dev/null",
        # 直接找 postgres 容器
        "docker ps --format '{{.Names}}' 2>/dev/null",
        # 找 nocobase 容器环境变量
        "docker exec $(docker ps -q --filter 'name=nocobase' | head -1) env 2>/dev/null | grep -iE 'DB_|DATABASE_'",
        # 查找 .env 文件
        "find / -name '.env' -path '*/nocobase*' 2>/dev/null | head -5",
        "find / -name 'docker-compose*' -path '*/nocobase*' 2>/dev/null | head -5",
    ]
    for cmd in commands:
        full_cmd = f'ssh {SSH_USER}@{SERVER} "{cmd}"'
        print(f"  尝试: {cmd[:80]}...")
        try:
            result = subprocess.run(
                ["ssh", f"{SSH_USER}@{SERVER}", cmd],
                capture_output=True, text=True, timeout=15
            )
            if result.stdout.strip():
                print(f"  结果:\n{result.stdout}")
        except Exception as e:
            print(f"  失败: {e}")

# ============================================================
# 方案 B: 生成可直接执行的 SQL
# ============================================================

print("""
╔══════════════════════════════════════════════════════════════╗
║          NocoBase 字段冲突修复指南                            ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  错误: payments.receivedBy 字段类型冲突                      ║
║  (string vs belongsTo)                                       ║
║                                                              ║
║  需要在服务器上执行以下 SQL 修复：                           ║
╚══════════════════════════════════════════════════════════════╝
""")

SQL_FIX = """
-- ============================================================
-- 步骤 1: 连接数据库
-- ============================================================
-- 如果是 Docker 部署的 NocoBase，通常数据库在 postgres 容器中：
--   docker exec -it <postgres_container> psql -U nocobase -d nocobase
--
-- 或者如果数据库在 nocobase 容器内（SQLite）：
--   docker exec -it <nocobase_container> sh
--   sqlite3 /app/storage/db/nocobase.sqlite

-- ============================================================
-- 步骤 2: 查看冲突的字段记录
-- ============================================================
-- PostgreSQL:
SELECT id, key, name, type, interface, "collectionName", "foreignKey", target
FROM fields
WHERE name = 'receivedBy' AND "collectionName" = 'payments';

-- SQLite:
-- SELECT id, key, name, type, interface, collectionName, foreignKey, target
-- FROM fields
-- WHERE name = 'receivedBy' AND collectionName = 'payments';

-- ============================================================
-- 步骤 3: 删除多余的字段记录
-- ============================================================
-- 保留 belongsTo 类型（key=oznz7ctjfk0），删除其他同名字段

-- 先查看哪个 key 不是 oznz7ctjfk0
-- SELECT * FROM fields WHERE name = 'receivedBy' AND "collectionName" = 'payments';

-- 删除冲突记录（保留 belongsTo 类型的）
-- DELETE FROM fields WHERE name = 'receivedBy' AND "collectionName" = 'payments' AND type != 'belongsTo';
-- 或者更精确：
-- DELETE FROM fields WHERE name = 'receivedBy' AND "collectionName" = 'payments' AND key != 'oznz7ctjfk0';

-- ============================================================
-- 步骤 4: 同时检查数据库表中是否有冲突列
-- ============================================================
-- 如果数据库表 payments 中有 received_by 列且类型不匹配，也需要修改：
-- ALTER TABLE payments ALTER COLUMN received_by TYPE bigint USING received_by::bigint;

-- ============================================================
-- 步骤 5: 重启 NocoBase
-- ============================================================
-- docker restart <nocobase_container>
"""

print(SQL_FIX)

print("""
╔══════════════════════════════════════════════════════════════╗
║  快捷修复命令（在服务器上执行）：                            ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  # 1. 找到 postgres 容器                                     ║
║  docker ps | grep postgres                                   ║
║                                                              ║
║  # 2. 进入数据库                                             ║
║  docker exec -it <pg容器名> psql -U nocobase -d nocobase     ║
║                                                              ║
║  # 3. 查看冲突字段                                           ║
║  SELECT id, key, name, type, "collectionName"                ║
║  FROM fields WHERE name='receivedBy';                        ║
║                                                              ║
║  # 4. 删除多余记录（保留 type=belongsTo 那条）               ║
║  DELETE FROM fields                                         ║
║  WHERE name='receivedBy' AND type!='belongsTo';              ║
║                                                              ║
║  # 5. 退出并重启                                             ║
║  \\q                                                          ║
║  docker restart <nocobase容器名>                             ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
""")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--auto":
        print("\n尝试自动修复...")
        find_db_config()
