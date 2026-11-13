// Starter canvas layouts — plain data, not components. Each is a function
// (doc, user) => blocks[], used only to SEED a document's layout the first
// time its canvas editor opens (or on an explicit "start over"). Once
// saved, the document's own layout.blocks is the source of truth; these
// never get touched again.
//
// Block shape: {id, x, y, width, height, zIndex, fontSize, fontWeight,
// align, content}. x/y/width/height are in the editor's CSS pixels, on an
// 816x1056 (US Letter @ 96dpi) page.

function skillsLine(user) {
  return ((user && user.skills) || []).map((sk) => sk.label || sk).join(" · ");
}

function bulletsText(doc) {
  return ((doc && doc.resumeBullets) || []).map((b) => "• " + b).join("\n");
}

function classic(doc, user) {
  return [
    { id: "name", x: 48, y: 48, width: 720, height: 44, zIndex: 1,
      fontSize: 26, fontWeight: "bold", align: "left", content: (user && user.name) || "Your Name" },
    { id: "summary", x: 48, y: 110, width: 720, height: 110, zIndex: 2,
      fontSize: 12, fontWeight: "normal", align: "left", content: "SUMMARY\n" + ((doc && doc.resumeSummary) || "") },
    { id: "skills", x: 48, y: 240, width: 720, height: 60, zIndex: 3,
      fontSize: 12, fontWeight: "normal", align: "left", content: "SKILLS\n" + skillsLine(user) },
    { id: "highlights", x: 48, y: 320, width: 720, height: 400, zIndex: 4,
      fontSize: 12, fontWeight: "normal", align: "left", content: "HIGHLIGHTS\n" + bulletsText(doc) },
  ];
}

function twoColumn(doc, user) {
  return [
    { id: "name", x: 48, y: 48, width: 220, height: 80, zIndex: 1,
      fontSize: 22, fontWeight: "bold", align: "left", content: (user && user.name) || "Your Name" },
    { id: "skills", x: 48, y: 140, width: 220, height: 400, zIndex: 2,
      fontSize: 11, fontWeight: "normal", align: "left", content: "SKILLS\n" + skillsLine(user) },
    { id: "summary", x: 300, y: 48, width: 468, height: 150, zIndex: 3,
      fontSize: 12, fontWeight: "normal", align: "left", content: "SUMMARY\n" + ((doc && doc.resumeSummary) || "") },
    { id: "highlights", x: 300, y: 220, width: 468, height: 400, zIndex: 4,
      fontSize: 12, fontWeight: "normal", align: "left", content: "HIGHLIGHTS\n" + bulletsText(doc) },
  ];
}

function boldHeader(doc, user) {
  return [
    { id: "name", x: 48, y: 48, width: 720, height: 90, zIndex: 1,
      fontSize: 36, fontWeight: "bold", align: "center", content: (user && user.name) || "Your Name" },
    { id: "summary", x: 48, y: 160, width: 720, height: 110, zIndex: 2,
      fontSize: 13, fontWeight: "normal", align: "left", content: (doc && doc.resumeSummary) || "" },
    { id: "skills", x: 48, y: 290, width: 720, height: 50, zIndex: 3,
      fontSize: 12, fontWeight: "normal", align: "left", content: "Skills: " + skillsLine(user) },
    { id: "highlights", x: 48, y: 360, width: 720, height: 400, zIndex: 4,
      fontSize: 12, fontWeight: "normal", align: "left", content: bulletsText(doc) },
  ];
}

window.ResumePresets = { classic, twoColumn, boldHeader };
