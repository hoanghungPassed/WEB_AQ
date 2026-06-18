file_path = r"c:\Users\HoangHung\Documents\GitHub\WEB_AQ\src\app\admin\mail\batches\page.tsx"
out_path = r"C:\Users\HoangHung\Documents\GitHub\WEB_AQ\.gemini\antigravity-ide\scratch\prefix_search_output.txt"

with open(file_path, "rb") as f:
    content = f.read().decode("utf-8").replace("\r\n", "\n")

queries = [
    "interface BatchItem {",
    "const loadBatches = async () =>",
    "if (showAssignModal) {",
    "const assignmentPreview = useMemo",
    "const handleAssignBatch = async () =>",
    "if (!selectedBatchForDetail) return;",
    "const handleConfirmDelete = async () =>",
    "{/* Dynamic Graphic Counter */}",
    "<th className=\"py-3 px-4 font-black",
    "mail.otpLink ? (",
    "detailMails || []).length === 0"
]

with open(out_path, "w", encoding="utf-8") as out:
    for q in queries:
        pos = content.find(q)
        if pos != -1:
            line_start = content.rfind("\n", 0, pos) + 1
            line_end = content.find("\n", pos)
            line = content[line_start:line_end]
            out.write(f"Query '{q}':\n")
            out.write(f"  Line: {repr(line)}\n")
            subsequent = []
            curr = line_end + 1
            for _ in range(3):
                nxt = content.find("\n", curr)
                if nxt != -1:
                    subsequent.append(content[curr:nxt])
                    curr = nxt + 1
            out.write(f"  Next lines: {repr(subsequent)}\n\n")
        else:
            out.write(f"Query '{q}' NOT found!\n\n")

print("SUCCESS: Search output written to prefix_search_output.txt")
