const Groq = require("groq-sdk");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

async function analyzeCustomerMessage(message) {

    const today = new Date().toISOString().split("T")[0];

    const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",

    messages: [
        {
            role: "system",
            content: `
You analyze customer responses for a revenue recovery system.

Customers may speak English, Hindi, or Hinglish.

Classify the intent into exactly one of:
PAY_NOW
PROMISE_TO_PAY
REFUSE_TO_PAY
UNKNOWN

Today's date is ${today}.

Return JSON with exactly:
{
  "intent": "PROMISE_TO_PAY",
  "promisedDate": "YYYY-MM-DD or null",
  "confidence": 0.95
}
`
        },
        {
            role: "user",
            content: message
        }
    ],

    response_format: {
        type: "json_object"
    },

    temperature: 0
});

    const response =
        completion.choices[0]?.message?.content;

    if (!response) {
        throw new Error("Groq returned an empty response");
    }

    return JSON.parse(response);
}

module.exports = {
    analyzeCustomerMessage
};