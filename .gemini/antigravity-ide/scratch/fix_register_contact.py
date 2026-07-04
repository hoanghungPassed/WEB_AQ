import os

file_path = r"c:\Users\HoangHung\Documents\GitHub\WEB_AQ\src\app\register/page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Normalize newlines to Unix style for matching, then we will convert back or replace safely.
# Actually, let's just use splitlines or search without newlines.
idx = content.rfind(" </div>")
if idx != -1:
    # Check if this is indeed the last closing div of the component
    remaining = content[idx:]
    if ");" in remaining and "}" in remaining:
        # We can insert before this </div>
        modal_code = """      {/* Contact Admin Modal */}
      <AnimatePresence>
        {showContactModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowContactModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm rounded-[24px] border border-gold/20 bg-[#161616]/95 p-6 text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center">
                <div className="h-12 w-12 rounded-full bg-gold/10 flex items-center justify-center text-gold mb-4 border border-gold/20">
                  <PhoneCall size={20} />
                </div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider mb-2">Liên hệ Ban quản trị</h3>
                <p className="text-xs text-gray-400 mb-6 font-sans">Nếu bạn gặp sự cố đăng ký hoặc cần kích hoạt tài khoản, vui lòng gọi điện hoặc nhắn tin trực tiếp:</p>
                
                <div className="w-full bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center justify-between mb-6">
                  <span className="text-xl font-mono font-black text-gold tracking-wider">{adminPhone}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(adminPhone);
                      toast.success("Đã copy số điện thoại Admin!");
                    }}
                    className="bg-gold/10 hover:bg-gold hover:text-black transition-all p-2 rounded-lg text-gold border border-gold/20"
                    title="Sao chép số điện thoại"
                  >
                    <Copy size={16} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="w-full h-11 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-xl text-xs uppercase tracking-widest transition-all"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
"""
        new_content = content[:idx] + modal_code + content[idx:]
        
        # Also let's replace the imports and states
        old_import = 'import { Lock, User, Loader2, ArrowLeft, Phone, Calendar, MapPin, AlertCircle, CheckCircle2, Clock, Mail } from "lucide-react";'
        new_import = 'import { Lock, User, Loader2, ArrowLeft, Phone, Calendar, MapPin, AlertCircle, CheckCircle2, Clock, Mail, PhoneCall, Copy } from "lucide-react";'
        new_content = new_content.replace(old_import, new_import)

        target_state_start = "export default function RegisterPage() {"
        state_insertion = """export default function RegisterPage() {
  const [adminPhone, setAdminPhone] = useState("0987654321");
  const [showContactModal, setShowContactModal] = useState(false);

  useEffect(() => {
    fetch("/api/settings/public")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.adminPhone) {
          setAdminPhone(data.data.adminPhone);
        }
      })
      .catch(console.error);
  }, []);
"""
        new_content = new_content.replace(target_state_start, state_insertion)

        # Replace footer
        # Support both Unix and Windows newlines for the footer replacement
        footer_patterns = [
            # Unix
            "  <div class=\"md:col-span-2 text-center mt-6\">\n  <Link href=\"/login\" className=\"text-[10px] font-black text-gray-500 hover:text-gold transition-colors flex items-center justify-center gap-2 uppercase tracking-widest\">\n  <ArrowLeft size={16} /> Quay lại đăng nhập\n  </Link>\n  </div>",
            # Windows
            "  <div className=\"md:col-span-2 text-center mt-6\">\r\n  <Link href=\"/login\" className=\"text-[10px] font-black text-gray-500 hover:text-gold transition-colors flex items-center justify-center gap-2 uppercase tracking-widest\">\r\n  <ArrowLeft size={16} /> Quay lại đăng nhập\r\n  </Link>\r\n  </div>",
            # Or simpler:
            "  <Link href=\"/login\" className=\"text-[10px] font-black text-gray-500 hover:text-gold transition-colors flex items-center justify-center gap-2 uppercase tracking-widest\">\r\n  <ArrowLeft size={16} /> Quay lại đăng nhập\r\n  </Link>"
        ]
        
        replaced_footer = False
        for pattern in footer_patterns:
            if pattern in new_content:
                new_footer = pattern + """\r\n  <button
    type="button"
    onClick={() => setShowContactModal(true)}
    className="text-[9px] font-black text-gray-500 hover:text-gold uppercase tracking-widest transition-colors flex items-center justify-center gap-1 mx-auto mt-4"
  >
    <PhoneCall size={10} /> Liên hệ Admin hỗ trợ
  </button>"""
                new_content = new_content.replace(pattern, new_footer)
                replaced_footer = True
                break
        
        if not replaced_footer:
            # Fallback replacement
            print("WARNING: could not replace footer exactly, attempting fallback")
            
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print("SUCCESS")
    else:
        print("ERROR: closing tags not valid")
else:
    print("ERROR: could not find closing div")
