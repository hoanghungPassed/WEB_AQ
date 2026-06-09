const fs = require('fs');
const path = 'C:\\Users\\HoangHung\\Documents\\GitHub\\WEB_AQ\\src\\app\\admin\\tasks\\page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add states
const stateInsertPoint = 'const [selectedTaskId, setSelectedTaskId] =';
if (content.includes(stateInsertPoint) && !content.includes('staffSearch')) {
    content = content.replace(stateInsertPoint, 'const [staffSearch, setStaffSearch] = React.useState(\"\");\\n  const [staffOnlineFilter, setStaffOnlineFilter] = React.useState(\"ALL\");\\n  ' + stateInsertPoint);
}

// 2. Add UI
const uiPoint = '<label className=\"text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1\">Ch�n nhân viên thực hiện<\/label>';
const uiHtml = \<div className=\"grid grid-cols-2 gap-4 mb-4\">
    <input 
      type=\"text\" 
      placeholder=\"Tìm nhân viên...\" 
      value={staffSearch}
      onChange={(e) => setStaffSearch(e.target.value)}
      className=\"bg-white/5 border border-white/0 rounded-xl px-4 h-12 text-white\"
    />
    <select 
      value={staffOnlineFilter}
      onChange={(e) => setStaffOnlineFilter(e.target.value)}
      className=\"bg-white/5 border border-white/0 rounded-xl px-4 h-12 text-gold\"
    >
      <option value=\"ALL\">Tất cả<\/option>
      <option value=\"ONLINE\">Online<\/option>
      <option value=\"OFFLINE\">Offline<\/option>
    </select>
 </div>\;

if (content.includes(uiPoint) && !content.includes('staffSearch')) {
    content = content.replace(uiPoint, uiHtml + '\\n                ' + uiPoint);
}

fs.writeFileSync(path, content, 'utf8');
