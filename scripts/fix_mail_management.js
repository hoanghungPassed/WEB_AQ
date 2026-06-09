const fs = require('fs');
let content = fs.readFileSync('src/components/admin/MailManagement.tsx', 'utf8');

const replacements = {
  'NHÃƒâ€šN VIÃƒÅ\x81N': 'NHÂN VIÊN',
  'NV THÃ¡Â»Â¬ VIÃ¡Â»â€\x9dC': 'NV THỬ VIỆC',
  'QL NHÃƒâ€šN SÃ¡Â»Â°': 'QL NHÂN SỰ',
  'QUÃ¡ÂºÂ¢N LÃƒÂƒÂ£': 'QUẢN LÝ',
  'QUÃ¡ÂºÂ¢N LÃƒÂ\x9d': 'QUẢN LÝ',
  'CÃƒÂ\x94NG VIÃ¡Â»â€\x9dC': 'CÔNG VIỆC',
  'sao chÃƒÂ©p': 'sao chép',
  'Ã„ÂƒÂ£ lÃƒÂ\xadm': 'Đã làm',
  'Ã„Â\x90Ã£ lÃƒÂ\xadm': 'Đã làm',
  'Vui lÃƒÂ²ng Ã„â€˜iÃ¡Â»\x81n Ã„â€˜Ã¡Â»Â§ 3 link kÃƒÂªnh trÃ†Â°Ã¡Â»â€ºc khi chuyÃ¡Â»Æ’n trÃ¡ÂºÂ¡ng thÃƒÂ¡i': 'Vui lòng điền đủ 3 link kênh trước khi chuyển trạng thái',
  'Ã„ÂƒÂ£ bÃƒÂ¡n': 'Đã bán',
  'Ã„Â\x90Ã£ bÃƒÂ¡n': 'Đã bán',
  'ChÃ†Â°a lÃƒÂ\xadm': 'Chưa làm',
  'LÃ¡Â»â€”i': 'Lỗi',
  'HÃ¡Â»â€¡ thÃ¡Â»â€˜ng': 'Hệ thống',
  'Ã„ÂƒÂ£ cÃ¡ÂºÂ\xadp nhÃ¡ÂºÂ\xadt trÃ¡ÂºÂ¡ng thÃƒÂ¡i cÃƒÂ´ng viÃ¡Â»â€¡c! (ChÃ¡Â»â€° trÃƒÂªn giao diÃ¡Â»â€¡n)': 'Đã cập nhật trạng thái công việc! (Chỉ trên giao diện)',
  'Ã„Â\x90Ã£ cÃ¡ÂºÂ\xadp nhÃ¡ÂºÂ\xadt trÃ¡ÂºÂ¡ng thÃƒÂ¡i cÃƒÂ´ng viÃ¡Â»â€¡c thÃƒÂ\xadnh cÃƒÂ´ng!': 'Đã cập nhật trạng thái công việc thành công!',
  'KhÃƒÂ´ng thÃ¡Â»Æ’ cÃ¡ÂºÂ\xadp nhÃ¡ÂºÂ\xadt': 'Không thể cập nhật',
  'LÃ¡Â»â€”i khi update workStatus lÃƒÂªn DB:': 'Lỗi khi update workStatus lên DB:',
  'Ã„ÂƒÂ£ xÃ¡ÂºÂ£y ra lÃ¡Â»â€”i hÃ¡Â»â€¡ thÃ¡Â»â€˜ng khi lÃ†Â°u.': 'Đã xảy ra lỗi hệ thống khi lưu.',
  'Ã„Â\x90Ã£ cÃ¡ÂºÂ\xadp nhÃ¡ÂºÂ\xadt chi tiÃ¡ÂºÂ¿t thÃƒÂ\xadnh cÃƒÂ´ng! (ChÃ¡Â»â€° trÃƒÂªn giao diÃ¡Â»â€¡n)': 'Đã cập nhật chi tiết thành công! (Chỉ trên giao diện)',
  'Ã„Â\x90Ã£ cÃ¡ÂºÂ\xadp nhÃ¡ÂºÂ\xadt chi tiÃ¡ÂºÂ¿t thÃƒÂ\xadnh cÃƒÂ´ng!': 'Đã cập nhật chi tiết thành công!',
  'LÃ¡Â»â€”i khi update detail lÃƒÂªn DB:': 'Lỗi khi update detail lên DB:',
  'Ã„â€˜ÃƒÂ£': 'đã',
  'hoÃƒÂ\xadn thÃƒÂ\xadnh': 'hoàn thành',
  'lÃ¡Â»â€”i': 'lỗi',
  'quÃƒÂ©t cccd': 'quét cccd',
  'XÃƒÂ¡c nhÃ¡ÂºÂ\xadn xÃƒÂ³a': 'Xác nhận xóa',
  'BÃ¡ÂºÂ¡n cÃƒÂ³ chÃ¡ÂºÂ¯c chÃ¡ÂºÂ¯n muÃ¡Â»â€˜n xÃƒÂ³a mail nÃƒÂ\xady?': 'Bạn có chắc chắn muốn xóa mail này?',
  'Ã„Â\x90Ã£ xÃƒÂ³a mail thÃƒÂ\xadnh cÃƒÂ´ng!': 'Đã xóa mail thành công!',
  'KhÃƒÂ´ng thÃ¡Â»Æ’ xÃƒÂ³a': 'Không thể xóa',
  'Ã„Â\x90Ã£ xÃƒÂ³a mail (local) thÃƒÂ\xadnh cÃƒÂ´ng!': 'Đã xóa mail (local) thành công!',
  'LÃ¡Â»â€”i xÃƒÂ³a mail:': 'Lỗi xóa mail:',
  'LÃ¡Â»â€”i khi xÃƒÂ³a mail!': 'Lỗi khi xóa mail!',
  'KhÃƒÂ´ng tÃƒÂ¬m thÃ¡ÂºÂ¥y dÃ¡Â»Â¯ liÃ¡Â»â€¡u mail hÃ¡Â»Â£p lÃ¡Â»â€¡!': 'Không tìm thấy dữ liệu mail hợp lệ!',
  'tÃƒÂ\xadi khoÃ¡ÂºÂ£n': 'tài khoản',
  'tai khoÃ¡ÂºÂ£n': 'tai khoản',
  'sÃ„â€˜t': 'sđt',
  'link sÃ„â€˜t': 'link sđt',
  'BÃ¡Â»Â\x8f qua tÃ¡ÂºÂ¥t cÃ¡ÂºÂ£': 'Bỏ qua tất cả',
  'mail do bÃ¡Â»â€¹ trÃƒÂ¹ng lÃ¡ÂºÂ·p!': 'mail do bị trùng lặp!',
  'Ã„Â\x90Ã£ bÃ¡Â»Â\x8f qua': 'Đã bỏ qua',
  'mail bÃ¡Â»â€¹ trÃƒÂ¹ng!': 'mail bị trùng!',
  'LÃ¡Â»â€”i xÃ¡Â»Â\xad lÃƒÂ½ dÃ¡Â»Â¯ liÃ¡Â»â€¡u file Excel!': 'Lỗi xử lý dữ liệu file Excel!',
  'Ã„Â\x90Ã£ xuÃ¡ÂºÂ¥t Excel thÃƒÂ\xadnh cÃƒÂ´ng!': 'Đã xuất Excel thành công!',
  'LÃ¡Â»Â\x8dc theo LÃƒÂ´': 'Lọc theo Lô',
  'ChÃ†Â°a xanh': 'Chưa xanh',
  'QuÃƒÂ©t CCCD': 'Quét CCCD',
  'LÃƒÂ´ chÃ†Â°a phÃƒÂ¢n loÃ¡ÂºÂ¡i': 'Lô chưa phân loại',
  'HÃ¡Â»Â§y bÃ¡Â»Â\x8f': 'Hủy bỏ',
  'XÃƒÂ¡c nhÃ¡ÂºÂ\xadn XÃƒÂ³a': 'Xác nhận Xóa',
  'BÃ¡ÂºÂ¡n cÃƒÂ³ chÃ¡ÂºÂ¯c chÃ¡ÂºÂ¯n muÃ¡Â»â€˜n xÃƒÂ³a dÃƒÂ²ng lÃ¡Â»â€¹ch sÃ¡Â»Â\xad import nÃƒÂ\xady?': 'Bạn có chắc chắn muốn xóa dòng lịch sử import này?',
  'XÃƒÂ¡c nhÃ¡ÂºÂ\xadn xÃƒÂ³a TOÃƒâ‚¬N BÃ¡Â»\x98 lÃ¡Â»â€¹ch sÃ¡Â»Â\xad import?': 'Xác nhận xóa TOÀN BỘ lịch sử import?',
  'Danh sÃƒÂ¡ch': 'Danh sách',
  'TÃ¡ÂºÂ¥t cÃ¡ÂºÂ£': 'Tất cả',
  'Mail GÃ¡Â»â€˜c': 'Mail Gốc',
  'Mail VÃ¡Â»â€¡ Tinh': 'Mail Vệ Tinh',
  'Mail BÃ¡ÂºÂ\xadt KiÃ¡ÂºÂ¿m TiÃ¡Â»\x81n': 'Mail Bật Kiếm Tiền',
  'QuÃ¡ÂºÂ£n lÃƒÂ½ kho dÃ¡Â»Â¯ liÃ¡Â»â€¡u email vÃƒÂ\xa0 SÃ„Â\x90T cÃ¡Â»Â§a hÃ¡Â»â€¡ thÃ¡Â»â€˜ng': 'Quản lý kho dữ liệu email và SĐT của hệ thống',
  'BÃ¡ÂºÂ¥m vÃƒÂ\xa0o Ã„â€˜Ã¡Â»Æ’ xem vÃƒÂ\xa0 xÃ¡Â»Â\xad lÃƒÂ½ cÃƒÂ¡c mail trong lÃƒÂ´ nÃƒÂ\xady.': 'Bấm vào để xem và xử lý các mail trong lô này.',
  'Quay lÃ¡ÂºÂ¡i': 'Quay lại',
  'DÃ¡Â»Â¯ liÃ¡Â»â€¡u chi tiÃ¡ÂºÂ¿t': 'Dữ liệu chi tiết',
  'LÃƒÂ´ mail': 'Lô mail',
  'TÃƒÂ¬m kiÃ¡ÂºÂ¿m Email, Pass, Mail KP, SÃ„Â\x90T...': 'Tìm kiếm Email, Pass, Mail KP, SĐT...',
  'Ã„Â\x90Ã£ xanh': 'Đã xanh',
  'TrÃ¡ÂºÂ¡ng thÃƒÂ¡i gÃƒÂ¡n': 'Trạng thái gán',
  'Ã„Â\x90Ã£ gÃƒÂ¡n': 'Đã gán',
  'ChÃ†Â°a gÃƒÂ¡n': 'Chưa gán',
  'ThiÃ¡ÂºÂ¿u': 'Thiếu',
  'kÃƒÂªnh': 'kênh',
  'MÃ¡ÂºÂ\xadt khÃ¡ÂºÂ©u': 'Mật khẩu',
  'Xem chi tiÃ¡ÂºÂ¿t': 'Xem chi tiết',
  'ChÃ†Â°a cÃƒÂ³ dÃ¡Â»Â¯ liÃ¡Â»â€¡u': 'Chưa có dữ liệu',
  'LÃƒÂ´ ngÃƒÂ\xady': 'Lô ngày',
  'Lá»—i tá»± Ä\x91á»™ng Ä\x91Ä\x83ng kÃ½ lÃ´ mail vá»‡ tinh:': 'Lỗi tự động đăng ký lô mail vệ tinh:',
  'Ä\x90Ã£ lÆ°u thÃ\xadnh cÃ´ng': 'Đã lưu thành công',
  'LÃ¡Â»â€”i khi gÃ¡Â»\x8di API POST mails:': 'Lỗi khi gọi API POST mails:',
  'LÃ¡Â»â€”i kÃ¡ÂºÂ¿t nÃ¡Â»â€˜i Server:': 'Lỗi kết nối Server:',
  'KhÃƒÂ´ng thÃ¡Â»Æ’ lÃ†Â°u mail!': 'Không thể lưu mail!',
  'Ã„Â\x90Ã£': 'Đã',
  'Ã„ÂƒÂ£': 'Đã',
  'Ã¡ÂºÂ\xadt': 'ật',
  'Ã¡ÂºÂ£': 'ả',
  'Ã¡ÂºÂ¥': 'ất',
  'Ã¡Â»â€¡': 'ệ',
  'Ã¡Â»â€': 'ệ',
  'Ã¡Â»\x8d': 'ọ',
  'Ã¡Â»â€º': 'ớ',
  'ÃƒÂ´': 'ô',
  'ÃƒÂ²': 'ò',
  'ÃƒÂ³': 'ó',
  'ÃƒÂµ': 'õ',
  'ÃƒÂ¹': 'ù',
  'ÃƒÂº': 'ú',
  'ÃƒÂ¡': 'á',
  'ÃƒÂ\xad': 'í',
  'ÃƒÂ¬': 'ì',
  'ÃƒÂª': 'ê',
  'ÃƒÂ¢': 'â',
  'ÃƒÂ£': 'ã',
  'ÃƒÂ¨': 'è',
  'ÃƒÂ©': 'é',
  'Ã†Â°': 'ư',
  'Ã†Â¡': 'ơ',
  'Ã„â€˜': 'đ',
  'Ã„Â\x90': 'Đ',
  'Ã¡ÂºÂ¡': 'ạ',
  'Ã¡Â»Â£': 'ợ',
  'Ã¡Â»â€œ': 'ồ',
  'Ã¡Â»â€\x9d': 'ộ',
  'Ã¡Â»Â§': 'ủ',
  'Ã¡Â»Â\xad': 'ử',
  'Ã¡Â»Â\xaf': 'ữ',
  'Ã¡ÂºÂ©': 'ẩ',
  'Ã¡ÂºÂ«': 'ẫ',
  'Ã¡ÂºÂ§': 'ầ',
  'Ã¡ÂºÂ¯': 'ắ',
  'Ã¡ÂºÂ·': 'ặ',
  'Ã¡ÂºÂ½': 'ế',
  'Ã¡ÂºÂ¿': 'ế', // approximate
  'Ã¡Â»â€¦': 'ễ',
  'Ã¡Â»â€¡': 'ệ',
  'Ã¡Â»â€\x8b': 'ị',
  'Ã¡Â»â€\x8d': 'ọ',
  'Ã¡Â»Â\x8d': 'ọ',
  'Ã¡ÂºÂ\xbd': 'ẽ',
  'Ã¡Â»â€\x91': 'ổ',
  'Ã¡Â»â€\x93': 'ỗ',
  'Ã¡Â»â€\x95': 'ố',
  'Ã¡Â»Â\x9f': 'ỡ',
  'Ã¡Â»Â\x9d': 'ờ',
  'Ã¡Â»Â\x9b': 'ớ',
  'Ã¡Â»Â±': 'ự',
  'Ã¡Â»Â¯': 'ữ',
  'Ã¡Â»Â\xad': 'ử',
  'Ã¡Â»Â«': 'ừ',
  'Ã¡Â»Â©': 'ứ',
  'Ã¡Â»Â\xa1': 'ợ',
  'Ã¡Â»Â\x9f': 'ở',
  'Ã¡Â»Â\x9d': 'ờ',
  'Ã¡Â»Â\x9b': 'ớ',
  'Ã¡Â»Â\x99': 'ợ',
  'Ã¡Â»â€\x9d': 'ộ',
  'Ã¡Â»â€\x9b': 'ố',
  'Ã¡Â»â€\x99': 'ồ',
  'Ã¡Â»â€\x97': 'ổ',
  'Ã¡Â»â€\x95': 'ỗ',
  'Ã¡Â»â€\x93': 'ộ',
  'Ã¡Â»â€\x91': 'ổ',
  'Ã¡Â»â€\x8f': 'ọ',
  'Ã¡Â»â€\x8d': 'ọ',
  'Ã¡Â»â€\x8b': 'ị',
  'Ã¡Â»â€\x89': 'ỉ',
  'Ã¡Â»â€\x87': 'ĩ',
  'Ã¡Â»â€\x85': 'ỉ',
  'Ã¡Â»â€\x83': 'ĩ',
  'Ã¡Â»â€\x81': 'ị',
  'ÃƒÂ ': 'à'
};

const replaceUsingDecode = (text) => {
  let prev = '';
  let curr = text;
  while(prev !== curr) {
    prev = curr;
    try {
      // Decode twice to fix double Mojibake if needed
      curr = decodeURIComponent(escape(curr));
    } catch(e) {
      break;
    }
  }
  return curr;
}

// Ensure manual overrides apply first
for (const [key, value] of Object.entries(replacements)) {
  content = content.split(key).join(value);
}

try {
  // Just decode once safely
  const decoded = decodeURIComponent(escape(content));
  // if decoding doesn't completely break it
  if(decoded && decoded.length > content.length * 0.5) {
     content = decoded;
  }
} catch (e) {}

fs.writeFileSync('src/components/admin/MailManagement.tsx', content, 'utf8');
console.log('Fix complete.');
