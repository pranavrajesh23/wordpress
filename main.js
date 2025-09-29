class Basic {
  constructor(titleId, authorId, contentId) {
    this.titleInput = document.getElementById(titleId);
    this.authorInput = document.getElementById(authorId);
    this.contentDiv = document.getElementById(contentId);
    this.savedSelection = null;
    this.contentDiv.style.fontSize = "16px";
    // Start tracking selection
    this.trackSelection();
  }

  getTitle() {
    return this.titleInput.value || "Untitled";
  }

  getAuthor() {
    return this.authorInput.value || "Unknown Author";
  }

  getContent() {
    return this.contentDiv.innerHTML;
  }
    paster(){
  this.contentDiv.addEventListener("paste", function(e) {
    e.preventDefault(); // stop default paste

    // Get plain text from clipboard
    let text = (e.clipboardData || window.clipboardData).getData('text/plain');

    // Normalize line breaks:
    // 1. Remove trailing/leading spaces on lines
    // 2. Replace multiple consecutive newlines with a single newline
    // text = text
    //     .split('\n')
    //     .map(line => line.trim())   // trim each line
    //     .filter(line => line !== '') // remove empty lines
    //     .join('\n');          
    text = text.replace(/\n{2,}/g, "\n"); // collapse multiple newlines to one
      

    // Insert cleaned text at cursor
    document.execCommand("insertText", false, text);
});
} 
  trackSelection() {
    document.addEventListener("selectionchange", () => {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const anchor = sel.anchorNode;
      if (anchor && this.contentDiv.contains(anchor)) {
        // cloneRange so it remains valid after DOM changes
        this.savedSelection = sel.getRangeAt(0).cloneRange();
      }
    });
  }

  restoreSelection() {
    const sel = window.getSelection();
    sel.removeAllRanges();
    if (this.savedSelection) {
      try {
        sel.addRange(this.savedSelection.cloneRange());
        return true;
      } catch (e) {
        // range may be invalid
      }
    }
    return false;
  }
}


class DocumentExporter extends Basic {
  exportHTML() {
    const title = this.getTitle();
    const author = this.getAuthor();
    const content = this.getContent();

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
  }

  exportDOCX() {
    const title = this.getTitle();
    const author = this.getAuthor();
    const content = this.getContent();

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
  }

  exportPDF() {
    const title = this.getTitle();
    const author = this.getAuthor();

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <h1>${title}</h1>
      <h3>By ${author}</h3>
      <div>${this.getContent()}</div>
    `;

    const opt = {
      margin: 10,
      filename: title.replace(/\s+/g, "_") + ".pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    };

    html2pdf().set(opt).from(wrapper).save();
  }

  bindEvents(htmlBtnId, docxBtnId, pdfBtnId) {
    document.getElementById(htmlBtnId).addEventListener("click", () => this.exportHTML());
    document.getElementById(docxBtnId).addEventListener("click", () => this.exportDOCX());
    document.getElementById(pdfBtnId).addEventListener("click", () => this.exportPDF());
  }
}

class DocumentPreview extends Basic {
  constructor(titleId, authorId, contentId, previewBtnId, modalId, bodyId, closeBtnId) {
    super(titleId, authorId, contentId);
    this.previewBtn = document.getElementById(previewBtnId);
    this.previewModal = document.getElementById(modalId);
    this.previewBody = document.getElementById(bodyId);
    this.closeBtn = document.getElementById(closeBtnId);
  }

  openPreview() {
    const title = this.getTitle();
    const author = this.getAuthor();
    const content = this.getContent();

    this.previewBody.innerHTML = `
      <h1>${title}</h1>
      <h3>By ${author}</h3>
      <div>${content}</div>
    `;

    this.previewModal.style.display = "block";
  }

  closePreview() {
    this.previewModal.style.display = "none";
  }

  bindEvents() {
    this.previewBtn.addEventListener("click", () => this.openPreview());
    this.closeBtn.addEventListener("click", () => this.closePreview());

    // Close when clicking outside modal
    window.addEventListener("click", (e) => {
      if (e.target === this.previewModal) {
        this.closePreview();
      }
    });
  }
}

class DocumentReset extends Basic {
  constructor(titleId, authorId, contentId, resetBtnId) {
    super(titleId, authorId, contentId); // inherit title, author, content, and selection tracking
    this.resetBtn = document.getElementById(resetBtnId);
  }

  resetEditor() {
    if (confirm("Are you sure you want to reset the editor? This will clear all content.")) {
      // Clear editor content
      this.contentDiv.innerHTML = "<br>";

      // Reset title and author inputs
      this.titleInput.value = "";
      this.authorInput.value = "";

      // Reset saved selection
      this.savedSelection = null;

      // Focus back to editor
      this.contentDiv.focus();
    }
  }

  bindEvents() {
    this.resetBtn.addEventListener("click", () => this.resetEditor());
  }
}


class FindReplace extends Basic {
  constructor(titleId, authorId, contentId, findInputId, replaceInputId, findNextBtnId, replaceOneBtnId, replaceAllBtnId) {
    super(titleId, authorId, contentId); // inherit editor/contentDiv

    this.findInput = document.getElementById(findInputId);
    this.replaceInput = document.getElementById(replaceInputId);
    this.findNextBtn = document.getElementById(findNextBtnId);
    this.replaceOneBtn = document.getElementById(replaceOneBtnId);
    this.replaceAllBtn = document.getElementById(replaceAllBtnId);

    this.lastMatchIndex = -1;

    this.bindEvents();
  }

  findNext() {
    const text = this.contentDiv.innerText;
    const searchTerm = this.findInput.value;
    if (!searchTerm) return;

    let startIndex = text.toLowerCase().indexOf(searchTerm.toLowerCase(), this.lastMatchIndex + 1);
    if (startIndex === -1) {
      startIndex = text.toLowerCase().indexOf(searchTerm.toLowerCase(), 0);
      if (startIndex === -1) {
        alert("No matches found");
        return;
      }
    }

    this.lastMatchIndex = startIndex;

    const range = document.createRange();
    const sel = window.getSelection();
    sel.removeAllRanges();

    let charIndex = 0;
    let nodeStack = [this.contentDiv];
    let node, foundStart = false, stop = false;

    while (!stop && (node = nodeStack.pop())) {
      if (node.nodeType === 3) {
        const nextCharIndex = charIndex + node.length;
        if (!foundStart && startIndex >= charIndex && startIndex < nextCharIndex) {
          range.setStart(node, startIndex - charIndex);
          foundStart = true;
        }
        if (foundStart && (startIndex + searchTerm.length) <= nextCharIndex) {
          range.setEnd(node, (startIndex + searchTerm.length) - charIndex);
          stop = true;
        }
        charIndex = nextCharIndex;
      } else {
        let i = node.childNodes.length;
        while (i--) nodeStack.push(node.childNodes[i]);
      }
    }

    sel.addRange(range);
    this.contentDiv.focus();
  }

  replaceOne() {
    if (!this.findInput.value) return;
    if (window.getSelection().toString().toLowerCase() === this.findInput.value.toLowerCase()) {
      document.execCommand("insertText", false, this.replaceInput.value);
    }
    this.findNext();
  }

  replaceAll() {
    const searchTerm = this.findInput.value;
    const replacement = this.replaceInput.value;
    if (!searchTerm) return;

    this.contentDiv.innerHTML = this.contentDiv.innerHTML.replace(
      new RegExp(searchTerm, "gi"),
      replacement
    );
    this.lastMatchIndex = -1;
  }

  bindEvents() {
    this.findNextBtn.addEventListener("click", () => this.findNext());
    this.replaceOneBtn.addEventListener("click", () => this.replaceOne());
    this.replaceAllBtn.addEventListener("click", () => this.replaceAll());
  }
}

class Insert extends Basic {
  constructor(titleId, authorId, contentId, tableBtnId, imgUrlBtnId, imgLocalBtnId, imgUploadInputId) {
    super(titleId, authorId, contentId);

    this.tableBtn = document.getElementById(tableBtnId);
    this.imgUrlBtn = document.getElementById(imgUrlBtnId);
    this.imgLocalBtn = document.getElementById(imgLocalBtnId);
    this.imgUploadInput = document.getElementById(imgUploadInputId);

    this.initEvents();
  }

  // === Insert Table ===
  insertTable() {
    const rows = parseInt(prompt("Enter number of rows:", 2));
    const cols = parseInt(prompt("Enter number of columns:", 2));

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

      this.contentDiv.focus();
      document.execCommand("insertHTML", false, table);
      // this.setupresizer(table);
    }
  }

  // === Insert Image from URL ===
  insertImageFromURL() {
    const url = prompt("Enter image URL:");
    if (!url) return;
      this.restoreSelection();
      document.execCommand("insertImage", false, url);
      setTimeout(() => this.setupLastInserted("img"), 100);
    
  }


  insertImageFromFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.restoreSelection();
      document.execCommand("insertImage", false, e.target.result);
      setTimeout(() => {
        this.setupLastInserted("img");
        //autoPaginate("press"); /* ✅ NEW */
      }, 100);
    };
    reader.readAsDataURL(file);
  }

  setupLastInserted(tag) {
    if (!this.contentDiv) return;
    const elements = this.contentDiv.querySelectorAll(tag);
    const el = elements[elements.length - 1];
    if (el) this.setupresizer(el);
  }

  setupresizer(element) {
    this.contentDiv.querySelectorAll(".resizing-wrapper").forEach((w) => {
      if (w !== element.parentNode) {
        let parent = w.parentNode;
        while (w.firstChild) parent.insertBefore(w.firstChild, w);
        parent.removeChild(w);
      }
    });
    if (element.parentNode.classList.contains("resizing-wrapper")) return;
    const wrapper = document.createElement("div");
    wrapper.className = "resizing-wrapper";
    element.parentNode.insertBefore(wrapper, element);
    wrapper.appendChild(element);
    ["nw", "ne", "sw", "se", "n", "s", "w", "e"].forEach((pos) => {
      const handle = document.createElement("div");
      handle.className = `resizing-handle ${pos}`;
      wrapper.appendChild(handle);
    });
  }

  
  handleMouseDown = (e) => {
    let target = e.target;
    if (this.contentDiv.contains(target) && !target.closest(".resizing-wrapper")) {
      this.contentDiv.querySelectorAll(".resizing-wrapper").forEach((w) => {
        let parent = w.parentNode;
        while (w.firstChild) parent.insertBefore(w.firstChild, w);
        parent.removeChild(w);
      });
    }
    if (target.tagName === "IMG" || target.tagName === "TABLE") {
      this.setupresizer(target);
      return;
    }
    if (!target.classList.contains("resizing-handle")) return;
    e.preventDefault();
    this.resizer = target.parentNode.querySelector("img, table");
    if (!this.resizer) return;
    const rect = this.resizer.getBoundingClientRect();
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.startWidth = this.resizer.offsetWidth;
    this.startHeight = this.resizer.offsetHeight;
    this.currentHandle = target.classList[1];
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("mouseup", this.handleMouseUp);
  };

  handleMouseMove = (e) => {
    if (!this.resizer) return;
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    let newWidth = this.startWidth;
    let newHeight = this.startHeight;
    switch (this.currentHandle) {
      case "se":
        newWidth += dx;
        newHeight += dy;
        break;
      case "sw":
        newWidth -= dx;
        newHeight += dy;
        break;
      case "ne":
        newWidth += dx;
        newHeight -= dy;
        break;
      case "nw":
        newWidth -= dx;
        newHeight -= dy;
        break;
      case "n":
        newHeight -= dy;
        break;
      case "s":
        newHeight += dy;
        break;
      case "w":
        newWidth -= dx;
        break;
      case "e":
        newWidth += dx;
        break;
    }
    if (newWidth < 50) newWidth = 50;
    if (newHeight < 30) newHeight = 30;
    this.resizer.style.width = `${newWidth}px`;
    this.resizer.style.height = `${newHeight}px`;
  };

  handleMouseUp = () => {
    this.resizer = null;
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("mouseup", this.handleMouseUp);
  };

  bindResizing() {
    this.contentDiv.addEventListener("mousedown", this.handleMouseDown);
    this.contentDiv.addEventListener("click", (e) => {
      if ((e.target.tagName === "IMG" || e.target.tagName === "TABLE") && !e.target.parentNode.classList.contains("resizing-wrapper")) {
        this.setupresizer(e.target);
      }
    });
    document.addEventListener("mousedown", (e) => {
      if (!this.contentDiv.contains(e.target) && !e.target.closest(".resizing-wrapper")) {
        this.contentDiv.querySelectorAll(".resizing-wrapper").forEach((w) => {
          let parent = w.parentNode;
          while (w.firstChild) parent.insertBefore(w.firstChild, w);
          parent.removeChild(w);
        });
      }
    });
  }

  handleDragStart = (e) => {
  const target = e.target.closest("table, img");
  if (!target) return;

  this.dragging = target;
  this.dragStartX = e.clientX - target.offsetLeft;
  this.dragStartY = e.clientY - target.offsetTop;

  document.addEventListener("mousemove", this.handleDragging);
  document.addEventListener("mouseup", this.handleDragEnd);
};

handleDragging = (e) => {
  if (!this.dragging) return;
  e.preventDefault();
  this.dragging.style.position = "absolute";
  this.dragging.style.left = e.clientX - this.dragStartX + "px";
  this.dragging.style.top = e.clientY - this.dragStartY + "px";
};

handleDragEnd = () => {
  this.dragging = null;
  document.removeEventListener("mousemove", this.handleDragging);
  document.removeEventListener("mouseup", this.handleDragEnd);
};

bindResizingAndDragging() {
  this.bindResizing();
  this.contentDiv.addEventListener("mousedown", this.handleDragStart);
}

  // === Helper: Insert Node at Caret ===
  insertAtCaret(node) {
    this.contentDiv.focus();
    const sel = window.getSelection();
    if (!sel.rangeCount) {
      this.contentDiv.appendChild(node);
      return;
    }
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(node);

    // Move caret after inserted node
    range.setStartAfter(node);
    range.setEndAfter(node);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // === Setup All Events ===
  initEvents() {
    // Insert table
    this.tableBtn.addEventListener("click", () => this.insertTable());

    // Insert image from URL
    this.imgUrlBtn.addEventListener("click", () => this.insertImageFromURL());

    // Open file dialog
    this.imgLocalBtn.addEventListener("click", () => this.imgUploadInput.click());

    // Handle file upload
    this.imgUploadInput.addEventListener("change", (e) => this.insertImageFromFile(e.target.files[0]));
  }
}

class Formatting extends Basic {
  constructor(titleId, authorId, contentId, fontSelectId) {
    super(titleId, authorId, contentId);

    this.fontFamilySelect = document.getElementById(fontSelectId);
    this.initLinkHover();
  }

  // Apply formatting commands (bold, italic, underline, etc.)
  formatDoc(cmd, value = null) {
    this.contentDiv.focus();
    this.restoreSelection();

    if (value) {
      document.execCommand(cmd, false, value);
    } else {
      document.execCommand(cmd);
    }
  }

  // Insert hyperlink
  addLink() {
    const url = prompt("Insert URL");
    if (url) this.formatDoc("createLink", url);
  }

  // Handle link hover: disable editing inside links
  initLinkHover() {
    this.contentDiv.addEventListener("mouseenter", () => {
      const links = this.contentDiv.querySelectorAll("a");

      links.forEach((item) => {
        item.addEventListener("mouseenter", () => {
          this.contentDiv.setAttribute("contenteditable", false);
          item.target = "_blank";
        });

        item.addEventListener("mouseleave", () => {
          this.contentDiv.setAttribute("contenteditable", true);
        });
      });
    });
  }
}



// Create one global instance of Formatting
const formatter = new Formatting("docTitle", "docAuthor", "press");

// Wire buttons to formatter methods
document.getElementById("bold").addEventListener("click", () => formatter.formatDoc("bold"));
document.getElementById("italic").addEventListener("click", () => formatter.formatDoc("italic"));
document.getElementById("underline").addEventListener("click", () => formatter.formatDoc("underline"));
document.getElementById("undo").addEventListener("click", () => formatter.formatDoc("undo"));
document.getElementById("redo").addEventListener("click", () => formatter.formatDoc("redo"));
document.getElementById("strike").addEventListener("click", () => formatter.formatDoc("strikeThrough"));

document.getElementById("left").addEventListener("click", () => formatter.formatDoc("justifyLeft"));
document.getElementById("center").addEventListener("click", () => formatter.formatDoc("justifyCenter"));
document.getElementById("right").addEventListener("click", () => formatter.formatDoc("justifyRight"));
document.getElementById("justify").addEventListener("click", () => formatter.formatDoc("justifyFull"));
document.getElementById("indent").addEventListener("click", () => formatter.formatDoc("indent"));
document.getElementById("outdent").addEventListener("click", () => formatter.formatDoc("outdent"));

document.getElementById("olist").addEventListener("click", () => formatter.formatDoc("insertOrderedList"));
document.getElementById("ulist").addEventListener("click", () => formatter.formatDoc("insertUnorderedList"));
document.getElementById("unlink").addEventListener("click", () => formatter.formatDoc("unlink"));

document.getElementById("link").addEventListener("click", () => formatter.addLink());


const insertTools = new Insert(
  "docTitle",     // title input
  "docAuthor",    // author input
  "press",        // editor div (from Basic)
  "table",        // table insert button
  "image",        // image URL button
  "imageLocal",   // local image button
  "imageUpload"   // hidden file input
);
insertTools.bindResizing();

// Usage
const findReplace = new FindReplace(
  "docTitle",    // title input
  "docAuthor",   // author input
  "press",       // editor/content
  "findText",    // find input
  "replaceText", // replace input
  "findNext",    // find next button
  "replaceOne",  // replace one button
  "replaceAll"   // replace all button
);


const resetter = new DocumentReset("docTitle", "docAuthor", "press", "resetBtn");
resetter.bindEvents();


const exporter = new DocumentExporter("docTitle", "docAuthor", "press");
exporter.bindEvents("exportHTML", "exportDOCX", "exportPDF");

const previewer = new DocumentPreview(
  "docTitle", "docAuthor", "press",
  "previewBtn", "previewModal", "previewBody", "closePreview"
);
previewer.bindEvents();


const tabs = document.querySelectorAll('.tabBtn');
const groups = document.querySelectorAll('.ribbonGroup');

        // Show first tab by default
        tabs[0].classList.add('active');
        groups.forEach((g, index) => {
            g.style.display = index === 0 ? 'flex' : 'none';
        });

        // Tab click event
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs
                tabs.forEach(t => t.classList.remove('active'));
                // Add active class to clicked tab
                tab.classList.add('active');

                const target = tab.dataset.tab;

                // Show only the corresponding ribbon group
                groups.forEach(g => {
                    g.style.display = g.id === target ? 'flex' : 'none';
                });
            });
        });




const fontFamilySelect = document.getElementById('fontFamily');

fontFamilySelect.addEventListener('change', function () {
    const font = this.value;
    const sel = window.getSelection();

    if (sel && sel.rangeCount > 0 && sel.toString().length > 0) {
        const selectedText = sel.toString();
        document.execCommand("insertHTML", false, `<span style="font-family:${font};">${selectedText}</span>`);
    } else {
        this.content.style.fontFamily = font;
    }
    this.selectedIndex = 0;
});

const fontSizeSelect = document.getElementById("fsizee");

fontSizeSelect.addEventListener("change", () => {
    const size = fontSizeSelect.value;
    const sel = window.getSelection();

    if (sel && sel.rangeCount > 0 && sel.toString().length > 0) {
        // Apply font size to selected text
        document.execCommand("fontSize", false, size);
    } else {
        // Apply font size to entire editor
        const editor = document.getElementById("press");
        editor.style.fontSize = getFontSize(size);
    }

    fontSizeSelect.selectedIndex = 0; // reset dropdown
});

// Helper function to map numbers 1-7 to px
function getFontSize(val) {
    switch(val) {
        case "1": return "8px";
        case "2": return "10px";
        case "3": return "12px";
        case "4": return "14px";
        case "5": return "18px";
        case "6": return "24px";
        case "7": return "32px";
        default: return "16px";
    }
}

document.getElementById("print").addEventListener("click",function(){
  window.print()
})

const autosaveStatus = document.getElementById('autosaveStatus');
// Autosave function
function autosave() {
    const data = {
        docTitle: docTitle.value || '',
        docAuthor: docAuthor.value || '',
        press: press.innerHTML || ''
    };
    localStorage.setItem('autosaveData', JSON.stringify(data));
    autosaveStatus.textContent = 'Autosaved at ' + new Date().toLocaleTimeString();
    console.log('Autosaved'); // optional: for debug
}
 
// Restore function on page load
function restoreAutosave() {
    const savedData = localStorage.getItem('autosaveData');
    if (savedData) {
        const data = JSON.parse(savedData);
        docTitle.value  = data.docTitle || ''
        docAuthor.value = data.docAuthor || ''
        press.innerHTML = data.press;
        autosaveStatus.textContent = 'Restored previous autosave';
    }
}
 
// Call restore on page load
window.addEventListener('DOMContentLoaded', restoreAutosave);
 
// Autosave every 5 seconds
setInterval(autosave, 5000);



const textColorInput = document.getElementById("textcolor");
const highlightInput = document.getElementById("highlight");
textColorInput.addEventListener("input", () => {
    const color = textColorInput.value;
    formatter.formatDoc("foreColor", color);
});

highlightInput.addEventListener("input", () => {
    const color = highlightInput.value;
    formatter.formatDoc("hiliteColor", color);
});

document.getElementById("newpage").addEventListener('click', function() {
    const newPage = document.createElement("div");
    newPage.classList.add("editorPage");
    newPage.contentEditable = "true";
    newPage.innerHTML = "<br>";

    // Append at end
    const editor = document.getElementById("press");
    editor.appendChild(newPage);

    // Focus new page
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(newPage);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    newPage.focus();
});

const themeBtn=document.getElementById("themeToggle")

if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark-mode");
  themeBtn.textContent = "☀️";
} else {
  themeBtn.textContent = "🌙";
}
 
// Toggle theme
themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
 
  if (document.body.classList.contains("dark-mode")) {
    themeBtn.textContent = "☀️";
    localStorage.setItem("theme", "dark");
  } else {
    themeBtn.textContent = "🌙";
    localStorage.setItem("theme", "light");
  }
});

const editor = document.getElementById("press");
const wordCountDiv = document.getElementById("wordCount");

function updateWordCount() {
    const text = editor.innerText || ""; // get plain text
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    wordCountDiv.textContent = `Words count: ${words.length}`;
}

// Update on input (typing, paste, delete, etc.)
editor.addEventListener("input", updateWordCount);

// Initialize count on page load
updateWordCount();


// const editor = document.getElementById("press");
const zoomSlider = document.getElementById("zoomSlider");
const zoomValue = document.getElementById("zoomValue");

zoomSlider.addEventListener("input", () => {
    const zoomPercent = zoomSlider.value;
    const zoomFactor = zoomPercent / 100;

    editor.style.transform = `scale(${zoomFactor})`;
    editor.style.transformOrigin = "top left";

    zoomValue.textContent = zoomPercent + "%";
});
