import { loadData } from "./data.js";
import { createPlot } from "./plot.js";



async function main() {
    const combined = await loadData("STK");
    createPlot(combined);
}

main();