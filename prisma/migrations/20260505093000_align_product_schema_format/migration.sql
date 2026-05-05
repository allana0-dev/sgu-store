-- Redefine Product table to align with the frontend product schema shape.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "description" TEXT,
    "images" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "basePrice" REAL NOT NULL,
    "salePrice" REAL,
    "compareAtPrice" REAL,
    "inventoryStatus" TEXT NOT NULL DEFAULT 'in_stock',
    "inventoryLabel" TEXT NOT NULL,
    "category" TEXT,
    "department" TEXT NOT NULL,
    "tags" TEXT,
    "gender" TEXT NOT NULL,
    "dietary" TEXT,
    "variants" TEXT,
    "rating" REAL,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "inventory" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_Product" (
  "id",
  "name",
  "subtitle",
  "description",
  "images",
  "image",
  "href",
  "currency",
  "basePrice",
  "salePrice",
  "compareAtPrice",
  "inventoryStatus",
  "inventoryLabel",
  "category",
  "department",
  "tags",
  "gender",
  "dietary",
  "variants",
  "rating",
  "reviewCount",
  "inventory",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  "name",
  "name",
  COALESCE("description", ''),
  COALESCE("imageUrl", ''),
  COALESCE("imageUrl", ''),
  '/store/' || "id",
  'USD',
  "price",
  NULL,
  NULL,
  CASE
    WHEN "inStock" = 0 OR "inventory" <= 0 THEN 'out_of_stock'
    WHEN "inventory" <= 5 THEN 'low_stock'
    ELSE 'in_stock'
  END,
  CASE
    WHEN "inStock" = 0 OR "inventory" <= 0 THEN 'Out of Stock'
    WHEN "inventory" <= 5 THEN 'Only ' || "inventory" || ' left'
    ELSE 'In Stock'
  END,
  "category",
  COALESCE("category", 'General'),
  "tags",
  'unisex',
  NULL,
  NULL,
  "rating",
  "reviewCount",
  "inventory",
  "isActive",
  "createdAt",
  "updatedAt"
FROM "Product";

DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";

CREATE INDEX "Product_name_idx" ON "Product"("name");
CREATE INDEX "Product_category_idx" ON "Product"("category");
CREATE INDEX "Product_inventoryStatus_isActive_idx" ON "Product"("inventoryStatus", "isActive");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
