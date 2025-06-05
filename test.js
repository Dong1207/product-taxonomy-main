// test.js - Test cases và usage examples
import dotenv from "dotenv";
import { ProductClassifier } from "./productClassifier.js";

async function runTests() {
  console.log("🧪 Product Classifier Tests\n");

  const classifier = new ProductClassifier(process.env.OPENAI_API_KEY);
  await classifier.loadTaxonomy();

  // Test Case 1: Leather Jacket
  console.log("🧥 Test 1: Leather Jacket");
  const result1 = await classifier.classify({
    title: "Herren Vintage Lederjacke",
    description:
      "Echte Leder-Motorradjacke mit klassischem Design und Metallreißverschlüssen.",
    tags: ["biker", "klassisch", "qualität"],
  });

  console.log(`✅ Result: ${result1.category_id} - ${result1.category_name}`);
  console.log(`📊 Confidence: ${(result1.confidence * 100).toFixed(1)}%`);
  console.log(`🏷️ Attributes:`, result1.attributes);
  console.log(`💭 Reasoning: ${result1.reasoning}\n`);

  // Test Case 2: Smartphone
  console.log("📱 Test 2: Smartphone");
  const result2 = await classifier.classify({
    title: "iPhone 15 Pro Max",
    description:
      "Latest Apple smartphone with titanium design, 48MP camera, and A17 Pro chip",
    tags: ["smartphone", "apple", "premium", "5g"],
  });

  console.log(`✅ Result: ${result2.category_id} - ${result2.category_name}`);
  console.log(`📊 Confidence: ${(result2.confidence * 100).toFixed(1)}%`);
  console.log(`🏷️ Attributes:`, result2.attributes);
  console.log(`💭 Reasoning: ${result2.reasoning}\n`);

  // Test Case 3: Running Shoes
  console.log("👟 Test 3: Running Shoes");
  const result3 = await classifier.classify({
    title: "Nike Air Zoom Pegasus 40",
    description:
      "Men's running shoes with responsive foam and breathable mesh upper",
    tags: ["running", "athletic", "nike", "men", "breathable"],
  });

  console.log(`✅ Result: ${result3.category_id} - ${result3.category_name}`);
  console.log(`📊 Confidence: ${(result3.confidence * 100).toFixed(1)}%`);
  console.log(`🏷️ Attributes:`, result3.attributes);
  console.log(`💭 Reasoning: ${result3.reasoning}\n`);

  // Test Case 4: Gaming Laptop
  console.log("💻 Test 4: Gaming Laptop");
  const result4 = await classifier.classify({
    title: "ASUS ROG Strix Gaming Laptop",
    description:
      "High-performance gaming laptop with RTX 4070, 16GB RAM, 1TB SSD",
    tags: ["gaming", "laptop", "rtx", "high-performance"],
  });

  console.log(`✅ Result: ${result4.category_id} - ${result4.category_name}`);
  console.log(`📊 Confidence: ${(result4.confidence * 100).toFixed(1)}%`);
  console.log(`🏷️ Attributes:`, result4.attributes);
  console.log(`💭 Reasoning: ${result4.reasoning}\n`);

  // Test Case 5: Coffee
  console.log("☕ Test 5: Coffee");
  const result5 = await classifier.classify({
    title: "Ethiopian Single Origin Coffee Beans",
    description:
      "Premium arabica coffee beans from Ethiopia, medium roast, fruity notes",
    tags: ["coffee", "ethiopian", "arabica", "premium", "medium-roast"],
  });

  console.log(`✅ Result: ${result5.category_id} - ${result5.category_name}`);
  console.log(`📊 Confidence: ${(result5.confidence * 100).toFixed(1)}%`);
  console.log(`🏷️ Attributes:`, result5.attributes);
  console.log(`💭 Reasoning: ${result5.reasoning}\n`);

  // Batch test
  console.log("📦 Batch Test");
  const batchProducts = [
    {
      title: "Samsung Galaxy Watch 6",
      description: "Smartwatch with health monitoring",
      tags: ["smartwatch", "health", "samsung"],
    },
    {
      title: "Yoga Mat",
      description: "Non-slip exercise mat for yoga and fitness",
      tags: ["yoga", "fitness", "exercise", "mat"],
    },
    {
      title: "PlayStation 5 Controller",
      description: "Wireless gaming controller with haptic feedback",
      tags: ["gaming", "controller", "playstation", "wireless"],
    },
  ];

  const batchResults = await classifier.classifyBatch(batchProducts);

  batchResults.forEach((result, index) => {
    console.log(`${index + 1}. ${batchProducts[index].title}`);
    if (result.success) {
      console.log(
        `   ✅ ${result.category_id} - ${result.category_name} (${(
          result.confidence * 100
        ).toFixed(1)}%)`
      );
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }
  });
}

// Simple usage example
async function simpleUsage() {
  console.log("🚀 Simple Usage Example\n");

  // 1. Initialize
  const classifier = new ProductClassifier("your-openai-api-key");

  // 2. Load taxonomy
  await classifier.loadTaxonomy("all_categories.yml");

  // 3. Classify a product
  const result = await classifier.classify({
    title: "MacBook Pro 16-inch",
    description: "Apple laptop with M3 Pro chip",
    tags: ["laptop", "apple", "professional"],
  });

  // 4. Use the result
  if (result.success) {
    console.log(`Category: ${result.category_name}`);
    console.log(`ID: ${result.category_id}`);
    console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`Attributes:`, result.attributes);
  } else {
    console.log(`Error: ${result.error}`);
  }
}

// Performance test
async function performanceTest() {
  console.log("⏱️ Performance Test\n");

  const classifier = new ProductClassifier(process.env.OPENAI_API_KEY);
  await classifier.loadTaxonomy();

  const testProducts = [
    {title: "Nike Shoes", description: "Athletic footwear", tags: ["sports"]},
    {title: "Samsung TV", description: "4K Smart TV", tags: ["electronics"]},
    {title: "Coffee Mug", description: "Ceramic mug", tags: ["kitchen"]},
    {
      title: "Gaming Chair",
      description: "Ergonomic gaming chair",
      tags: ["furniture"],
    },
    {
      title: "iPhone Case",
      description: "Protective phone case",
      tags: ["accessories"],
    },
  ];

  console.log(`Testing with ${testProducts.length} products...`);

  const startTime = Date.now();
  const results = await classifier.classifyBatch(testProducts);
  const endTime = Date.now();

  const successful = results.filter((r) => r.success).length;
  const avgTime = (endTime - startTime) / testProducts.length;

  console.log(`📊 Results:`);
  console.log(`   ✅ Successful: ${successful}/${testProducts.length}`);
  console.log(`   ⏱️ Average time: ${avgTime.toFixed(0)}ms per product`);
  console.log(
    `   🎯 Success rate: ${((successful / testProducts.length) * 100).toFixed(
      1
    )}%`
  );
}

// Error handling test
async function errorTest() {
  console.log("❌ Error Handling Test\n");

  const classifier = new ProductClassifier(process.env.OPENAI_API_KEY);
  await classifier.loadTaxonomy();

  // Test with empty product
  const result1 = await classifier.classify({});
  console.log(
    "Empty product:",
    result1.success ? "Should fail" : `✅ Correctly failed: ${result1.error}`
  );

  // Test with only tags
  const result2 = await classifier.classify({
    tags: ["test", "example"],
  });
  console.log(
    "Only tags:",
    result2.success ? "Should fail" : `✅ Correctly failed: ${result2.error}`
  );

  // Test with minimal data
  const result3 = await classifier.classify({
    title: "Test Product",
  });
  console.log(
    "Minimal data:",
    result3.success ? "✅ Handled gracefully" : `❌ Failed: ${result3.error}`
  );
}

// Export test functions
export {
  runTests,
  simpleUsage,
  performanceTest,
  errorTest,
};

// Run tests if executed directly
if (import.meta.url === import.meta.main) {
  console.log("Choose test to run:");
  console.log("1. Full test suite");
  console.log("2. Simple usage");
  console.log("3. Performance test");
  console.log("4. Error handling test");

  const testType = process.argv[2] || "1";

  switch (testType) {
    case "1":
      runTests().catch(console.error);
      break;
    case "2":
      simpleUsage().catch(console.error);
      break;
    case "3":
      performanceTest().catch(console.error);
      break;
    case "4":
      errorTest().catch(console.error);
      break;
    default:
      console.log("Invalid option. Running full test suite...");
      runTests().catch(console.error);
  }
}
