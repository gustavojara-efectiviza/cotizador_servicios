const fs = require('fs');
const filePath = 'C:/Users/gusta/.gemini/antigravity/scratch/zunz-cotizador/src/utils/excelExport.js';
let content = fs.readFileSync(filePath, 'utf8');

const regex = /const blob = new Blob\(\[buffer\], \{ type: 'application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet' \}\);\s*saveAs\(blob, nombreArchivo\);/g;

if (regex.test(content)) {
    const replacement = `const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo || 'Cotizacion_Beigel.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);`;
    
    content = content.replace(regex, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('REPLACED SUCCESSFULLY');
} else {
    console.log('PATTERN NOT FOUND.');
}
