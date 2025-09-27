const editor=document.getElementById("press")

document.getElementById('bold').addEventListener('click', () => {
  editor.focus(); 
  document.execCommand('bold', false, null);
});
document.getElementById('italic').addEventListener('click', () => {
  editor.focus(); 
  document.execCommand('italic', false, null);
}); 
document.getElementById('underline').addEventListener('click', () => {
  editor.focus(); 
  document.execCommand('underline', false, null);
}); 

document.getElementById("fontfamily").addEventListener("change", function() {
  editor.focus();
  document.execCommand("fontName", false, this.value);
});

document.getElementById("fsize").addEventListener("change", function() {
  const fsize=document.getElementById("fsize").value
  editor.focus();
  document.execCommand("fontSize", false, fsize);
});


document.getElementById("left").addEventListener("click", () => { editor.focus(); document.execCommand("justifyLeft"); });
document.getElementById("center").addEventListener("click", () => { editor.focus(); document.execCommand("justifyCenter"); });
document.getElementById("right").addEventListener("click", () => { editor.focus(); document.execCommand("justifyRight"); });
document.getElementById("justify").addEventListener("click", () => { editor.focus(); document.execCommand("justifyFull"); });

document.getElementById("textcolor").addEventListener("change", function() {
  editor.focus();
  document.execCommand("foreColor", false, this.value);
});

document.getElementById("highlight").addEventListener("change", function() {
  editor.focus();
  document.execCommand("hiliteColor", false, this.value);
});

document.getElementById("olist").addEventListener("click", () => {
    editor.focus();
    document.execCommand("insertOrderedList");
});

document.getElementById("ulist").addEventListener("click", () => {
    editor.focus();
    document.execCommand("insertUnorderedList");
});

// Insert hyperlink
document.getElementById("link").addEventListener("click", () => {
  const url = prompt("Enter the URL:");
  if (url) {
    editor.focus();
    document.execCommand("createLink", false, url);
  }
});

// Insert image (via URL)
document.getElementById("image").addEventListener("click", () => {
  const url = prompt("Enter the image URL:");
  if (url) {
    editor.focus();
    document.execCommand("insertImage", false, url);
  }
});

// Insert table
document.getElementById("table").addEventListener("click", () => {
  const rows = prompt("Enter number of rows:", 2);
  const cols = prompt("Enter number of columns:", 2);

  if (rows > 0 && cols > 0) {
    let table = "<table border='1' style='border-collapse:collapse;width:100%;'>";
    for (let r = 0; r < rows; r++) {
      table += "<tr>";
      for (let c = 0; c < cols; c++) {
        table += "<td style='padding:5px;'>Cell</td>";
      }
      table += "</tr>";
    }
    table += "</table>";

    editor.focus();
    document.execCommand("insertHTML", false, table);
  }
});

// Local image upload
document.getElementById("imageLocal").addEventListener("click", () => {
  document.getElementById("imageUpload").click(); // trigger file input
});

document.getElementById("imageUpload").addEventListener("change", function() {
  const file = this.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      editor.focus();
      document.execCommand("insertImage", false, e.target.result); // insert as base64
    };
    reader.readAsDataURL(file);
  }
});


// ========== EXPORT FUNCTIONS ==========

// Export HTML
document.getElementById("exportHTML").addEventListener("click", () => {
  const title = document.getElementById("docTitle").value || "Untitled";
  const author = document.getElementById("docAuthor").value || "Unknown Author";
  const content = document.getElementById("press").innerHTML;

  const fileContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="author" content="${author}">
</head>
<body>
  <h1>${title}</h1>
  <h3>By ${author}</h3>
  <div>${content}</div>
</body>
</html>`;

  const blob = new Blob([fileContent], { type: "text/html" });
  saveAs(blob, title.replace(/\s+/g, "_") + ".html");
});

// Export DOCX using html-docx-js
document.getElementById("exportDOCX").addEventListener("click", () => {
  const title = document.getElementById("docTitle").value || "Untitled";
  const author = document.getElementById("docAuthor").value || "Unknown Author";
  const content = document.getElementById("press").innerHTML;

  // Build full HTML document string
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <meta name="author" content="${author}">
      </head>
      <body>
        <h1>${title}</h1>
        <h3>By ${author}</h3>
        <div>${content}</div>
      </body>
    </html>
  `;

  // Convert to Blob using html-docx-js
  const converted = htmlDocx.asBlob(html);
  saveAs(converted, title.replace(/\s+/g, "_") + ".docx");
});

// Export PDF
document.getElementById("exportPDF").addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  const title = document.getElementById("docTitle").value || "Untitled";
  const author = document.getElementById("docAuthor").value || "Unknown Author";
  const content = document.getElementById("press").innerText;

  pdf.setFontSize(18);
  pdf.text(title, 10, 20);
  pdf.setFontSize(14);
  pdf.text("By " + author, 10, 30);
  pdf.setFontSize(12);

  let y = 40;
  const lines = pdf.splitTextToSize(content, 180);
  lines.forEach(line => {
    pdf.text(line, 10, y);
    y += 8;
  });

  pdf.save(title.replace(/\s+/g, "_") + ".pdf");
});
