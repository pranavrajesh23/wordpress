   
 document.getElementById("press").addEventListener("keydown", function(e) {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault(); // stop browser's Save Page
        e.stopPropagation();
        saveNote();
      }
    });

    function saveNote() {
      let text = document.getElementById("press").value;
      let blob = new Blob([text], { type: "text/plain" });
      let link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "my_note.txt"; // default file name
      link.click();
    }