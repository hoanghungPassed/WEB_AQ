const fs = require('fs');

const files = [
  'src/app/admin/layout.tsx',
  'src/components/admin/Sidebar.tsx',
  'src/components/admin/Header.tsx',
  'src/contexts/AuthContext.tsx',
  'src/app/admin/page.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace any remaining unsafe object access for user and currentUser
  content = content.replace(/\b(user|currentUser)\.(id|avatar|role|username|name|email)\b/g, '$1?.$2');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed optional chaining in', file);
  }
});
