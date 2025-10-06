const express = require('express');
const router = express.Router();
const db = require('../config/database');

// แสดงรายการสินค้าทั้งหมด (ตามข้อกำหนดข้อ 7)
router.get('/', async (req, res) => {
  try {
    const { category, brand, search, sort } = req.query;
    
    let query = `
      SELECT p.*, c.category_name, b.brand_name
      FROM product p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      WHERE p.product_qty > 0 AND p.product_status = 1
    `;
    
    const params = [];

    // Filter by category
    if (category) {
      query += ' AND p.category_id = ?';
      params.push(category);
    }

    // Filter by brand
    if (brand) {
      query += ' AND p.brand_id = ?';
      params.push(brand);
    }

    // Search
    if (search) {
      query += ' AND (p.product_name LIKE ? OR p.product_detail LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Sorting
    switch(sort) {
      case 'price_asc':
        query += ' ORDER BY p.product_price ASC';
        break;
      case 'price_desc':
        query += ' ORDER BY p.product_price DESC';
        break;
      case 'rating':
        query += ' ORDER BY p.product_rating DESC';
        break;
      case 'newest':
        query += ' ORDER BY p.createdAt DESC';
        break;
      default:
        query += ' ORDER BY p.product_name ASC';
    }

    const [products] = await db.query(query, params);
    
    // ดึงหมวดหมู่และแบรนด์สำหรับ filter
    const [categories] = await db.query('SELECT * FROM categories ORDER BY category_name');
    const [brands] = await db.query('SELECT * FROM brands ORDER BY brand_name');

    res.render('products', {
      title: 'Products - Cat Supplies',
      products,
      categories,
      brands,
      filters: { category, brand, search, sort }
    });
  } catch (error) {
    console.error('Products page error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { message: 'Unable to load products' }
    });
  }
});

// แสดงรายละเอียดสินค้า (ตามข้อกำหนดข้อ 8)
router.get('/:id', async (req, res) => {
  try {
    const productId = req.params.id;

    // ดึงข้อมูลสินค้า
    const [products] = await db.query(`
      SELECT p.*, c.category_name, b.brand_name
      FROM product p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      WHERE p.product_id = ?
    `, [productId]);

    if (products.length === 0) {
      return res.status(404).render('error', {
        title: 'Product Not Found',
        error: { message: 'Product not found' }
      });
    }

    const product = products[0];

    // ดึงรีวิวสินค้า
    const [reviews] = await db.query(`
      SELECT pr.*, u.user_fullname, u.user_username
      FROM product_review pr
      JOIN user u ON pr.user_id = u.user_id
      WHERE pr.product_id = ?
      ORDER BY pr.createdAt DESC
    `, [productId]);

    // ดึงสินค้าที่เกี่ยวข้อง
    const [relatedProducts] = await db.query(`
      SELECT p.*, c.category_name, b.brand_name
      FROM product p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      WHERE p.category_id = ? AND p.product_id != ? AND p.product_qty > 0
      LIMIT 4
    `, [product.category_id, productId]);

    res.render('product-detail', {
      title: product.product_name,
      product,
      reviews,
      relatedProducts
    });
  } catch (error) {
    console.error('Product detail error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { message: 'Unable to load product details' }
    });
  }
});

// เพิ่มรีวิวสินค้า
router.post('/:id/review', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth/login?redirect=/products/' + req.params.id);
  }

  try {
    const { rating, title, message } = req.body;
    const productId = req.params.id;
    const userId = req.session.user.user_id;

    // ตรวจสอบว่าเคยซื้อสินค้านี้แล้วหรือยัง
    const [orders] = await db.query(`
      SELECT od.* FROM order_detail od
      JOIN orders o ON od.order_id = o.order_id
      WHERE o.user_id = ? AND od.product_id = ?
    `, [userId, productId]);

    if (orders.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'You must purchase this product before reviewing' 
      });
    }

    // เพิ่มรีวิว
    await db.query(`
      INSERT INTO product_review 
      (product_id, user_id, order_id, review_title, review_message, createdAt)
      VALUES (?, ?, ?, ?, ?, NOW())
    `, [productId, userId, orders[0].order_id, title, message]);

    res.json({ success: true });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ success: false, message: 'Unable to add review' });
  }
});

module.exports = router;