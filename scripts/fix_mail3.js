const fs = require('fs');
let content = fs.readFileSync('src/components/admin/MailManagement.tsx', 'utf8');

const replacements = {
  'Đã lÃƒÂ\xa0m': 'Đã làm',
  'Chưa lÃƒÂ\xa0m': 'Chưa làm',
  'điÃ¡Â»Â\x81n': 'điền',
  'trưệºc khi chuyÃ¡Â»Æ’n': 'trước khi chuyển',
  'thÃƒÂ\xa0nh công': 'thành công',
  'nÃƒÂ\xa0y': 'này',
  'ngÃƒÂ\xa0y': 'ngày',
  'bÃ¡Â»Â\x8f': 'bỏ',
  'Quản lÃƒÂ½': 'Quản lý',
  'xử lÃƒÂ½': 'xử lý',
  'MÃ¡Â»Å¸': 'Mở',
  'TOÃƒâ‚¬N BÃ¡Â»Ëœ': 'TOÀN BỘ',
  'Kiếm TiÃ¡Â»Â\x81n': 'Kiếm Tiền',
  'Bấtm vÃƒÂ\xa0o đÃ¡Â»Æ’': 'Bấm vào để',
  'vÃƒÂ\xa0': 'và',
  'vÃ\xa0o': 'vào',
  'Ä\x90Ã£ lÆ°u thÃ\xa0nh cÃ´ng': 'Đã lưu thành công',
  'Lá»—i tá»± Ä\x91á»™ng Ä\x91Ä\x83ng kÃ½': 'Lỗi tự động đăng ký',
  'Lá»—i cáº\xadp nháº\xadt': 'Lỗi cập nhật',
  'Ã¢Å¡Â\xa0Ã¯Â¸Â\x8f': '⚠️',
  'LÃ¡Â»â€”i': 'Lỗi',
  'Ã„ÂƒÂ£': 'Đã'
};

for (const [key, value] of Object.entries(replacements)) {
  content = content.split(key).join(value);
}

fs.writeFileSync('src/components/admin/MailManagement.tsx', content, 'utf8');
console.log('Fix script 3 complete.');
