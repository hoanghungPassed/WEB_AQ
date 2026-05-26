const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('src/app', function(filePath) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let newContent = content
            .replace(/text-gray-400 hover:text-gray-900 text-white/g, 'text-gray-400 hover:text-white')
            .replace(/text-gray-500 hover:text-gray-900 text-white/g, 'text-gray-500 hover:text-white')
            .replace(/text-gray-500 hover:text-gray-800 hover:hover:text-gray-900 text-white/g, 'text-gray-500 hover:text-white')
            .replace(/border-white\/5/g, 'border-gold/30')
            .replace(/border-white\/10/g, 'border-gold/40')
            .replace(/border-white\/20/g, 'border-gold/50')
            .replace(/border-border-custom/g, 'border-gold/30')
            .replace(/border-zinc-800/g, 'border-gold/30');
            
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log('Updated', filePath);
        }
    }
});

walkDir('src/components', function(filePath) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let newContent = content
            .replace(/text-gray-400 hover:text-gray-900 text-white/g, 'text-gray-400 hover:text-white')
            .replace(/text-gray-500 hover:text-gray-900 text-white/g, 'text-gray-500 hover:text-white')
            .replace(/text-gray-500 hover:text-gray-800 hover:hover:text-gray-900 text-white/g, 'text-gray-500 hover:text-white')
            .replace(/border-white\/5/g, 'border-gold/30')
            .replace(/border-white\/10/g, 'border-gold/40')
            .replace(/border-white\/20/g, 'border-gold/50')
            .replace(/border-border-custom/g, 'border-gold/30')
            .replace(/border-zinc-800/g, 'border-gold/30');
            
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log('Updated', filePath);
        }
    }
});
