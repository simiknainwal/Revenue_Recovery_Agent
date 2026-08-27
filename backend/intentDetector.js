function detectIntent(message) {

    const text = message.toLowerCase().trim();

    // 1. REFUSAL / cannot pay
    // Check these BEFORE PAY_NOW
    if (
        text.includes("nahi karunga") ||
        text.includes("nahi karungi") ||
        text.includes("don't want to pay") ||
        text.includes("not interested") ||
        text.includes("cancel")
    ) {
        return "REFUSE_TO_PAY";
    }

    // 2. PROMISE TO PAY LATER
    // Must be checked before PAY_NOW because message may contain "abhi payment"
    if (
        text.includes("kar dunga") ||
        text.includes("kar dungi") ||
        text.includes("kal kar") ||
        text.includes("kal pay") ||
        text.includes("tomorrow") ||
        text.includes("friday") ||
        text.includes("next week") ||
        text.includes("baad mein") ||
        text.includes("baad me") ||
        text.includes("later")
    ) {
        return "PROMISE_TO_PAY";
    }

    // 3. PAY NOW
    if (
        text.includes("payment link") ||
        text.includes("pay now") ||
        text.includes("abhi pay kar") ||
        text.includes("link bhej do") ||
        text.includes("payment link bhej")
    ) {
        return "PAY_NOW";
    }

    return "UNKNOWN";
}

module.exports = { detectIntent };