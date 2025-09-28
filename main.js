const editor=document.getElementById("press")
let savedSelection = null;
editor.style.fontSize = "16px";

document.addEventListener("selectionchange", () => {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const anchor = sel.anchorNode;
  if (anchor && editor.contains(anchor)) {
    // cloneRange so it remains valid after DOM changes
    savedSelection = sel.getRangeAt(0).cloneRange();
  }
});

// Helper to restore saved selection
function restoreSavedSelection() {
  const sel = window.getSelection();
  sel.removeAllRanges();
  if (savedSelection) {
    try {
      sel.addRange(savedSelection.cloneRange());
      return true;
    } catch (e) {
      // fallthrough if range invalid
    }
  }
  return false;
}

function formatdoc(cmd, value = null) {
    editor.focus()
    restoreSavedSelection()
    if (value) {
        document.execCommand(cmd, false, value);
    } else {
        document.execCommand(cmd);
    }
}

function addlink() {
    const url = prompt('Insert URL');
    if (url) formatdoc('createLink', url);
}

editor.addEventListener('mouseenter', function () {
    const a = editor.querySelectorAll('a');
    a.forEach(item => {
        item.addEventListener('mouseenter', function () {
            editor.setAttribute('contenteditable', false);
            item.target = '_blank';
        });
        item.addEventListener('mouseleave', function () {
            editor.setAttribute('contenteditable', true);
        });
    });
});

// Insert table
document.getElementById("table").addEventListener("click", () => {
  const rows = prompt("Enter number of rows:", 2);
  const cols = prompt("Enter number of columns:", 2);

  if (rows > 0 && cols > 0) {
    let table = "<table border='1' style='border-collapse:collapse; margin:10px 0;'>";
    for (let r = 0; r < rows; r++) {
      table += "<tr>";
      for (let c = 0; c < cols; c++) {
        table += "<td style='padding:8px; min-width:80px; text-align:center;'>Cell</td>";
      }
      table += "</tr>";
    }
    table += "</table>";

    editor.focus();
    document.execCommand("insertHTML", false, table);
  }
});

// Insert image 
const imgUpload = document.getElementById("imageUpload");
const imgLocal = document.getElementById("imageLocal");
const imgURL = document.getElementById("image");

// URL-based image
imgURL.addEventListener("click", () => {
  const url = prompt("Enter image URL:");
  if (!url) return;
  const img = document.createElement("img");
  img.src = url;
  img.style.maxWidth = "300px";
  img.style.height = "auto";
  insertAtCaret(img);
});

// Local image upload
imgLocal.addEventListener("click", () => imgUpload.click());
imgUpload.addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = document.createElement("img");
    img.src = e.target.result;
    img.style.maxWidth = "300px";
    img.style.height = "auto";
    insertAtCaret(img);
  };
  reader.readAsDataURL(file);
});

// Helper: insert node at caret
function insertAtCaret(node) {
  editor.focus();
  const sel = window.getSelection();
  if (!sel.rangeCount) {
    editor.appendChild(node);
    return;
  }
  const range = sel.getRangeAt(0);
  range.deleteContents();
  range.insertNode(node);

  // Move caret after inserted image
  range.setStartAfter(node);
  range.setEndAfter(node);
  sel.removeAllRanges();
  sel.addRange(range);
}

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

document.getElementById("exportDOCX").addEventListener("click", () => {
  const title = document.getElementById("docTitle").value || "Untitled";
  const author = document.getElementById("docAuthor").value || "Unknown Author";
  const content = editor.innerHTML;

  const html = `
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

  const blob = htmlDocx.asBlob(html);
  saveAs(blob, title.replace(/\s+/g, "_") + ".docx");
});


document.getElementById("exportPDF").addEventListener("click", () => {
  const title = document.getElementById("docTitle").value || "Untitled";
  const author = document.getElementById("docAuthor").value || "Unknown Author";

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <h1>${title}</h1>
    <h3>By ${author}</h3>
    <div>${editor.innerHTML}</div>
  `;

  const opt = {
    margin:       10,
    filename:     title.replace(/\s+/g, "_") + ".pdf",
    image:        { type: "jpeg", quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: "mm", format: "a4", orientation: "portrait" }
  };

  html2pdf().set(opt).from(wrapper).save();
});


//preveiw da 

const previewBtn = document.getElementById("previewBtn");
const previewModal = document.getElementById("previewModal");
const previewBody = document.getElementById("previewBody");
const closePreview = document.getElementById("closePreview");

// Open preview
previewBtn.addEventListener("click", () => {
  const title = document.getElementById("docTitle").value || "Untitled";
  const author = document.getElementById("docAuthor").value || "Unknown Author";
  const content = document.getElementById("press").innerHTML;

  previewBody.innerHTML = `
    <h1>${title}</h1>
    <h3>By ${author}</h3>
    <div>${content}</div>
  `;

  previewModal.style.display = "block";
});

// Close preview
closePreview.addEventListener("click", () => {
  previewModal.style.display = "none";
});

// Close when clicking outside modal content
window.addEventListener("click", (e) => {
  if (e.target === previewModal) {
    previewModal.style.display = "none";
  }
});

//reset

const resetBtn = document.getElementById("resetBtn");

resetBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to reset the editor? This will clear all content.")) {
        // Clear editor content
        editor.innerHTML = "<br>";

        // Optional: reset title and author inputs
        document.getElementById("docTitle").value = "";
        document.getElementById("docAuthor").value = "";

        // Reset saved selection
        savedSelection = null;

        // Focus editor after reset
        editor.focus();
    }
});
