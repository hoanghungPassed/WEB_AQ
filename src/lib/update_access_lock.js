const fs = require('fs');
const path = '../components/admin/modals/AccessLock.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'const [status, setStatus] = useState<"IDLE" | "PENDING" | "APPROVED" | "DENIED">("IDLE");',
  'const [status, setStatus] = useState<"IDLE" | "PROCESSING" | "GRANTED" | "REJECTED">("IDLE");'
);

content = content.replace('if (localResponse === "DENIED") {', 'if (localResponse === "REJECTED") {');
content = content.replace('setStatus("DENIED");', 'setStatus("REJECTED");');
content = content.replace('if (localResponse === "APPROVED") {', 'if (localResponse === "GRANTED") {');
content = content.replace('setStatus("APPROVED");', 'setStatus("GRANTED");');

const pollingEffectRegex = /useEffect\(\(\) => \{[\s\S]+?\}, \[requestSent, userName\]\);/;
const newPollingEffect = `useEffect(() => {
    if (!requestSent) return;

    const checkApproval = async () => {
      try {
        const res = await fetch(\`/api/auth/check-status?username=\${userName}\`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "GRANTED") {
            setStatus("GRANTED");
            setTimeout(() => {
              window.location.reload();
            }, 2000);
            return true;
          } else if (data.status === "REJECTED") {
            setStatus("REJECTED");
            return true;
          }
        }
      } catch (err) {
        console.error("AccessLock server check error:", err);
      }
      return false;
    };

    const checkInterval = setInterval(async () => {
      const done = await checkApproval();
      if (done) clearInterval(checkInterval);
    }, 3000);

    checkApproval();

    return () => clearInterval(checkInterval);
  }, [requestSent, userName]);`;
content = content.replace(pollingEffectRegex, newPollingEffect);

content = content.replace('setStatus("PENDING");', 'setStatus("PROCESSING");');

content = content.replace(
  /\{status === "PENDING" && \([\s\S]+?\}\)/,
  `{status === "PROCESSING" && (
              <div className="h-16 px-10 rounded-2xl bg-white/5 border border-white/5 text-gold font-black uppercase tracking-widest flex items-center justify-center gap-3 animate-pulse">
                <ShieldAlert size={24} /> Processing...
              </div>
            )}`
);

content = content.replace(
  /\{status === "APPROVED" && \([\s\S]+?\}\)/,
  `{status === "GRANTED" && (
              <div className="h-16 px-10 rounded-2xl bg-green-500 text-white font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-green-500/20">
                <CheckCircle2 size={24} /> Approved
              </div>
            )}`
);

content = content.replace(
  /\{status === "DENIED" && \([\s\S]+?\}\)/,
  `{status === "REJECTED" && (
              <div className="flex flex-col gap-4">
                <div className="h-16 px-10 rounded-2xl bg-red-500/10 border border-red-500 text-red-500 font-black uppercase tracking-widest flex items-center justify-center gap-3">
                  <ShieldAlert size={24} /> Rejected
                </div>
                <button
                  onClick={() => setStatus("IDLE")}
                  className="text-gold text-base font-bold hover:underline"
                >
                  Thử gửi lại yêu cầu
                </button>
              </div>
            )}`
);

fs.writeFileSync(path, content, 'utf8');
