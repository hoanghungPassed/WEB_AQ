const fs = require('fs');

function fixAccessLock() {
    const path = 'C:\\Users\\HoangHung\\Documents\\GitHub\\WEB_AQ\\src\\components\\admin\\modals\\AccessLock.tsx';
    let content = fs.readFileSync(path, 'utf8');
    
    // Fix status mapping and polling
    content = content.replace(/status === \"PENDING\"/g, 'status === \"PROCESSING\"');
    content = content.replace(/<ShieldAlert size={24} \/> ģ được đồng ý!/g, '<ShieldAlert size={24} \/> ĺang xử lý yêu cầu...');
    
    // Fix the broken div/button
    content = content.replace(/� Hệ thống đang x�\\u00ad lý... Vui lòng chểng xuất/g, '� Hệ thống đang x�\\u00ad lý... Vui lòng ch�');
    content = content.replace(/<\/button>\s+<\/div>\s+\) : \(/g, '<\/div>\\n            <button onClick={onLogout} className=\"h-16 px-10 rounded-2xl bg-white/5 border border-white/0 text-gray-400 font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white/10 transition-all\"> <LogOut size={24} \/> ăng xuất <\/button>\\n          <\/div>\\n        ) : (');

    fs.writeFileSync(path, content, 'utf8');
}

function fixMailManagement() {
    const path = 'C:\\Users\\HoangHung\\Documents\\GitHub\\WEB_AQ\\src\\components\\admin\\MailManagement.tsx';
    let content = fs.readFileSync(path, 'utf8');
    content = content.replace(/triggerToast\(�[\s\S]+?const res = await fetch\(\"\/api\/admin\/mails\"/g, 'const res = await fetch(\"/api/admin/mails\"');
    fs.writeFileSync(path, content, 'utf8');
}

// fixAccessLock();
// fixMailManagement();
