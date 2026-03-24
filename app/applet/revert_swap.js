const fs = require('fs');
const files = [
    'components/content-creator/ContentDashboard.tsx',
    'components/content-creator/ContentSidebar.tsx',
    'components/content-creator/ContentEditor.tsx'
];
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/bg-black/g, 'TEMP_COLOR_BLACK');
    content = content.replace(/bg-zinc-900/g, 'bg-black');
    content = content.replace(/TEMP_COLOR_BLACK/g, 'bg-zinc-900');
    fs.writeFileSync(file, content);
    console.log('Reverted ' + file);
});
