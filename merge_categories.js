const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const categoriesDir = path.join(__dirname, "data/categories");
const outputFile = path.join(__dirname, "all_categories.yml");

let merged = [];

fs.readdirSync(categoriesDir).forEach((file) => {
  if (file.endsWith(".yml")) {
    const filePath = path.join(categoriesDir, file);
    const content = fs.readFileSync(filePath, "utf8");
    const data = yaml.load(content);

    // Nếu file là mảng, nối vào mảng lớn; nếu là object, đẩy vào mảng lớn
    if (Array.isArray(data)) {
      merged = merged.concat(data);
    } else if (typeof data === "object" && data !== null) {
      merged.push(data);
    }
  }
});

fs.writeFileSync(outputFile, yaml.dump(merged), "utf8");
console.log("Đã gộp xong vào all_categories.yml");
