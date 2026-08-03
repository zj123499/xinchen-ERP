#!/usr/bin/env python3
"""批量修复 requirePermission 在参数解构中的语法错误 — v2 更宽松匹配"""
import re, glob, os

API_DIR = "src/app/api"
fixed = 0

# 宽松匹配：从 `{` 开始，包含 requirePermission，到 `params }:` 结束
# 捕获 requirePermission 调用和 if 返回语句
def fix_file(filepath):
    global fixed
    with open(filepath, 'r') as f:
        content = f.read()

    if 'requirePermission' not in content:
        return

    original = content
    
    # 替换：{ const _denied...if (_denied)...params }: { params:...} )\n{ → { params }: { params:...} )\n{\n  const _denied...\n  if...
    # 使用跨行匹配
    def replacer(m):
        request_line = m.group(1)  # request: NextRequest,
        perm_call = m.group(2).strip()
        perm_if = m.group(3).strip()
        params_decl = m.group(4).strip()
        close_parens = m.group(5)  # ) {
        indent = m.group(6) if m.lastindex >= 6 else "  "
        
        return f'{request_line}\n  {{ params }}: {{ params: Promise<{{ id: string }}> }}\n){close_parens}\n  {perm_call}\n  {perm_if}\n'

    pattern = re.compile(
        r'(request\s*:\s*NextRequest\s*,)\s*\n\s*\{\s*\n\s*(const\s+\w+\s+=\s+await\s+requirePermission\s*\(request,\s*"[^"]*"\s*\);)\s*\n\s*(if\s+\(\2\)\s+return\s+\2;)\s*\n\s*(params\s*\}:)\s*\{ params:\s*Promise<\{\s*id:\s*string\s*}> \}\s*(\)\s*\{)',
        re.MULTILINE
    )

    content, n = pattern.subn(replacer, content)
    
    # 修复双花括号
    content = content.replace('{{ params }}', '{ params }')
    content = content.replace('{{ params: Promise<{{ id: string }}> }}', '{ params }: { params: Promise<{ id: string }> }')

    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        fixed += 1
        print(f"  ✓ {filepath}")

for filepath in glob.glob(f"{API_DIR}/**/route.ts", recursive=True):
    fix_file(filepath)

print(f"\n✅ 修复了 {fixed} 个文件")
