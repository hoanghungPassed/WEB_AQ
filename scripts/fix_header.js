const fs = require('fs');
let content = fs.readFileSync('src/components/admin/Header.tsx', 'utf8');

const replacements = {
  'QUáº¢N LÃ\\x9d CÃ\\x94NG VIá»\\x86C': 'QUẢN LÝ CÔNG VIỆC',
  'QUáº¢N LÃ CÃ”NG VIá»†C': 'QUẢN LÝ CÔNG VIỆC',
  'QL CÃ”NG VIá»†C': 'QL CÔNG VIỆC',
  'QUáº¢N LÃ\\x9d NHÃ\\x82N Sá»°': 'QUẢN LÝ NHÂN SỰ',
  'QUáº¢N LÃ NHÃ‚N Sá»°': 'QUẢN LÝ NHÂN SỰ',
  'QL NHÃ\\x82N Sá»°': 'QL NHÂN SỰ',
  'QL NHÃ‚N Sá»°': 'QL NHÂN SỰ',
  'NHÃ\\x82N VIÃ\\x8aN': 'NHÂN VIÊN',
  'NHÃ‚N VIÃŠN': 'NHÂN VIÊN',
  'Ä\\x91ang xin phÃ©p vÃ\\xa0o': 'đang xin phép vào',
  'Ä‘ang xin phÃ©p vÃ\\xa0o': 'đang xin phép vào',
  'Chá»\\x89 cáº\\xadp nháº\\xadt tráº¡ng thÃ¡i Ä\\x91Ã£ Ä\\x91á»\\x8dc': 'Chỉ cập nhật trạng thái đã đọc',
  'Chá»‰ cáº\\xadp nháº\\xadt tráº¡ng thÃ¡i Ä\\x91Ã£ Ä\\x91á»\\x8dc': 'Chỉ cập nhật trạng thái đã đọc',
  'Chá»‰ cáº\\xadp nháº\\xadt tráº¡ng thÃ¡i Ä‘Ã£ Ä‘á»\\x8dc': 'Chỉ cập nhật trạng thái đã đọc',
  'Gá»\\x8di API logout Ä\\x91á»ƒ backend set lastActive=null, isOnline=false TRÆ¯á»\\x9aC': 'Gọi API logout để backend set lastActive=null, isOnline=false TRƯỚC',
  'Gá»\\x8di API logout Ä‘á»ƒ backend set lastActive=null, isOnline=false TRÆ¯á»šC': 'Gọi API logout để backend set lastActive=null, isOnline=false TRƯỚC',
  'Há»\\x93 sÆ¡ chi tiáº¿t': 'Hồ sơ chi tiết',
  'Há»“ sÆ¡ chi tiáº¿t': 'Hồ sơ chi tiết',
  'Ä\\x90Ä\\x83ng xuáº\\xadt': 'Đăng xuất',
  'Ä\\x90Ä\\x83ng xuáº¥t': 'Đăng xuất',
  'Ä‘Ä\\x83ng xuáº¥t': 'đăng xuất',
  'ÄÄƒng xuáº¥t': 'Đăng xuất',
  'KhÃ´ng cÃ³ thÃ´ng bÃ¡o nÃ\\xa0o trong má»\\xa5c nÃ\\xa0y': 'Không có thông báo nào trong mục này',
  'KhÃ´ng cÃ³ thÃ´ng bÃ¡o nÃ\\xa0o': 'Không có thông báo nào',
  'Duyá»‡t Ä\\x90Ä\\x83ng KÃ½ NhÃ¢n Sá»±': 'Duyệt Đăng Ký Nhân Sự',
  'Duyá»‡t ÄÄƒng KÃ½ NhÃ¢n Sá»±': 'Duyệt Đăng Ký Nhân Sự',
  'PhÃª duyá»‡t quyá»\\x81n truy cáº\\xadp': 'Phê duyệt quyền truy cập',
  'TÃªn Ä\\x91Ä\\x83ng nháº\\xadt': 'Tên đăng nhập',
  'TÃªn Ä‘Ä\\x83ng nháº\\xadt': 'Tên đăng nhập',
  'TÃªn Ä‘Äƒng nháº\\xadt': 'Tên đăng nhập',
  'Sá»\\x91 Ä\\x91iá»‡n thoáº¡i': 'Số điện thoại',
  'Sá»‘ Ä\\x91iá»‡n thoáº¡i': 'Số điện thoại',
  'Sá»‘ Ä‘iá»‡n thoáº¡i': 'Số điện thoại',
  'NÄ\\x83m sinh': 'Năm sinh',
  'Chá»\\x8dn chá»©c vá»\\xa5': 'Chọn chức vụ',
  'PhÃª duyá»‡t & Ä\\x90á»\\x93ng Ã½': 'Phê duyệt & Đồng ý',
  'PhÃª duyá»‡t & Ä\\x90á»“ng Ã½': 'Phê duyệt & Đồng ý',
  'PhÃª duyá»‡t & Äá»“ng Ã½': 'Phê duyệt & Đồng ý'
};

for (const [key, value] of Object.entries(replacements)) {
  content = content.split(key).join(value);
}

fs.writeFileSync('src/components/admin/Header.tsx', content, 'utf8');
console.log('Fix script header complete.');
