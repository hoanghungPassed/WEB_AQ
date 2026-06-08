$path = "C:\Users\HoangHung\Documents\GitHub\WEB_AQ\src\app\admin\tasks\page.tsx"
$content = Get-Content -Path $path -Raw

$oldStr1 = '  const [selectedMailIdsForTask, setSelectedMailIdsForTask] = useState<number[]>([]);
  const [modalSearchQuery, setModalSearchQuery] = useState<string>("");

  // Filter States'

$newStr1 = '  const [selectedMailIdsForTask, setSelectedMailIdsForTask] = useState<number[]>([]);
  const [modalSearchQuery, setModalSearchQuery] = useState<string>("");
  const [staffSearch, setStaffSearch] = useState("");
  const [staffOnlineFilter, setStaffOnlineFilter] = useState("ALL");

  // Filter States'

$oldStr2 = ' <div className="space-y-2">
 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Chá»n nhÃ¢n viÃªn thá»±c hiá»‡n</label>
 <select
 value={targetStaffId}'

# I need to be careful with the encoding and the exact text for oldStr2
# Let's try to match a simpler part if possible, or use the exact one from previous Get-Content output

$uiInsert = '          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">TÃ¬m nhÃ¢n viÃªn</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="text"
                  placeholder="TÃªn nhÃ¢n viÃªn..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className="w-full h-14 bg-white/5 border border-white/0 rounded-2xl pl-12 pr-6 text-white text-base outline-none focus:border-white/5 transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Lá»dc tráº¡ng thÃ¡i</label>
              <select
                value={staffOnlineFilter}
                onChange={(e) => setStaffOnlineFilter(e.target.value)}
                className="w-full h-14 bg-white/5 border border-white/0 rounded-2xl px-6 text-white text-base outline-none focus:border-white/5 cursor-pointer transition-all"
              >
                <option value="ALL" className="bg-zinc-900">Táº¥t cáº£</option>
                <option value="ONLINE" className="bg-zinc-900">Ä»ang Online</option>
                <option value="OFFLINE" className="bg-zinc-900">Ngoáº¡i tuyáº¿n</option>
              </select>
            </div>
          </div>
'

# Since the encoding in my terminal showed Chá»n nhÃ¢n viÃªn thá»±c hiá»‡n, I should probably match that or use regex for the label part.
# Let's use a more robust match for the targetStaffId select.

$targetMatch = '<div className="space-y-2">\s+<label className="text-\[10px\] font-black text-gray-500 uppercase tracking-widest ml-1">[^<]+</label>\s+<select\s+value=\{targetStaffId\}'

if ($content -match $targetMatch) {
    $matched = $Matches[0]
    $newContent = $content -replace [regex]::Escape($matched), ($uiInsert + $matched)
    $content = $newContent
} else {
    Write-Output "UI match not found"
}

if ($content.Contains($oldStr1)) {
    $content = $content.Replace($oldStr1, $newStr1)
} else {
    Write-Output "State match not found"
}

Set-Content -Path $path -Value $content -Encoding UTF8
