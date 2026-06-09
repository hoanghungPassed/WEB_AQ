const fs = require('fs');
let content = fs.readFileSync('src/components/admin/MailManagement.tsx', 'utf8');

const replacements = {
  'Đã lÃƒÂ m': 'Đã làm',
  'Đã lÃƒÂ\xadm': 'Đã làm',
  'Chưa lÃƒÂ m': 'Chưa làm',
  'Chưa lÃƒÂ\xadm': 'Chưa làm',
  'điÃ¡Â»Ân': 'điền',
  'trưệºc khi chuyÃ¡Â»Æ’n': 'trước khi chuyển',
  'cÃ¡ÂºÂ\xadp nhật': 'cập nhật',
  'Chệ° trên giao diện': 'Chỉ trên giao diện',
  'thÃƒÂ\xadnh công': 'thành công',
  'thÃƒÂ nh công': 'thành công',
  'hệ thệ˜ng khi lưu': 'hệ thống khi lưu',
  'muệ˜n xóa': 'muốn xóa',
  'nÃƒÂ\xady': 'này',
  'nÃƒÂ y': 'này',
  'bÃ¡Â»Â\x8f qua': 'bỏ qua',
  'bÃ¡Â»Â qua': 'bỏ qua',
  'xử lÃƒÂ½': 'xử lý',
  'Đã xuấtt': 'Đã xuất',
  'Lô ngÃƒÂ\xady': 'Lô ngày',
  'Lô ngÃƒÂ y': 'Lô ngày',
  'Lỗi kết nệ˜i Server:': 'Lỗi kết nối Server:',
  'LÃƒÂ´': 'Lô',
  'Tệ¢ng cÃ¡Â»â„¢ng:': 'Tổng cộng:',
  'tÃƒÂ\xadi khoản': 'tài khoản',
  'tÃƒÂi khoản': 'tài khoản',
  'Ä£ lÆ°u thÃ nh cÃ´ng': 'Đã lưu thành công',
  'Ä\x90ang lÆ°u': 'Đang lưu',
  'lÃ´ mail vá»‡ tinh': 'lô mail vệ tinh',
  'Lá»—i tá»± Ä\x91á»™ng Ä\x91Ä\x83ng kÃ½': 'Lỗi tự động đăng ký',
  'vÃ o Server': 'vào Server',
  'Lá»—i cáº\xadp nháº\xadt': 'Lỗi cập nhật',
  'Bấtm vÃƒÂ o đÃ¡Â»Æ’ xem vÃƒÂ xử lÃƒÂ½': 'Bấm vào để xem và xử lý',
  'Kiếm TiÃ¡Â»Ân': 'Kiếm Tiền',
  'Trạng thái gán': 'Trạng thái gán',
  'Tất cả trạng thái': 'Tất cả trạng thái',
  'Dữ liệu chi tiết': 'Dữ liệu chi tiết',
  'Đã xanh': 'Đã xanh',
  'Quét CCCD': 'Quét CCCD',
  'Lệ¹ch sử Import': 'Lịch sử Import',
  'lệ¹ch sử': 'lịch sử',
  'Tệ¢ng mail được giao': 'Tổng mail được giao',
  'Lỗi (Die)': 'Lỗi (Die)'
};

for (const [key, value] of Object.entries(replacements)) {
  content = content.split(key).join(value);
}

fs.writeFileSync('src/components/admin/MailManagement.tsx', content, 'utf8');
console.log('Fix script 2 complete.');
