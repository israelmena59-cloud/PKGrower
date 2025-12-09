
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("No API KEY");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
// The search result likely implies 'gemini-3-pro-preview' or 'gemini-3.0-pro-preview'
// Let's try the one from the search result: 'gemini-3-pro-preview'
const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

async function run() {
    try {
        console.log("Testing gemini-3-pro-preview...");
        const result = await model.generateContent("Hello, are you Gemini 3?");
        const response = await result.response;
        console.log("Success! Response:", response.text());
    } catch (error) {
        console.error("Error:", error.message);
    }
}

run();
