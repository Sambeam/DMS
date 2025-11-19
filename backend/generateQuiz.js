import express from "express";
import multer from "multer";
import fs from "fs";
import OpenAI from "openai";
import pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";
import "pdfjs-dist/legacy/build/pdf.worker.js";

//router and upload direcotry//
const router = express.Router();
const upload = multer({ dest: "uploads/" });

//extracting text from pdf file//
async function extractPdfText(buffer) {
  const uint8 = new Uint8Array(buffer);
  const pdf = await pdfjsLib.getDocument({ data: uint8 }).promise;

  let text = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(" ") + "\n";
  }

  return text;
}

//new route to bring file to generateQuiz//
router.post("/generateQuiz", upload.single("file"), async (req, res) => {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  }); 
  try {
    const { numQ } = req.body;
    const filePath = req.file.path;

    const fileBuffer = fs.readFileSync(filePath);
    const pdfText = await extractPdfText(fileBuffer);
    const prompt = `
You are an educator. Generate a quiz using the given material.
====================
${pdfText}
====================
The rules are:
- the quiz must have exactly ${numQ} questions
- each question must be multiple choice with 4 options
- the difficulty must be in medium
- output must be valid JSON using this schema:

{
    "quiz_name": "",
    "questions": [
        {
            "id": 1,
            "question": "",
            "options": ["","","",""],
            "correct_answer": "(a/b/c/d)"
        }
    ]
}`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You generate quizzes in strict JSON format." },
        { role: "user", content: prompt }
      ]
    });

    const quizText = response.choices[0].message.content;
    let quizJSON;
    try{
      quizJSON = JSON.parse(quizText);
    }catch(error){
       return res.status(500).json({
        error: "Failed to parse JSON. Model output:",
        raw_output: quizText
      });
    }
    res.json({ success: true, quiz: quizJSON });

    fs.unlinkSync(filePath); 
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to generate quiz",
      details: error.message
    });
  }
});

export default router;
