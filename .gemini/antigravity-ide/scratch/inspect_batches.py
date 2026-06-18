file_path = r"c:\Users\HoangHung\Documents\GitHub\WEB_AQ\src\app\admin\mail\batches\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(113, 205):
    if i < len(lines):
        print(f"{i+1:3d}: {repr(lines[i])}")
