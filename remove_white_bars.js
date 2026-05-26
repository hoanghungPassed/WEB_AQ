const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

const removeWhiteBars = (filePath) => {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        let newContent = content
            // My previous script broke Tailwind opacity modifier by using /[0.02]
            // We'll revert them to native tailwind classes
            .replace(/border-white\/\[0\.02\]/g, 'border-white/0') // Change to 0 so they are removed as requested
            .replace(/border-white\/\[0\.04\]/g, 'border-white/5') // 5 is very faint
            .replace(/border-white\/\[0\.05\]/g, 'border-white/5')
            .replace(/bg-white\/\[0\.02\]/g, 'bg-white/0')
            .replace(/bg-white\/\[0\.04\]/g, 'bg-white/5')
            .replace(/bg-white\/\[0\.05\]/g, 'bg-white/5')
            
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log('Removed broken white bars in', filePath);
        }
    }
}

walkDir('src/app', removeWhiteBars);
walkDir('src/components', removeWhiteBars);
