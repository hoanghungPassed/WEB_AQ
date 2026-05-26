const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

const restoreBorders = (filePath) => {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Restore borders that made the UI too noisy
        let newContent = content
            .replace(/border-gold\/30/g, 'border-white/5')
            .replace(/border-gold\/40/g, 'border-white/10')
            .replace(/border-gold\/50/g, 'border-white/20');
            
        // Make sure hover states on buttons are kept nice if we accidentally replaced them
        // (Actually, hover:border-gold/30 -> hover:border-white/5 could be bad, but it's fine for now, we want it clean)
        // Wait, if it's hover:border-white/5, it's still cleaner than noisy gold. Let's just do it.

        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log('Restored borders in', filePath);
        }
    }
}

walkDir('src/app', restoreBorders);
walkDir('src/components', restoreBorders);
