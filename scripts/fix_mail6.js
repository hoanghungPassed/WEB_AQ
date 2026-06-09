const fs = require('fs');
let content = fs.readFileSync('src/components/admin/MailManagement.tsx', 'utf8');

const replacements = {
  'Lá»—i tá»± Ä\\x91á»™ng Ä\\x91Ä\\x83ng kÃ½ lô mail vệ tinh:': 'Lỗi tự động đăng ký lô mail vệ tinh:',
  'Lá»—i tá»± Ä‘á»™ng Ä‘Äƒng kÃ½': 'Lỗi tự động đăng ký',
  'hoÃƒÂ\\xa0n thÃƒÂ\\xa0nh': 'hoàn thành',
  'tÃƒÂ\\xa0i khoản': 'tài khoản'
};

for (const [key, value] of Object.entries(replacements)) {
  content = content.split(key).join(value);
}

fs.writeFileSync('src/components/admin/MailManagement.tsx', content, 'utf8');
console.log('Fix script 6 complete.');
