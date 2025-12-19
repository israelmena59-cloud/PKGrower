
const calculateDays = (startDateStr: string | null, flipDateStr: string | null) => {
    const parseDate = (d: string | null) => (d ? new Date(d) : null);

    const start = parseDate(startDateStr);
    const flip = parseDate(flipDateStr);
    const now = new Date(); // Simulating "Today"

    console.log(`\n--- Test Case ---`);
    console.log(`Start: ${startDateStr}`);
    console.log(`Flip: ${flipDateStr}`);
    console.log(`Now: ${now.toISOString()}`);

    // Total Days
    const daysIntoGrow = (() => {
        if (!start) return 1;
        const diff = now.getTime() - start.getTime();
        return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
    })();

    // Veg Days
    const daysVeg = (() => {
        if (!start) return 0;
        const end = flip || now;
        const diff = end.getTime() - start.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        // If no flip, add 1 because current day is a veg day.
        // If flipped, veg stopped at flip date.
        return Math.max(0, flip ? days : days + 1);
    })();

    // Flower Days
    const daysFlower = (() => {
        if (!flip) return 0;
        const diff = now.getTime() - flip.getTime();
        return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
    })();

    console.log(`Total Days: ${daysIntoGrow}`);
    console.log(`Veg Days: ${daysVeg}`);
    console.log(`Flower Days: ${daysFlower}`);
    console.log(`Sum (Veg+Flower) vs Total: ${daysVeg + daysFlower} vs ${daysIntoGrow}`);
};

// Test 1: Just Started today
calculateDays(new Date().toISOString(), null);

// Test 2: Started 10 days ago, Still Veg
const tenDaysAgo = new Date();
tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
calculateDays(tenDaysAgo.toISOString(), null);

// Test 3: Started 20 days ago, Flipped 5 days ago
const twentyDaysAgo = new Date();
twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
const fiveDaysAgo = new Date();
fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
calculateDays(twentyDaysAgo.toISOString(), fiveDaysAgo.toISOString());
