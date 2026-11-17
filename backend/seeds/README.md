# TECHNOVA Product Catalogue Import Guide

This guide explains how to manage, add, update, and import technology products into the TECHNOVA e-commerce platform using the Excel catalogue (`products_catalogue.xlsx`).

---

## 1. File Location & Format

- **Catalogue File**: `backend/seeds/products_catalogue.xlsx`
- **CSV Alternative**: `backend/seeds/products_catalogue.csv`
- **Importer Script**: `backend/seeds/importProducts.js`
- **Generator Script**: `backend/seeds/generateCatalogueExcel.js`

---

## 2. Columns Specification

The Excel sheet `Products` contains the following columns:

| Column Name | Type | Description | Example |
|-------------|------|-------------|---------|
| `product_id` | String | Unique SKU identifier | `TECH-SP-001` |
| `name` | String | Full product title | `iPhone 15 Pro Max` |
| `brand` | String | Manufacturer brand | `Apple` |
| `category` | String | Human readable category name | `Smartphones` |
| `category_slug` | String | Category slug matching backend route | `smartphones` |
| `price` | Number | Current selling price (in USD or INR) | `1199.99` |
| `original_price` | Number | Regular price for calculating discount | `1299.99` |
| `description` | String | Detailed product overview | `Titanium design with A17 Pro...` |
| `image_url` | String | Single URL or comma-separated image URLs | `https://images.unsplash.com/...` |
| `attributes` | JSON String | Category-specific flexible specifications | `{"ram":"8 GB","storage":"256 GB"}` |
| `rating` | Number | Star rating between 1.0 and 5.0 | `4.9` |
| `review_count` | Number | Number of customer reviews | `2840` |
| `tags` | String | Comma-separated search keywords | `smartphone, apple, 5g` |
| `stock_quantity` | Number | Initial stock count in PostgreSQL inventory | `45` |
| `is_active` | Boolean | `true` to show in store, `false` to hide | `true` |
| `is_featured` | Boolean | `true` to feature on the homepage banner | `true` |

---

## 3. Supported Categories

Ensure `category_slug` is strictly one of the 8 supported categories:

1. `smartphones` — Smartphones
2. `laptops` — Laptops
3. `tablets` — Tablets
4. `headphones-earbuds` — Headphones & Earbuds
5. `smartwatches` — Smartwatches
6. `cameras` — Cameras
7. `computer-accessories` — Computer Accessories
8. `gaming` — Gaming Products

---

## 4. How to Add New Products

1. Open `backend/seeds/products_catalogue.xlsx` in Microsoft Excel, LibreOffice Calc, or Google Sheets.
2. Scroll to the bottom of the table.
3. Add a new row with a unique `product_id` (e.g. `TECH-SP-041`), product details, and category-specific `attributes` formatted as JSON:
   ```json
   {"brand":"Apple","display":"6.7\" OLED","processor":"A17 Pro","ram":"8 GB","storage":"512 GB"}
   ```
4. Save the file.

---

## 5. How to Run the Import Script

Open your terminal or command prompt in the `backend` folder and run:

```bash
cd backend
node seeds/importProducts.js
```

### What the Importer Does:
1. **Reads** `products_catalogue.xlsx` (or fallback `.csv`).
2. **Validates** all rows for mandatory fields (`name`, `brand`, `category_slug`, `price`).
3. **Connects to MongoDB** and creates/verifies the 8 category documents in `categories`.
4. **Upserts Products** in MongoDB (`products` collection) by `product_id`. If the product already exists, its specifications and price are updated. No duplicate records are created.
5. **Synchronizes Inventory** in PostgreSQL (`inventory` table) by inserting or updating stock levels with matching product IDs.
6. **Outputs a full audit summary** reporting successful and skipped rows.

---

## 6. Regenerating the Entire 320-Product Catalogue

If you ever wish to re-generate the default clean set of 320 products with fresh specs and images:

```bash
cd backend
node seeds/generateCatalogueExcel.js
node seeds/importProducts.js
```
