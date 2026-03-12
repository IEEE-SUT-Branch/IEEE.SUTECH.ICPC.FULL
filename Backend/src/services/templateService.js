// src/services/templateService.js
const fs = require("fs");
const path = require("path");
const Handlebars = require("handlebars");

// Register helpers
Handlebars.registerHelper("currentYear", () => new Date().getFullYear());

const templateCache = new Map();

const render = (templateName, context) => {
  if (!templateCache.has(templateName)) {
    const filePath = path.join(
      __dirname,
      "../templates",
      `${templateName}.hbs`
    );

    if (!fs.existsSync(filePath)) {
      throw new Error(`Template not found: ${templateName}`);
    }

    const source = fs.readFileSync(filePath, "utf8");
    templateCache.set(templateName, Handlebars.compile(source));
  }

  return templateCache.get(templateName)(context);
};

module.exports = { render };
