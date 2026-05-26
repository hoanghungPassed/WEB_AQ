import os
import subprocess

# Get the list of modified files
result = subprocess.run(['git', 'diff', '--name-only'], capture_output=True, text=True)
files = result.stdout.strip().split('\n')

for file in files:
    if not file.endswith('.tsx') and not file.endswith('.ts'):
        continue
    
    # Get the original file content from HEAD
    result = subprocess.run(['git', 'show', f'HEAD:{file}'], capture_output=True, text=True)
    if result.returncode != 0:
        continue
    original_content = result.stdout
    
    with open(file, 'r', encoding='utf-8') as f:
        current_content = f.read()
    
    # We want to restore only the border class changes, while preserving the hover text changes.
    # The simplest way is to start with the original content, and ONLY apply the good changes to it!
    # The good changes were:
    # 1. replace(/text-gray-400 hover:text-gray-900 text-white/g, 'text-gray-400 hover:text-white')
    # 2. replace(/text-gray-500 hover:text-gray-900 text-white/g, 'text-gray-500 hover:text-white')
    # 3. replace(/text-gray-500 hover:text-gray-800 hover:hover:text-gray-900 text-white/g, 'text-gray-500 hover:text-white')
    # 4. In src/app/layout.tsx: the font change (this might be lost if we reset, so let's preserve layout.tsx manually)
    
    # Actually, we made manual changes to table rows and overlays. We should preserve them.
    # Let's just do a token-by-token comparison, or simply revert the file to HEAD and re-run all the good replacements.
    
    pass
