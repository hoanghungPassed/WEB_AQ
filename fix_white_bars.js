const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

const fixWhiteBars = (filePath) => {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        let newContent = content
            .replace(/border-white\/5/g, 'border-white/[0.02]')
            .replace(/border-white\/10/g, 'border-white/[0.02]')
            .replace(/border-white\/20/g, 'border-white/[0.04]')
            .replace(/border-white\/30/g, 'border-white/[0.05]')
            .replace(/w-px bg-white\/10/g, 'w-px bg-white/[0.02]')
            .replace(/w-px bg-white\/5/g, 'w-px bg-white/[0.02]')
            .replace(/h-px bg-white\/10/g, 'h-px bg-white/[0.02]')
            .replace(/h-px bg-white\/5/g, 'h-px bg-white/[0.02]')
            
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log('Fixed white bars in', filePath);
        }
    }
}

walkDir('src/app', fixWhiteBars);
walkDir('src/components', fixWhiteBars);
