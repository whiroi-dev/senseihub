const fs = require('fs');
const file = 'frontend/src/pages/GeneratorPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// Remove import
content = content.replace(/import EmailPreviewModal from '\.\.\/components\/EmailPreviewModal';\n/g, '');

// Remove studentEmail state
content = content.replace(/const \[studentEmail, setStudentEmail\] = useState\(""\);\n/g, '');

// Remove email modal state
content = content.replace(/\/\/ Email Preview Modal State[\s\S]*?\}\);\n/g, '');

// Remove studentEmail from payload
content = content.replace(/studentEmail,/g, '');

// Remove email preview logic
content = content.replace(/\/\/ If email preview was returned, show modal[\s\S]*?\}\n/g, '');

// Remove EmailPreviewModal component rendering
content = content.replace(/<EmailPreviewModal[\s\S]*?\/>\n/g, '');

// Remove Email input field block
content = content.replace(/<div[^>]*>\s*<label htmlFor="studentEmail"[\s\S]*?<\/div>\s*<\/div>/g, '</div>');

// Rename button
content = content.replace(/Gerar Certificado & Enviar E-mail/g, 'Gerar Certificado');

fs.writeFileSync(file, content);
console.log('Done');
