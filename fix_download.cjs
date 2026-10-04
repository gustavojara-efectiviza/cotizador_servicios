const fs = require('fs');
const filePath = 'C:/Users/gusta/.gemini/antigravity/scratch/zunz-cotizador/src/utils/excelExport.js';
const content = fs.readFileSync(filePath, 'utf8');

let newContent = content.replace(
    "const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });\n  saveAs(blob, nombreArchivo);",
    "const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });\n  const url = window.URL.createObjectURL(blob);\n  const link = document.createElement('a');\n  link.href = url;\n  link.download = nombreArchivo || 'Cotizacion_Beigel.xlsx';\n  document.body.appendChild(link);\n  link.click();\n  document.body.removeChild(link);\n  window.URL.revokeObjectURL(url);"
);

// We should also remove the saveAs const just in case, but it's fine to leave it.
fs.writeFileSync(filePath, newContent, 'utf8');
console.log("Native download logic applied.");
