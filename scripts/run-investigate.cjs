const path = require("path");
const jiti = require("jiti")(path.join(__dirname, ".."), {
  alias: {
    "@": path.join(__dirname, ".."),
  },
});
jiti("./scripts/investigate-commerce-pipeline.ts");
