// Provides module declarations and business logic for main.js.

import "../src/style.scss";
import App from "./assets/scripts/app.js";

document.addEventListener("DOMContentLoaded", () => {
   const app = new App();
   app.init();
});
