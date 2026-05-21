const fs = require('fs');

const filesToUpdate = [
  'src/app/admin/phone/batches/page.tsx',
  'src/app/admin/phone/list/page.tsx',
  'src/app/admin/tasks/page.tsx',
  'src/components/admin/MailManagement.tsx',
  'src/data/monetizedData.ts',
  'src/data/rootData.ts',
  'src/data/satelliteData.ts'
];

filesToUpdate.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');

    // Replace PhoneItem imports
    content = content.replace(/import\s*\{\s*([^}]*?PhoneItem[^}]*?)\}\s*from\s*['"]@\/data\/mockData['"]/g, (match, p1) => {
      let imports = p1.split(',').map(s => s.trim()).filter(Boolean);
      let adminImports = [];
      let mockImports = [];
      imports.forEach(i => {
        if (['PhoneItem', 'PhoneStatus', 'MailData'].includes(i)) adminImports.push(i);
        else mockImports.push(i);
      });
      let result = 'import { ' + adminImports.join(', ') + ' } from "@/types/admin";';
      if (mockImports.length) {
        result += '\nimport { ' + mockImports.join(', ') + ' } from "@/data/mockData";';
      }
      return result;
    });

    // Replace MailData imports from @/data/mockData
    content = content.replace(/import\s*\{\s*([^}]*?MailData[^}]*?)\}\s*from\s*['"]@\/data\/mockData['"]/g, (match, p1) => {
      let imports = p1.split(',').map(s => s.trim()).filter(Boolean);
      let adminImports = [];
      let mockImports = [];
      imports.forEach(i => {
        if (['PhoneItem', 'PhoneStatus', 'MailData'].includes(i)) adminImports.push(i);
        else mockImports.push(i);
      });
      let result = 'import { ' + adminImports.join(', ') + ' } from "@/types/admin";';
      if (mockImports.length) {
        result += '\nimport { ' + mockImports.join(', ') + ' } from "@/data/mockData";';
      }
      return result;
    });

    // Replace MailData imports from ./mockData
    content = content.replace(/import\s*\{\s*MailData\s*\}\s*from\s*['"]\.\/mockData['"]/g, 'import { MailData } from "@/types/admin";');

    fs.writeFileSync(f, content);
    console.log('Updated ' + f);
  }
});
