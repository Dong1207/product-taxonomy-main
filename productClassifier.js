// productClassifier.js
import {OpenAI} from "openai";
import {promises as fs} from "fs";
import yaml from "js-yaml";
import dotenv from "dotenv";
import path from "path";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProductClassifier {
  constructor() {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error(
        "OpenAI API key is required. Set OPENAI_API_KEY in .env file or pass it to constructor."
      );
    }

    this.openai = new OpenAI({
      apiKey: openaiApiKey,
    });
    this.taxonomy = null;
    this.attributes = null;
    this.values = null;
    this.localizations = {
      attributes: {},
      categories: {},
      values: {},
    };
  }

  // Load taxonomy từ file YAML
  async loadTaxonomy(filePath = "data/categories") {
    try {
      // Load tất cả các file categories
      const files = await fs.readdir(filePath);
      const categoryFiles = files.filter(f => f.endsWith('.yml'));
      
      let allCategories = [];
      for (const file of categoryFiles) {
        const content = await fs.readFile(path.join(filePath, file), "utf8");
        const categories = yaml.load(content);
        allCategories = allCategories.concat(categories);
      }
      
      this.taxonomy = allCategories;
      console.log(`✅ Loaded ${this.taxonomy.length} taxonomy categories`);
      return true;
    } catch (error) {
      console.error("❌ Error loading taxonomy:", error.message);
      throw error;
    }
  }

  // Load attributes từ file attributes.yml
  async loadAttributes(filePath = "data/attributes.yml") {
    try {
      const content = await fs.readFile(filePath, "utf8");
      this.attributes = yaml.load(content);
      console.log(`✅ Loaded attributes configuration`);
      return true;
    } catch (error) {
      console.error("❌ Error loading attributes:", error.message);
      throw error;
    }
  }

  // Load values từ file values.yml
  async loadValues(filePath = "data/values.yml") {
    try {
      const content = await fs.readFile(filePath, "utf8");
      this.values = yaml.load(content);
      console.log(`✅ Loaded values configuration`);
      return true;
    } catch (error) {
      console.error("❌ Error loading values:", error.message);
      throw error;
    }
  }

  // Load localizations
  async loadLocalizations(basePath = "data/localizations") {
    try {
      // Load attributes localizations
      const attrFiles = await fs.readdir(path.join(basePath, "attributes"));
      for (const file of attrFiles) {
        if (file.endsWith('.yml')) {
          const lang = path.basename(file, '.yml');
          const content = await fs.readFile(path.join(basePath, "attributes", file), "utf8");
          this.localizations.attributes[lang] = yaml.load(content);
        }
      }

      // Load categories localizations
      const catFiles = await fs.readdir(path.join(basePath, "categories"));
      for (const file of catFiles) {
        if (file.endsWith('.yml')) {
          const lang = path.basename(file, '.yml');
          const content = await fs.readFile(path.join(basePath, "categories", file), "utf8");
          this.localizations.categories[lang] = yaml.load(content);
        }
      }

      // Load values localizations
      const valFiles = await fs.readdir(path.join(basePath, "values"));
      for (const file of valFiles) {
        if (file.endsWith('.yml')) {
          const lang = path.basename(file, '.yml');
          const content = await fs.readFile(path.join(basePath, "values", file), "utf8");
          this.localizations.values[lang] = yaml.load(content);
        }
      }

      console.log(`✅ Loaded localizations for ${Object.keys(this.localizations.attributes).length} languages`);
      return true;
    } catch (error) {
      console.error("❌ Error loading localizations:", error.message);
      throw error;
    }
  }

  // Initialize all data
  async initialize() {
    await this.loadTaxonomy();
    await this.loadAttributes();
    await this.loadValues();
    await this.loadLocalizations();
    console.log("✅ All data loaded successfully");
  }

  // Get localized category name
  getLocalizedCategoryName(categoryId, lang = 'en') {
    if (!this.localizations.categories[lang]) return null;
    return this.localizations.categories[lang][categoryId] || null;
  }

  // Get localized attribute name
  getLocalizedAttributeName(attributeId, lang = 'en') {
    if (!this.localizations.attributes[lang]) return null;
    return this.localizations.attributes[lang][attributeId] || null;
  }

  // Get localized value
  getLocalizedValue(valueId, lang = 'en') {
    if (!this.localizations.values[lang]) return null;
    return this.localizations.values[lang][valueId] || null;
  }

  // Get valid values for an attribute
  getValidValuesForAttribute(attributeId) {
    if (!this.attributes || !this.attributes[attributeId]) return [];
    return this.attributes[attributeId].values || [];
  }

  // Validate attribute value
  validateAttributeValue(attributeId, value) {
    const validValues = this.getValidValuesForAttribute(attributeId);
    if (validValues.length === 0) return true; // No validation if no valid values defined
    return validValues.includes(value);
  }

  // Core classification function
  async classify(product, lang = 'en') {
    if (!this.taxonomy) {
      throw new Error("Taxonomy not loaded. Call initialize() first.");
    }

    const {title, description, tags = []} = product;

    if (!title && !description) {
      throw new Error("Title or description is required");
    }

    try {
      console.log(`🔍 Classifying: ${title}`);

      // Step 1: Get main category
      const mainCategory = await this.getMainCategory(title, description, tags);
      console.log(`📂 Main category: ${mainCategory}`);

      // Step 2: Get detailed classification
      const detailedResult = await this.getDetailedClassification(
        title,
        description,
        tags,
        mainCategory
      );

      // Step 3: Extract attributes
      const attributes = await this.extractAttributes(
        title,
        description,
        tags,
        detailedResult.category_id
      );

      // Add localized names
      const localizedCategoryName = this.getLocalizedCategoryName(detailedResult.category_id, lang);
      const localizedAttributes = {};
      
      for (const [key, value] of Object.entries(attributes)) {
        const localizedKey = this.getLocalizedAttributeName(key, lang);
        const localizedValue = this.getLocalizedValue(value, lang);
        localizedAttributes[localizedKey || key] = localizedValue || value;
      }

      return {
        success: true,
        category_id: detailedResult.category_id,
        category_name: localizedCategoryName || detailedResult.category_name,
        category_path: detailedResult.category_path.map(item => ({
          id: item.id,
          name: this.getLocalizedCategoryName(item.id, lang) || item.name
        })),
        confidence: detailedResult.confidence,
        attributes: localizedAttributes,
        reasoning: detailedResult.reasoning,
      };
    } catch (error) {
      console.error("❌ Classification error:", error.message);
      return {
        success: false,
        error: error.message,
        category_id: null,
        category_name: null,
        confidence: 0,
      };
    }
  }

  // Step 1: Determine main category (Level 0)
  async getMainCategory(title, description, tags) {
    const mainCategories = this.getMainCategories();

    const prompt = `You are a product classification expert. Classify this product into ONE main category.

PRODUCT:
Title: ${title}
Description: ${description}  
Tags: ${tags.join(", ")}

CATEGORIES:
${mainCategories.map((cat) => `- ${cat.id}: ${cat.name}`).join("\n")}

Return ONLY the category ID (like "aa", "el", "sg" etc).`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4-0125-preview",
      messages: [{role: "user", content: prompt}],
      temperature: 0.1,
      max_tokens: 10,
    });

    return response.choices[0].message.content.trim().toLowerCase();
  }

  // Step 2: Get detailed hierarchical classification
  async getDetailedClassification(title, description, tags, mainCategoryId) {
    const categoryTree = this.buildCategoryTree(mainCategoryId);

    const prompt = `You are a taxonomy expert. Find the MOST SPECIFIC category for this product.

PRODUCT:
Title: ${title}
Description: ${description}
Tags: ${tags.join(", ")}

CATEGORY TREE:
${JSON.stringify(categoryTree, null, 2)}

INSTRUCTIONS:
1. Go as deep as possible in the hierarchy
2. Choose the most specific category that fits
3. Provide confidence score (0.0-1.0)
4. Explain your reasoning

Return JSON format:
{
    "category_id": "most-specific-id",
    "category_name": "Category Name", 
    "category_path": [
        {"id": "aa", "name": "Apparel & Accessories"},
        {"id": "aa-1", "name": "Clothing"}
    ],
    "confidence": 0.95,
    "reasoning": "explanation"
}`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4-0125-preview",
      messages: [{role: "user", content: prompt}],
      temperature: 0.2,
      max_tokens: 1000,
    });

    try {
      return JSON.parse(response.choices[0].message.content.trim());
    } catch (error) {
      throw new Error("Failed to parse classification result");
    }
  }

  // Step 3: Extract product attributes
  async extractAttributes(title, description, tags, categoryId) {
    const categoryAttributes = this.getCategoryAttributes(categoryId);

    if (categoryAttributes.length === 0) {
      return {};
    }

    const prompt = `Extract product attributes from the given information.

PRODUCT:
Title: ${title}
Description: ${description}
Tags: ${tags.join(", ")}

AVAILABLE ATTRIBUTES: ${categoryAttributes.join(", ")}

INSTRUCTIONS:
1. Extract only clearly evident attributes
2. Use standard values when possible
3. Don't guess - omit if uncertain
4. Return JSON object

Example: {"color": "black", "fabric": "leather", "target_gender": "male"}`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4-0125-preview",
      messages: [{role: "user", content: prompt}],
      temperature: 0.1,
      max_tokens: 300,
    });

    try {
      return JSON.parse(response.choices[0].message.content.trim());
    } catch (error) {
      console.warn("⚠️ Failed to parse attributes, returning empty object");
      return {};
    }
  }

  // Helper: Get main categories (level 0)
  getMainCategories() {
    return this.taxonomy.filter((item) => !item.id.includes("-"));
  }

  // Helper: Build category tree for specific main category
  buildCategoryTree(mainCategoryId, maxDepth = 4) {
    const tree = {};

    for (const item of this.taxonomy) {
      if (
        item.id === mainCategoryId ||
        item.id.startsWith(mainCategoryId + "-")
      ) {
        // Limit depth to avoid too large prompt
        const depth = item.id.split("-").length - 1;
        if (depth <= maxDepth) {
          tree[item.id] = {
            id: item.id,
            name: item.name,
            children: item.children || [],
            attributes: item.attributes || [],
          };
        }
      }
    }

    return tree;
  }

  // Helper: Get attributes for specific category
  getCategoryAttributes(categoryId) {
    const category = this.taxonomy.find((item) => item.id === categoryId);
    return category ? category.attributes || [] : [];
  }

  // Batch classification
  async classifyBatch(products, batchSize = 5) {
    const results = [];

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      console.log(
        `🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          products.length / batchSize
        )}`
      );

      const batchPromises = batch.map((product) => this.classify(product));
      const batchResults = await Promise.all(batchPromises);

      results.push(...batchResults);

      // Rate limiting delay
      if (i + batchSize < products.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}

// Export for use in other files
export {ProductClassifier};

// Run example if file is executed directly
if (import.meta.url === import.meta.main) {
  dotenv.config();
  const classifier = new ProductClassifier();
  classifier.initialize().then(() => {
    // Example usage after initialization
    classifier.classify({
      title: "Herren Vintage Lederjacke",
      description: "Echte Leder-Motorradjacke mit klassischem Design und Metallreißverschlüssen.",
      tags: ["biker", "klassisch", "qualität"],
    }, 'de').then(console.log);
  }).catch(console.error);
}
