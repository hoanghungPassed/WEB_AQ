const fs = require('fs');
let content = fs.readFileSync('src/components/admin/MailManagement.tsx', 'utf8');

const replacements = {
  'NHÃƒâ€šN VIÃƒÅ\x81N': 'NHÂN VIÊN',
  'NHÃƒâ€šN VIÃƒÅ\x8aN': 'NHÂN VIÊN',
  'NV THÃ¡Â»Â¬ VIệ\x81C': 'NV THỬ VIỆC',
  'NV THÃ¡Â»Â¬ VIệ\x8aC': 'NV THỬ VIỆC',
  'NV THÃ¡Â»Â¬ VIệ\xa0C': 'NV THỬ VIỆC',
  'QUẢN LÝ NHÃƒâ€šN SÃ¡Â»Â°': 'QUẢN LÝ NHÂN SỰ',
  'QL CÃƒâ€\x9dNG VIệ\x81C': 'QL CÔNG VIỆC',
  'QL CÃƒâ€\x9dNG VIệ\x8aC': 'QL CÔNG VIỆC',
  'QL CÃƒâ€\x9dNG VIệ\xa0C': 'QL CÔNG VIỆC',
  'QUẢN LÝ CÃƒâ€\x9dNG VIệ\x81C': 'QUẢN LÝ CÔNG VIỆC',
  'QUẢN LÝ CÃƒâ€\x9dNG VIệ\x8aC': 'QUẢN LÝ CÔNG VIỆC',
  'QUẢN LÝ CÃƒâ€\x9dNG VIệ\xa0C': 'QUẢN LÝ CÔNG VIỆC',
  'hoÃƒÂ\x81n thÃƒÂ\x81nh': 'hoàn thành',
  'hoÃƒÂ\x8an thÃƒÂ\x8anh': 'hoàn thành',
  'hoÃƒÂ\xa0n thÃƒÂ\xa0nh': 'hoàn thành',
  'tÃƒÂ\x81i khoản': 'tài khoản',
  'tÃƒÂ\x8ai khoản': 'tài khoản',
  'tÃƒÂ\xa0i khoản': 'tài khoản',
  'Lá»—i tá»± Ä\x91á»™ng Ä\x91Ä\x83ng kÃ½ lô mail vệ tinh:': 'Lỗi tự động đăng ký lô mail vệ tinh:'
};

for (const [key, value] of Object.entries(replacements)) {
  content = content.split(key).join(value);
}

fs.writeFileSync('src/components/admin/MailManagement.tsx', content, 'utf8');
console.log('Fix script 5 complete.');
