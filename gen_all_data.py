import sys, json, openpyxl
sys.stdout.reconfigure(encoding='utf-8')

files_config = [
    {
        'path': r'C:\Users\Admin\Desktop\Test Goc.xlsx',
        'type': 'ROOT',
        'out_file': 'src/data/rootData.ts',
        'var_name': 'ROOT_MAILS',
        'workStatus': 'Chưa làm'
    },
    {
        'path': r'C:\Users\Admin\Desktop\TEST VT.xlsx',
        'type': 'SATELLITE',
        'out_file': 'src/data/satelliteData.ts',
        'var_name': 'SATELLITE_MAILS',
        'workStatus': 'Chưa làm'
    },
    {
        'path': r'C:\Users\Admin\Desktop\TEST BKT.xlsx',
        'type': 'MONETIZED',
        'out_file': 'src/data/monetizedData.ts',
        'var_name': 'MONETIZED_MAILS',
        'workStatus': 'Chưa bán'
    }
]

def get_val(ws, row, col_indices):
    for col in col_indices:
        v = ws.cell(row, col).value
        if v is not None:
            return str(v).strip()
    return ""

def process_file(config, start_id):
    path = config['path']
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb.active
    
    headers = []
    for col in range(1, min(ws.max_column + 1, 20)):
        h = ws.cell(1, col).value
        headers.append(str(h).strip().upper() if h else "")

    def find_cols(*names):
        return [i+1 for i, h in enumerate(headers) if h in names]

    mail_cols = find_cols("MAIL", "EMAIL")
    pass_cols = find_cols("PASS", "PASSWORD")
    rec_cols = find_cols("MAIL KP", "RECOVERY", "MAIL KHÔI PHỤC")
    twofa_cols = find_cols("2FA", "TWOFA")
    sdt_cols = find_cols("SĐT", "SDT", "PHONE")
    otp_cols = find_cols("LINK OTP", "LINK SĐT", "OTPLINK")

    records = []
    for row in range(2, ws.max_row + 1):
        mail = get_val(ws, row, mail_cols)
        if not mail:
            continue
            
        pw = get_val(ws, row, pass_cols)
        recovery = get_val(ws, row, rec_cols)
        twofa = get_val(ws, row, twofa_cols)
        sdt = get_val(ws, row, sdt_cols)
        otp = get_val(ws, row, otp_cols)
        
        idx = len(records)
        records.append({
            "id": start_id + idx,
            "email": mail,
            "pass": pw,
            "recovery": recovery,
            "type": config['type'],
            "status": "LIVE",
            "workStatus": config['workStatus'],
            "channelStatus": "Đã bật quảng cáo" if config['type'] == 'MONETIZED' else "",
            "twoFA": twofa,
            "phone": sdt,
            "otpLink": otp,
            "links": [],
            "createdAt": "2024-05-18",
            "assigneeId": "",
            "assignedTo": "",
            "batchName": ""
        })

    wb.close()
    
    lines = ['import { MailData } from "./mockData";\n\n']
    lines.append(f'// Auto-generated from {path.split("\\\\")[-1]}\n')
    lines.append(f'export const {config["var_name"]}: MailData[] = [\n')
    
    for i, r in enumerate(records):
        twofa = r['twoFA'].replace('"', '\\"')
        email = r['email'].replace('"', '\\"')
        pw = r['pass'].replace('"', '\\"')
        recovery = r['recovery'].replace('"', '\\"')
        phone = r['phone'].replace('"', '\\"')
        otp = r['otpLink'].replace('"', '\\"')
        
        lines.append(f'  {{\n')
        lines.append(f'    id: {r["id"]},\n')
        lines.append(f'    email: "{email}",\n')
        lines.append(f'    pass: "{pw}",\n')
        lines.append(f'    recovery: "{recovery}",\n')
        lines.append(f'    type: "{r["type"]}" as const,\n')
        lines.append(f'    status: "LIVE" as const,\n')
        lines.append(f'    workStatus: "{r["workStatus"]}",\n')
        lines.append(f'    channelStatus: "{r["channelStatus"]}",\n')
        lines.append(f'    twoFA: "{twofa}",\n')
        lines.append(f'    phone: "{phone}",\n')
        lines.append(f'    otpLink: "{otp}",\n')
        lines.append(f'    links: [],\n')
        lines.append(f'    createdAt: "{r["createdAt"]}",\n')
        lines.append(f'    assigneeId: "",\n')
        lines.append(f'    assignedTo: "",\n')
        lines.append(f'    batchName: ""\n')
        sep = ',' if i < len(records) - 1 else ''
        lines.append(f'  }}{sep}\n')

    lines.append('];\n')

    with open(config['out_file'], 'w', encoding='utf-8') as f:
        f.writelines(lines)
        
    print(f"Generated {config['out_file']} with {len(records)} records.")
    return len(records)

total = 0
total += process_file(files_config[0], 1)
total += process_file(files_config[1], 1001)
total += process_file(files_config[2], 2001)
print(f"Total processed: {total}")
