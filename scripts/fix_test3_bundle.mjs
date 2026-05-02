import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const JSON_PATH = path.join(ROOT, "backend", "mock", "thptqg_fulltest.json");

const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
const test = data.tests.find((item) => item.id === "thptqg-simulation-test-3");

if (!test) {
  throw new Error("Missing thptqg-simulation-test-3");
}

const part3Group = test.parts
  .find((part) => part.id === "part-3")
  ?.groups.find((group) => group.id === "part-3-group-5");
const part3IntroGroup = test.parts
  .find((part) => part.id === "part-3")
  ?.groups.find((group) => group.id === "part-3-group-4");

if (part3IntroGroup) {
  part3IntroGroup.title = "Vocational Education Passage (continued)";
  part3IntroGroup.instruction = "Complete the passage by choosing the option that best fits each of blanks 21 and 22.";
}

if (!part3Group) {
  throw new Error("Missing part-3-group-5");
}

part3Group.title = "AI Robots in Surgery";
part3Group.context = [
  "Artificial intelligence (AI) and robotics are revolutionizing medicine, especially in areas like disease diagnosis and surgical procedures. Robotic surgical systems, like the da Vinci Surgical System, assist human surgeons in performing minimally invasive surgeries, offering precision and efficiency. While AI-powered robots can process vast amounts of data and learn from previous surgeries, the key question is whether they can fully replace human surgeons.",
  "AI's potential lies in its ability to navigate surgeries with remarkable precision, reducing human error, fatigue, and emotional influence, which results in quicker recovery and improved patient outcomes. AI-powered robots can also help address the shortage of experienced surgeons and improve healthcare availability. Although implementing robotic systems is costly, their long-term benefits, including fewer surgeries and reduced healthcare costs, may ultimately make them more cost-effective.",
  "However, significant challenges remain. One of the main concerns is the human element in surgery. Patients rely on their surgeons for empathy, clear communication, and comfort, which AI robots currently cannot provide. There are also legal questions surrounding responsibility in case of complications during surgery- whether it should fall on the surgeon, AI developers, or the hospital. Additionally, AI systems depend on high-quality, unbiased data to make accurate decisions. If the data used for training is [[u]]flawed[[/u]], it could lead to safety risks. There are also concerns about cybersecurity, as AI-powered robots connected to networks could be vulnerable to cyber-attacks. Moreover, the high upfront costs of robotic systems may limit their availability to certain medical facilities, deepening healthcare disparities.",
  "[[u]]Despite these challenges, many experts believe AI and robotics will complement rather than replace surgeons. AI can assist by providing guidance during surgeries, performing repetitive tasks, and improving accuracy, allowing human surgeons to focus on more complex aspects. The future of surgery may involve a collaborative approach, where AI and human surgeons work together, combining AI's precision with human empathy and judgment. Balancing the benefits of AI with the ethical and emotional complexities it presents will be crucial in shaping the future of healthcare.[[/u]]",
];

const q21 = test.questions.find((question) => question.number === 21);
const q22 = test.questions.find((question) => question.number === 22);
const q23 = test.questions.find((question) => question.number === 23);
const q24 = test.questions.find((question) => question.number === 24);
const q25 = test.questions.find((question) => question.number === 25);
const q28 = test.questions.find((question) => question.number === 28);
const q30 = test.questions.find((question) => question.number === 30);

if (q21) {
  q21.prompt = "Question 21. Choose the option that best fits blank (21).";
}
if (q22) {
  q22.prompt = "Question 22. Choose the option that best fits blank (22).";
}
if (q23) {
  q23.prompt = 'Question 23. The word "they" in paragraph 1 refers to _.';
}
if (q24) {
  q24.prompt = 'Question 24. The word "address" in paragraph 2 is CLOSEST in meaning to _.';
}
if (q25) {
  q25.prompt = 'Question 25. The word "flawed" in paragraph 3 is OPPOSITE in meaning to _.';
}
if (q28) {
  q28.prompt = "Question 28. Which of the following best paraphrases the underlined sentence in paragraph 4?";
}
if (q30) {
  q30.prompt = "Question 30. In which paragraph does the writer explore the potential for collaboration between AI and human surgeons, highlighting the complementary roles they could play in the future of surgery?";
  q30.options = ["Paragraph 1", "Paragraph 2", "Paragraph 3", "Paragraph 4"];
  q30.correctIndex = 3;
}

const part4Group = test.parts
  .find((part) => part.id === "part-4")
  ?.groups.find((group) => group.id === "part-4-group-5");

if (!part4Group) {
  throw new Error("Missing part-4-group-5");
}

part4Group.title = "Green Tourism In Vietnam";
part4Group.instruction = "Read the passage about green and sustainable tourism and mark the letter A, B, C, or D to indicate the correct answer to each of the questions from 31 to 40.";
part4Group.context = [
  "[[u]]Vietnam's tourism sector has seen significant growth in recent years, with increasing numbers of both international and domestic visitors. However, this growth has put pressure on the environment and cultural heritage, particularly in rapidly developing tourist destinations. To address these challenges, the country is shifting towards green tourism, emphasizing sustainability and responsibility towards nature and local communities.[[/u]]",
  "Studies show that many tourists are increasingly conscious of their environmental impact. A 2020 European Commission report found that 82% of EU citizens were willing to adjust their habits to ensure sustainable tourism, such as reducing waste, paying extra to protect the environment, and supporting local communities. Similarly, a survey by Vietnam's National Administration of Tourism (VNAT) revealed that 76% of international tourists were ready to reduce waste, 62% would buy local products, and 45% preferred eco-friendly travel options like low-impact vehicles and off-peak season visits.",
  "In Vietnam, the trend towards green tourism is gaining traction, with more tourists seeking outdoor activities that allow them to enjoy nature while minimizing their impact. The COVID-19 pandemic has further motivated domestic tourists to adopt more sustainable travel behaviors, with 88% of them embracing green tourism practices, according to Booking.com.",
  "(I) Several Vietnamese destinations have pioneered green tourism initiatives. (II) For example, Hoi An has promoted \"no plastic waste\" hotels and aims to reduce plastic waste by 13-15% annually, targeting zero plastic by 2025. (III) Additionally, green tours such as garbage collection boat tours in Hoi An, cave exploration in Phong Nha-Ke Bang, and turtle watching tours in Con Dao are attracting tourists. (IV) Vietnam's government supports this shift towards sustainability through its National Action Plan on Green Growth (2021-2030) and tourism strategies emphasizing eco-tourism, community-based tourism, and the use of clean energy.",
  "Experts suggest that investment in green tourism technologies, promotion of eco-friendly products, and public awareness campaigns are essential to furthering the sustainable tourism agenda. Ultimately, green tourism in Vietnam aims to create [[u]]immersive[[/u]] experiences that benefit both tourists and local communities while preserving the environment for future generations.",
];

fs.writeFileSync(JSON_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log("Fixed test 3 bundle.");
