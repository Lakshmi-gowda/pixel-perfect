import { arteryDescriptions, learnTopics } from "./learn";
export const conditions = {
  CAD: { title: "About CAD", text: `${learnTopics[3]?.text} ${learnTopics[4]?.text} The model estimates CAD is likely. This is not a measured blockage.`, topic: "cad" },
  Normal: { title: "About this result", text: "The model predicts Normal. This does not rule out heart disease; formal diagnostic imaging and a doctor's review are still needed.", topic: "cad" },
};
export const vesselConditions = arteryDescriptions;