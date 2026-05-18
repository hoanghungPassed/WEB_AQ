import sys, json
sys.stdout.reconfigure(encoding='utf-8')

with open('excel_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Records: {len(data)}")

# Generate satelliteData.ts
lines = ['import { MailData } from "./mockData";\n\n']
lines.append('// Auto-generated from TEST WEB.xlsx — 99 real satellite mail records\n')
lines.append('export const SATELLITE_MAILS: MailData[] = [\n')

for i, r in enumerate(data):
    twofa = r['twoFA'].replace('"', '\\"')
    email = r['email'].replace('"', '\\"')
    pw = r['pass'].replace('"', '\\"')
    recovery = r['mailKP'].replace('"', '\\"')
    phone = r['phone'].replace('"', '\\"')
    otp = r['otpLink'].replace('"', '\\"')
    
    lines.append(f'  {{\n')
    lines.append(f'    id: {1001 + i},\n')
    lines.append(f'    email: "{email}",\n')
    lines.append(f'    pass: "{pw}",\n')
    lines.append(f'    recovery: "{recovery}",\n')
    lines.append(f'    type: "SATELLITE" as const,\n')
    lines.append(f'    status: "LIVE" as const,\n')
    lines.append(f'    workStatus: "Ch\u01b0a l\u00e0m",\n')
    lines.append(f'    channelStatus: "",\n')
    lines.append(f'    twoFA: "{twofa}",\n')
    lines.append(f'    phone: "{phone}",\n')
    lines.append(f'    otpLink: "{otp}",\n')
    lines.append(f'    links: [],\n')
    lines.append(f'    createdAt: "2024-05-11",\n')
    lines.append(f'    assigneeId: "",\n')
    lines.append(f'    assignedTo: "",\n')
    lines.append(f'    batchName: ""\n')
    sep = ',' if i < len(data) - 1 else ''
    lines.append(f'  }}{sep}\n')

lines.append('];\n')

with open('src/data/satelliteData.ts', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Generated src/data/satelliteData.ts")
