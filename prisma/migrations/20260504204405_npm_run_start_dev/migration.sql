-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "subtotal" REAL NOT NULL,
    "fulfillmentMethod" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "deliveryAddress" TEXT,
    "pickupLocation" TEXT,
    "contactPhone" TEXT,
    "notes" TEXT,
    "cardholderName" TEXT,
    "cardLast4" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("cardLast4", "cardholderName", "contactPhone", "createdAt", "deliveryAddress", "fulfillmentMethod", "id", "notes", "paymentMethod", "pickupLocation", "status", "subtotal", "updatedAt", "userId") SELECT "cardLast4", "cardholderName", "contactPhone", "createdAt", "deliveryAddress", "fulfillmentMethod", "id", "notes", "paymentMethod", "pickupLocation", "status", "subtotal", "updatedAt", "userId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "tags" TEXT,
    "imageUrl" TEXT,
    "price" REAL NOT NULL,
    "rating" REAL,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "inventory" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("category", "createdAt", "description", "id", "imageUrl", "inStock", "inventory", "isActive", "name", "price", "tags", "updatedAt") SELECT "category", "createdAt", "description", "id", "imageUrl", "inStock", "inventory", "isActive", "name", "price", "tags", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE INDEX "Product_name_idx" ON "Product"("name");
CREATE INDEX "Product_category_idx" ON "Product"("category");
CREATE INDEX "Product_inStock_isActive_idx" ON "Product"("inStock", "isActive");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
