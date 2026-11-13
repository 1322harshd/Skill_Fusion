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

// Prefers the grouped shape (resumeSkillGroups/resumeProjects); falls back to
// the flat skills/bullets shape for documents generated before those existed.
function skillsBlockText(doc, user) {
  const groups = doc && doc.resumeSkillGroups;
  if (groups && groups.length) {
    return "TECHNICAL SKILLS\n" + groups.map((g) => g.category + ": " + g.skills.join(" · ")).join("\n");
  }
  return "SKILLS\n" + skillsLine(user);
}

function projectsBlockText(doc) {
  const projects = doc && doc.resumeProjects;
  if (projects && projects.length) {
    const body = projects
      .map((p) => {
        const header = p.title + (p.techStack ? " — " + p.techStack : "");
        return header + "\n" + (p.bullets || []).map((b) => "• " + b).join("\n");
      })
      .join("\n\n");
    return "PROJECTS\n" + body;
  }
  return "HIGHLIGHTS\n" + bulletsText(doc);
}

function classic(doc, user) {
  return [
    { id: "name", x: 48, y: 48, width: 720, height: 44, zIndex: 1,
      fontSize: 26, fontWeight: "bold", align: "left", content: (user && user.name) || "Your Name" },
    { id: "summary", x: 48, y: 110, width: 720, height: 110, zIndex: 2,
      fontSize: 12, fontWeight: "normal", align: "left", content: "SUMMARY\n" + ((doc && doc.resumeSummary) || "") },
    { id: "skills", x: 48, y: 240, width: 720, height: 60, zIndex: 3,
      fontSize: 12, fontWeight: "normal", align: "left", content: skillsBlockText(doc, user) },
    { id: "highlights", x: 48, y: 320, width: 720, height: 400, zIndex: 4,
      fontSize: 12, fontWeight: "normal", align: "left", content: projectsBlockText(doc) },
  ];
}

function twoColumn(doc, user) {
  return [
    { id: "name", x: 48, y: 48, width: 220, height: 80, zIndex: 1,
      fontSize: 22, fontWeight: "bold", align: "left", content: (user && user.name) || "Your Name" },
    { id: "skills", x: 48, y: 140, width: 220, height: 400, zIndex: 2,
      fontSize: 11, fontWeight: "normal", align: "left", content: skillsBlockText(doc, user) },
    { id: "summary", x: 300, y: 48, width: 468, height: 150, zIndex: 3,
      fontSize: 12, fontWeight: "normal", align: "left", content: "SUMMARY\n" + ((doc && doc.resumeSummary) || "") },
    { id: "highlights", x: 300, y: 220, width: 468, height: 400, zIndex: 4,
      fontSize: 12, fontWeight: "normal", align: "left", content: projectsBlockText(doc) },
  ];
}

function boldHeader(doc, user) {
  return [
    { id: "name", x: 48, y: 48, width: 720, height: 90, zIndex: 1,
      fontSize: 36, fontWeight: "bold", align: "center", content: (user && user.name) || "Your Name" },
    { id: "summary", x: 48, y: 160, width: 720, height: 110, zIndex: 2,
      fontSize: 13, fontWeight: "normal", align: "left", content: (doc && doc.resumeSummary) || "" },
    { id: "skills", x: 48, y: 290, width: 720, height: 50, zIndex: 3,
      fontSize: 12, fontWeight: "normal", align: "left", content: skillsBlockText(doc, user) },
    { id: "highlights", x: 48, y: 360, width: 720, height: 400, zIndex: 4,
      fontSize: 12, fontWeight: "normal", align: "left", content: projectsBlockText(doc) },
  ];
}

window.ResumePresets = { classic, twoColumn, boldHeader };
