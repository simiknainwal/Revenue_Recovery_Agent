function extractPromiseDate(message) {
    const text = message.toLowerCase();

    const days = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday"
    ];

    // Handle tomorrow / kal
    if (text.includes("tomorrow") || text.includes("kal")) {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        return date;
    }

    // Handle weekday names
    for (let i = 0; i < days.length; i++) {

        if (text.includes(days[i])) {

            const today = new Date();

            const currentDay = today.getDay();
            const targetDay = i;

            let daysUntil = (targetDay - currentDay + 7) % 7;

            // If today itself is the mentioned day,
            // assume the customer means next week.
            if (daysUntil === 0) {
                daysUntil = 7;
            }

            const promisedDate = new Date(today);
            promisedDate.setDate(today.getDate() + daysUntil);

            return promisedDate;
        }
    }

    return null;
}

module.exports = { extractPromiseDate };