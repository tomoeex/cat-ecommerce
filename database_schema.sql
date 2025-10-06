CREATE DATABASE IF NOT EXISTS ree_cat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ree_cat;

-- ใช้โครงสร้างจาก ER-Diagram ที่มีอยู่แล้ว
-- เพิ่มข้อมูล sample พร้อมรูปจาก Unsplash

-- Insert Admin & Customer
INSERT INTO user (user_username, user_email, user_password, user_fullname, user_role, createdAt) VALUES
('admin', 'admin@catstore.com', '$2a$10$YourHashedPasswordHere', 'System Administrator', 'admin', NOW()),
('customer', 'customer@example.com', '$2a$10$YourHashedPasswordHere', 'John Doe', 'customer', NOW());

-- Insert Categories
INSERT INTO categories (category_name) VALUES
('Cat Food'), ('Cat Toys'), ('Cat Litter'), 
('Cat Accessories'), ('Cat Health'), ('Cat Furniture');

-- Insert Brands
INSERT INTO brands (brand_name, brand_image) VALUES
('Royal Canin', '/images/brands/royal-canin.jpg'),
('Whiskas', '/images/brands/whiskas.jpg'),
('Me-O', '/images/brands/me-o.jpg'),
('Purina', '/images/brands/purina.jpg'),
('Catit', '/images/brands/catit.jpg');

-- Insert Products with Unsplash images
INSERT INTO product (category_id, brand_id, product_name, product_detail, product_price, product_qty, product_use, product_image, product_rating, product_status, createdAt) VALUES
(1, 1, 'Royal Canin Persian Adult', 'Premium cat food for Persian cats', 899.00, 50, 0, 'https://images.unsplash.com/photo-1589883661923-6476cb0ae9f2?w=400&h=400&fit=crop', 4.5, 1, NOW()),
(1, 2, 'Whiskas Ocean Fish', 'Delicious ocean fish flavor', 299.00, 100, 0, 'https://images.unsplash.com/photo-1591462430866-4ee41e2d3aa9?w=400&h=400&fit=crop', 4.0, 1, NOW()),
(2, 5, 'Interactive Feather Wand', 'Fun toy for cats', 159.00, 60, 0, 'https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=400&h=400&fit=crop', 4.7, 1, NOW()),
(3, 4, 'Tidy Cats Litter', 'Clumping cat litter', 459.00, 40, 0, 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=400&fit=crop', 4.4, 1, NOW()),
(4, 5, 'Steel Cat Bowl', 'Durable feeding bowl', 129.00, 70, 0, 'https://images.unsplash.com/photo-1548247416-ec66f4900b2e?w=400&h=400&fit=crop', 4.5, 1, NOW()),
(5, 1, 'Hairball Control', 'Prevents hairballs', 189.00, 50, 0, 'https://images.unsplash.com/photo-1611003228941-98852ba62227?w=400&h=400&fit=crop', 4.3, 1, NOW()),
(6, 5, 'Cat Scratching Post', 'Tall sisal post', 799.00, 15, 0, 'https://images.unsplash.com/photo-1501820488136-72669149e0d4?w=400&h=400&fit=crop', 4.8, 1, NOW()),
(6, 5, 'Cat Tree 3-Level', 'Multi-level cat tree', 2499.00, 10, 0, 'https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=400&h=400&fit=crop', 4.9, 1, NOW());