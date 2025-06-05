/**
 * Chuyển đổi cấu trúc YAML flat thành object tree với quan hệ parent-child
 * @param {Array} flatData - Mảng các object từ YAML
 * @returns {Object} Object tree với cấu trúc phân cấp
 */
function convertToObjectTree(flatData) {
  // Tạo map để tra cứu nhanh theo id
  const itemMap = new Map();

  // Khởi tạo map với tất cả items
  flatData.forEach((item) => {
    itemMap.set(item.id, {
      ...item,
      children: [],
    });
  });

  // Xây dựng cấu trúc tree
  const rootItems = [];

  flatData.forEach((item) => {
    const currentItem = itemMap.get(item.id);

    if (item.children && item.children.length > 0) {
      // Thêm children vào current item
      item.children.forEach((childId) => {
        const childItem = itemMap.get(childId);
        if (childItem) {
          currentItem.children.push(childItem);
        }
      });
    }

    // Kiểm tra xem item này có phải là root không
    const isRoot = !flatData.some(
      (otherItem) => otherItem.children && otherItem.children.includes(item.id)
    );

    if (isRoot) {
      rootItems.push(currentItem);
    }
  });

  return {
    items: rootItems,
    totalItems: flatData.length,
    itemMap: Object.fromEntries(itemMap),
  };
}

/**
 * Tìm kiếm item theo id trong tree
 * @param {Object} tree - Object tree
 * @param {string} id - ID cần tìm
 * @returns {Object|null} Item tìm được hoặc null
 */
function findItemById(tree, id) {
  return tree.itemMap[id] || null;
}

/**
 * Tìm tất cả items theo tên (case-insensitive)
 * @param {Object} tree - Object tree
 * @param {string} name - Tên cần tìm
 * @returns {Array} Mảng các items tìm được
 */
function findItemsByName(tree, name) {
  const searchName = name.toLowerCase();
  return Object.values(tree.itemMap).filter((item) =>
    item.name.toLowerCase().includes(searchName)
  );
}

/**
 * Lấy đường dẫn từ root đến item
 * @param {Object} tree - Object tree
 * @param {string} itemId - ID của item
 * @returns {Array} Mảng các item từ root đến target item
 */
function getPathToItem(tree, itemId) {
  const path = [];

  function findPath(items, targetId, currentPath) {
    for (const item of items) {
      const newPath = [...currentPath, item];

      if (item.id === targetId) {
        return newPath;
      }

      if (item.children && item.children.length > 0) {
        const result = findPath(item.children, targetId, newPath);
        if (result) {
          return result;
        }
      }
    }
    return null;
  }

  return findPath(tree.items, itemId, []) || [];
}

/**
 * Lấy tất cả descendants của một item
 * @param {Object} item - Item cần lấy descendants
 * @returns {Array} Mảng tất cả descendants
 */
function getAllDescendants(item) {
  const descendants = [];

  function collectDescendants(currentItem) {
    if (currentItem.children && currentItem.children.length > 0) {
      currentItem.children.forEach((child) => {
        descendants.push(child);
        collectDescendants(child);
      });
    }
  }

  collectDescendants(item);
  return descendants;
}

/**
 * Đếm số lượng items theo level
 * @param {Object} tree - Object tree
 * @returns {Object} Object với key là level, value là số lượng
 */
function countItemsByLevel(tree) {
  const levelCounts = {};

  function countLevel(items, level) {
    if (!levelCounts[level]) {
      levelCounts[level] = 0;
    }
    levelCounts[level] += items.length;

    items.forEach((item) => {
      if (item.children && item.children.length > 0) {
        countLevel(item.children, level + 1);
      }
    });
  }

  countLevel(tree.items, 0);
  return levelCounts;
}

/**
 * Đếm số lượng children ở tất cả các level
 * @param {Object} item - Item cần đếm
 * @returns {Object} Object chứa số lượng children ở mỗi level
 */
function countChildrenAtAllLevels(item) {
  const levelCounts = {};

  function countLevel(currentItem, level) {
    if (!levelCounts[level]) {
      levelCounts[level] = 0;
    }

    if (currentItem.children && currentItem.children.length > 0) {
      levelCounts[level] += currentItem.children.length;
      currentItem.children.forEach((child) => countLevel(child, level + 1));
    }
  }

  countLevel(item, 1);
  return levelCounts;
}

// Import fs module cho Node.js
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse YAML content thành JavaScript object
 * @param {string} yamlContent - Nội dung YAML
 * @returns {Array} Mảng các object
 */
function parseYamlContent(yamlContent) {
  const lines = yamlContent.split("\n");
  const items = [];
  let currentItem = null;
  let currentArray = null;
  let arrayType = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#") || trimmed === "---") continue;

    // New item starts with "- id:"
    if (trimmed.startsWith("- id:")) {
      // Save previous item if exists
      if (currentItem) {
        items.push(currentItem);
      }

      // Start new item
      currentItem = {
        id: trimmed.split("- id:")[1].trim(),
        children: [],
        attributes: [],
      };
      currentArray = null;
      arrayType = null;
    }
    // Name field
    else if (trimmed.startsWith("name:")) {
      if (currentItem) {
        currentItem.name = trimmed.split("name:")[1].trim();
      }
    }
    // Children array start
    else if (trimmed === "children:") {
      arrayType = "children";
      currentArray = currentItem ? currentItem.children : null;
    }
    // Attributes array start
    else if (trimmed === "attributes:") {
      arrayType = "attributes";
      currentArray = currentItem ? currentItem.attributes : null;
    }
    // Array items
    else if (trimmed.startsWith("- ") && currentArray && arrayType) {
      const value = trimmed.substring(2).trim();
      currentArray.push(value);
    }
  }

  // Don't forget the last item
  if (currentItem) {
    items.push(currentItem);
  }

  return items;
}

/**
 * Đọc và parse file YAML cho Node.js
 * @param {string} filePath - Đường dẫn file YAML
 * @returns {Promise<Object>} Promise trả về object tree
 */
async function loadYamlFile(filePath) {
  try {
    // Kiểm tra file có tồn tại không
    const resolvedPath = path.resolve(filePath);

    // Đọc file
    const fileContent = await fs.readFile(resolvedPath, "utf8");

    // Parse YAML content
    const yamlData = parseYamlContent(fileContent);

    // Chuyển đổi thành tree structure
    const tree = convertToObjectTree(yamlData);

    console.log(
      `✅ Đã load thành công ${yamlData.length} items từ file ${filePath}`
    );
    return tree;
  } catch (error) {
    if (error.code === "ENOENT") {
      console.error(`❌ Không tìm thấy file: ${filePath}`);
    } else {
      console.error(`❌ Lỗi khi đọc file ${filePath}:`, error.message);
    }
    throw error;
  }
}

/**
 * Phiên bản đồng bộ để đọc file (nếu cần)
 * @param {string} filePath - Đường dẫn file YAML
 * @returns {Object} Object tree
 */
function loadYamlFileSync(filePath) {
  try {
    const resolvedPath = path.resolve(filePath);
    const fileContent = require("fs").readFileSync(resolvedPath, "utf8");
    const yamlData = parseYamlContent(fileContent);
    const tree = convertToObjectTree(yamlData);

    console.log(
      `✅ Đã load thành công ${yamlData.length} items từ file ${filePath}`
    );
    return tree;
  } catch (error) {
    if (error.code === "ENOENT") {
      console.error(`❌ Không tìm thấy file: ${filePath}`);
    } else {
      console.error(`❌ Lỗi khi đọc file ${filePath}:`, error.message);
    }
    throw error;
  }
}

/**
 * Log ra các item ở level 1 và số lượng children ở tất cả các level
 * @param {Object} tree - Object tree
 */
function logLevel1Items(tree) {
  console.log("\n📋 Level 1 Items và Children Count:");
  tree.items.forEach((item, index) => {
    console.log(`\n${index + 1}. ${item.name} (ID: ${item.id})`);
    const levelCounts = countChildrenAtAllLevels(item);

    if (Object.keys(levelCounts).length > 0) {
      console.log("   Children count by level:");
      Object.entries(levelCounts).forEach(([level, count]) => {
        console.log(`   Level ${level}: ${count} items`);
      });
    } else {
      console.log("   No children");
    }
  });
}

// Example usage cho Node.js
async function demonstrateUsage() {
  try {
    // Thử các đường dẫn có thể có
    const possiblePaths = ["all_categories.yml"];

    let tree = null;
    let usedPath = "";

    for (const filePath of possiblePaths) {
      try {
        tree = await loadYamlFile(filePath);
        usedPath = filePath;
        break;
      } catch (error) {
        // Thử path tiếp theo
        continue;
      }
    }

    if (!tree) {
      console.error(
        "❌ Không thể tìm thấy file YAML. Vui lòng đảm bảo file aa_apparel_accessories.yml tồn tại."
      );
      return;
    }

    console.log(`📁 Đã đọc từ: ${usedPath}`);
    console.log("📊 Thống kê cơ bản:");
    console.log(`- Tổng số items: ${tree.totalItems}`);
    console.log(`- Số root items: ${tree.items.length}`);
    console.log(`- Phân bố theo level:`, countItemsByLevel(tree));

    // Log level 1 items và children
    logLevel1Items(tree);

    return tree;
  } catch (error) {
    console.error("Lỗi trong demonstration:", error.message);
  }
}

// Export các functions
export {
  convertToObjectTree,
  findItemById,
  findItemsByName,
  getPathToItem,
  getAllDescendants,
  countItemsByLevel,
  parseYamlContent,
  loadYamlFile,
  loadYamlFileSync,
  demonstrateUsage,
};

// Run if executed directly
if (import.meta.url === import.meta.main) {
  demonstrateUsage().catch(console.error);
}
