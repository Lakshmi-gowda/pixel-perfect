export const arteryDescriptions = {
  LAD: "LAD (left anterior descending) supplies the front of the heart.",
  LCX: "LCX (left circumflex) supplies the side and back of the heart.",
  RCA: "RCA (right coronary artery) supplies the right side and bottom of the heart.",
};
export const learnTopics = [
  { id: "heart", title: "How the heart works", text: "The heart is a muscle that pumps blood to the whole body. Like any muscle, it needs its own blood supply." },
  { id: "coronary", title: "Coronary arteries", text: "These arteries wrap the heart and deliver blood to the heart muscle. The three main ones in this app are LAD, LCX and RCA." },
  { id: "arteries", title: "Meet the three arteries", text: Object.values(arteryDescriptions).join(" ") },
  { id: "stenosis", title: "What is stenosis?", text: "Stenosis means narrowing of an artery, typically caused by plaque buildup." },
  { id: "cad", title: "What is CAD?", text: "CAD means coronary artery disease. In this project's dataset, CAD is associated with at least 50% narrowing in one or more major coronary vessels." },
  { id: "inputs", title: "What the app looks at", text: "The trained model uses 52 inputs, including Age, BP, PR, LDL, HDL, ECG-related inputs and EF-TTE. The exact saved names and categories appear in the assessment. Numeric units, clinical ranges and some encoded meanings remain unconfirmed. It does not see inside the arteries." },
  { id: "colours", title: "What the colours mean", text: "The current trained model predicts overall CAD versus Normal only. It does not supply individual artery probabilities, so arteries remain neutral and no artery risk bands are applied. Coloured risk overlays belong to the explicitly labelled mock preview, not the trained overall model." },
];