const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('c:/Users/Admin/Desktop/Web_AQ/WEB_AQMEDIA/src');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Optional chaining for user
    content = content.replace(/\buser\.role\b/g, 'user?.role');
    content = content.replace(/\buser\.username\b/g, 'user?.username');
    content = content.replace(/\bcurrentUser\.role\b/g, 'currentUser?.role');
    content = content.replace(/\bcurrentUser\.username\b/g, 'currentUser?.username');
    content = content.replace(/\buser\.name\b/g, 'user?.name');
    content = content.replace(/\bcurrentUser\.name\b/g, 'currentUser?.name');

    // Defensive arrays for common variable names
    // This looks for variable names followed by .map, .filter, or .length
    // and wraps them in (varName || []) if not already wrapped.
    // E.g. users.map -> (users || []).map
    
    const arrayRegex = /\b([a-zA-Z0-9_]+)\.(map|filter|length)\b/g;
    content = content.replace(arrayRegex, (match, p1, p2) => {
        // Exclude some common non-array or already safe cases
        if (['window', 'document', 'e', 'Math', 'console', 'String', 'Object', 'Array', 'Date', 'localStorage', 'sessionStorage', 'JSON', 'res', 'req'].includes(p1)) {
            return match;
        }
        return `(${p1} || []).${p2}`;
    });

    // Fix double wrapping if we accidentally wrapped an already wrapped one: ((users || []) || []).map
    // Simple fix: just run a cleanup pass.
    content = content.replace(/\(\(([a-zA-Z0-9_]+)\s*\|\|\s*\[\]\)\s*\|\|\s*\[\]\)/g, '($1 || [])');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed', file);
    }
});
