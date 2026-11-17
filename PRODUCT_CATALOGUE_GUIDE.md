# TECHNOVA — Product Catalogue & Excel Seed Data Guide

This document describes the 320-product technology catalogue, Excel spreadsheet structure, and seed import routines for TECHNOVA.

---

## 1. Catalogue Overview

The catalogue includes **320 technology products** divided evenly across **8 categories** (40 products per category):

| Category Code | Category Name | Products Count | Price Range (₹) | Brands Included |
|---|---|---|---|---|
| `smartphones` | Smartphones | 40 | ₹6,999 – ₹1,59,900 | Apple, Samsung, Google, OnePlus, Xiaomi, Vivo, Realme, Motorola |
| `laptops` | Laptops | 40 | ₹24,990 – ₹3,49,900 | Apple, Dell, Lenovo, HP, Asus, Acer, MSI, Razer |
| `tablets` | Tablets | 40 | ₹9,999 – ₹1,39,900 | Apple, Samsung, Lenovo, Xiaomi, OnePlus, Microsoft |
| `audio` | Headphones & Earbuds | 40 | ₹999 – ₹44,990 | Sony, Bose, Apple, Sennheiser, JBL, boAt, Nothing, Marshall |
| `wearables` | Smartwatches & Fitness | 40 | ₹1,499 – ₹89,900 | Apple, Samsung, Garmin, Fitbit, Amazfit, Noise, Fire-Boltt |
| `cameras` | Cameras & Photography | 40 | ₹5,999 – ₹3,89,900 | Sony, Canon, Nikon, Fujifilm, Panasonic, GoPro, DJI, Insta360 |
| `accessories` | Computer Accessories | 40 | ₹499 – ₹24,999 | Logitech, Razer, Corsair, Keychron, Anker, SanDisk, Seagate |
| `gaming` | Gaming Consoles & Gear | 40 | ₹1,299 – ₹64,990 | Sony PS5, Microsoft Xbox, Nintendo, SteelSeries, HyperX, ASUS ROG |

---

## 2. Seed Data Files

In `backend/seeds/`:
- `products_catalogue.xlsx`: Complete Microsoft Excel workbook with formatted columns for bulk edits or business administration.
- `products_catalogue.csv`: Standard comma-separated values file for database imports.
- `products_catalogue.json`: High-speed JSON cache loaded automatically by the backend server for sub-millisecond retrieval and offline fallback.
- `importProducts.js`: Automated Node.js import script to parse Excel or CSV and sync with MongoDB and PostgreSQL.

---

## 3. Excel Spreadsheet Columns

Each product in `products_catalogue.xlsx` contains the following schema:

1. `product_id` (Unique SKU, e.g. `TECH-SP-001`)
2. `name` (Full product title)
3. `category_slug` (Matching category identifier)
4. `category_name` (Human-readable category)
5. `brand` (Manufacturer)
6. `price` (Regular retail price in INR)
7. `discount_price` (Sale price in INR)
8. `stock_quantity` (Initial inventory level)
9. `rating` (Customer rating out of 5.0)
10. `reviews_count` (Number of verified reviews)
11. `image_url` (High quality product imagery)
12. `featured` (Boolean flag for homepage showcases)
13. `in_stock` (Boolean stock flag)
14. `description` (Detailed marketing overview)
15. `specifications` (Structured JSON specifications: processor, RAM, battery, warranty, etc.)

---

## 4. How to Import the Catalogue

To import the Excel spreadsheet directly into live MongoDB and PostgreSQL instances:

```bash
cd backend
node seeds/importProducts.js
```

Or run the specific seeders:
```bash
# Seed MongoDB catalog
node seeds/seedMongo.js

# Seed PostgreSQL inventory & relational entities
node seeds/seedPostgres.js
```
