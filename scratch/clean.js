const fs = require('fs');

function cleanFile(filePath) {
  let file = fs.readFileSync(filePath, 'utf8');

  file = file.replace(/const savedMails = typeof window !== "undefined" \? localStorage\.getItem\("global_mails_data"\) : null;/g, 'const savedMails = null;');
  file = file.replace(/const savedMails = localStorage\.getItem\("global_mails_data"\);/g, 'const savedMails = null;');
  file = file.replace(/const savedTasks = localStorage\.getItem\("global_tasks_data"\);/g, 'const savedTasks = null;');
  file = file.replace(/localStorage\.setItem\("global_mails_data", JSON\.stringify\(.*?\)\);/g, '');
  file = file.replace(/localStorage\.setItem\("global_tasks_data", JSON\.stringify\(.*?\)\);/g, '');
  file = file.replace(/localStorage\.removeItem\("realtime_toast"\);/g, '');
  
  file = file.replace(/const savedUsers = localStorage\.getItem\("global_users"\);/g, 'const savedUsers = null;');
  file = file.replace(/localStorage\.setItem\("global_users", JSON\.stringify\(.*?\)\);/g, '');

  file = file.replace(/const savedKPI = localStorage\.getItem\("global_kpi_data"\);/g, 'const savedKPI = null;');
  file = file.replace(/localStorage\.setItem\("global_kpi_data", JSON\.stringify\(.*?\)\);/g, '');

  fs.writeFileSync(filePath, file);
}

cleanFile('src/app/admin/tasks/page.tsx');
cleanFile('src/app/admin/page.tsx');
