const fs = require('fs');
let content = fs.readFileSync('src/components/admin/Header.tsx', 'utf8');

const replacements = {
  'TÃªn Ä‘Ä\\x83ng nháº\\xadt': 'Tên đăng nhập',
  'TÃªn Ä‘Äƒng nháº\\xadt': 'Tên đăng nhập',
  'Sá»‘ Ä‘iá»‡n thoáº¡i': 'Số điện thoại',
  'NÄ\\x83m sinh': 'Năm sinh',
  'NÄƒm sinh': 'Năm sinh',
  'Chá»\\x8dn chá»©c vá»\\xa5': 'Chọn chức vụ',
  'Chá»\\x8dn chá»©c vá»¥': 'Chọn chức vụ',
  'PhÃª duyá»‡t quyá»\\x81n truy cáº\\xadp': 'Phê duyệt quyền truy cập',
  'PhÃª duyá»‡t quyá»\\x81n truy cáºp': 'Phê duyệt quyền truy cập',
  'PhÃª duyá»‡t quyá»\x81n truy cáº\xadp': 'Phê duyệt quyền truy cập',
  'PhÃª duyá»‡t quyá»n truy cáº\xadp': 'Phê duyệt quyền truy cập',
  'â†’': '→'
};

for (const [key, value] of Object.entries(replacements)) {
  content = content.split(key).join(value);
}

fs.writeFileSync('src/components/admin/Header.tsx', content, 'utf8');
console.log('Fix script header 2 complete.');
