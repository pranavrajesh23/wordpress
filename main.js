const editor=document.getElementById("press")
let savedSelection = null;
editor.style.fontSize = "16px";

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
    restoreSavedSelection()
    document.execCommand("insertOrderedList");
});

document.getElementById("ulist").addEventListener("click", () => {
    editor.focus();
    restoreSavedSelection
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

/* ========== FONT SIZE (robust) ========== */
// global variables to store editor & saved selection


// Make sure editor has a default font-size


// Save selection whenever it changes (only if inside editor)
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

/**
 * Apply font-size (px) to current selection or caret.
 * @param {number|string} px - pixel size (e.g. "18" or 18)
 */
function applyFontSize(px) {
  if (!px) return;
  px = String(px);

  // restore selection (if it exists) so we operate on correct range
  restoreSavedSelection();

  const sel = window.getSelection();
  if (!sel.rangeCount) {
    // nothing to do
    editor.focus();
    return;
  }

  const range = sel.getRangeAt(0);

  if (sel.isCollapsed) {
    // collapsed caret -> insert a span with a zero-width-space so user can type with that size
    const span = document.createElement("span");
    span.style.fontSize = px + "px";
    // use ZERO WIDTH SPACE inside so caret stays visible
    span.appendChild(document.createTextNode("\u200B"));
    range.insertNode(span);

    // place caret after the zero-width-space inside the new span
    const newRange = document.createRange();
    newRange.setStart(span.firstChild, 1);
    newRange.collapse(true);

    sel.removeAllRanges();
    sel.addRange(newRange);

    // update savedSelection to the new caret location
    savedSelection = newRange.cloneRange();
  } else {
    // non-collapsed selection -> wrap the selected content in a span with inline font-size
    // Extract current contents and place them inside a span
    const frag = range.extractContents();
    const wrapper = document.createElement("span");
    wrapper.style.fontSize = px + "px";
    wrapper.appendChild(frag);

    // Insert wrapper back into the document
    range.insertNode(wrapper);

    // Clean-up: normalize and reselect the wrapper content
    editor.normalize();

    const newRange = document.createRange();
    newRange.selectNodeContents(wrapper);

    sel.removeAllRanges();
    sel.addRange(newRange);

    // update savedSelection
    savedSelection = newRange.cloneRange();
  }

  // keep focus in editor
  editor.focus();
}

// Hook the dropdown (replace your old listener)
const fsizeSelect = document.getElementById("fsize");
if (fsizeSelect) {
  fsizeSelect.addEventListener("change", function () {
    const size = this.value;
    if (!size) return;
    applyFontSize(size);
    // reset dropdown to show selected size as current (optional)
    // this.value = size;
  });
}

/* OPTIONAL: update dropdown to reflect the font-size of current caret/selection
   (useful UX: when user moves caret, dropdown shows current text size)
*/
function detectAndSetDropdownFontSize() {
  try {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const node = sel.anchorNode && (sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentNode : sel.anchorNode);
    if (!node) return;
    const cs = window.getComputedStyle(node);
    const fs = parseFloat(cs.fontSize);
    if (!isNaN(fs) && fsizeSelect) {
      // pick closest option if exact px not present
      const options = Array.from(fsizeSelect.options).map(o => parseFloat(o.value));
      let closest = options.reduce((a,b) => Math.abs(b-fs) < Math.abs(a-fs) ? b : a, options[0]);
      fsizeSelect.value = String(closest);
    }
  } catch (e) { /* ignore */ }
}
// When selection changes inside editor, optionally update dropdown
document.addEventListener("selectionchange", () => {
  const sel = window.getSelection();
  if (sel.rangeCount && editor.contains(sel.anchorNode)) {
    detectAndSetDropdownFontSize();
  }
});




