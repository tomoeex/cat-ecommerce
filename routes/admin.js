const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// ตั้งค่า multer สำหรับ upload รูปภาพ
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images/products/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Admin Dashboard
router.get('/dashboard', isAdmin, async (req, res) => {
  try {
    // สถิติต่างๆ
    const [stats] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM product) as total_products,
        (SELECT COUNT(*) FROM user WHERE user_role = 'customer') as total_customers,
        (SELECT COUNT(*) FROM orders WHERE order_status != 'pending') as total_orders,
        (SELECT SUM(order_total_net) FROM orders WHERE order_status = 'paid') as total_revenue
    `);

    // รายการ order ล่าสุด
    const [recentOrders] = await db.query(`
      SELECT o.*, u.user_fullname, u.user_email
      FROM orders o
      JOIN user u ON o.user_id = u.user_id
      WHERE o.order_status != 'pending'
      ORDER BY o.createdAt DESC
      LIMIT 10
    `);

    // สินค้าที่ใกล้หมด
    const [lowStockProducts] = await db.query(`
      SELECT * FROM product 
      WHERE product_qty < 10 AND product_status = 1
      ORDER BY product_qty ASC
      LIMIT 10
    `);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      stats: stats[0],
      recentOrders,
      lowStockProducts
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { message: 'Unable to load dashboard' }
    });
  }
});

// จัดการสินค้า - แสดงรายการ (ตามข้อกำหนดข้อ 6.3)
router.get('/products', isAdmin, async (req, res) => {
  try {
    const { search, category } = req.query;
    
    let query = `
      SELECT p.*, c.category_name, b.brand_name
      FROM product p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (p.product_name LIKE ? OR p.product_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (category) {
      query += ' AND p.category_id = ?';
      params.push(category);
    }

    query += ' ORDER BY p.createdAt DESC';

    const [products] = await db.query(query, params);
    const [categories] = await db.query('SELECT * FROM categories ORDER BY category_name');
    const [brands] = await db.query('SELECT * FROM brands ORDER BY brand_name');

    res.render('admin/products', {
      title: 'Manage Products',
      products,
      categories,
      brands,
      filters: { search, category }
    });
  } catch (error) {
    console.error('Admin products error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { message: 'Unable to load products' }
    });
  }
});

// เพิ่มสินค้า - แสดงฟอร์ม (INSERT ตามข้อกำหนดข้อ 6.3)
router.get('/products/add', isAdmin, async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM categories ORDER BY category_name');
    const [brands] = await db.query('SELECT * FROM brands ORDER BY brand_name');

    res.render('admin/product-form', {
      title: 'Add Product',
      product: null,
      categories,
      brands,
      action: 'add'
    });
  } catch (error) {
    console.error('Add product form error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { message: 'Unable to load form' }
    });
  }
});

// เพิ่มสินค้า - บันทึก
router.post('/products/add', isAdmin, upload.single('product_image'), async (req, res) => {
  try {
    const {
      product_name, category_id, brand_id, product_detail,
      product_price, product_qty, product_use
    } = req.body;

    const product_image = req.file ? '/images/products/' + req.file.filename : '/images/products/default.jpg';

    await db.query(`
      INSERT INTO product 
      (category_id, brand_id, product_name, product_detail, product_price, 
       product_qty, product_use, product_image, product_rating, product_status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1, NOW())
    `, [category_id, brand_id, product_name, product_detail, product_price, 
        product_qty, product_use, product_image]);

    res.redirect('/admin/products?success=added');
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { message: 'Unable to add product' }
    });
  }
});

// แก้ไขสินค้า - บันทึก
router.post('/products/edit/:id', isAdmin, upload.single('product_image'), async (req, res) => {
  try {
    const productId = req.params.id;
    const {
      product_name, category_id, brand_id, product_detail,
      product_price, product_qty, product_use, product_status
    } = req.body;

    let updateQuery = `
      UPDATE product 
      SET product_name = ?, category_id = ?, brand_id = ?, product_detail = ?,
          product_price = ?, product_qty = ?, product_use = ?, product_status = ?,
          updatedAt = NOW()
    `;
    let params = [product_name, category_id, brand_id, product_detail, 
                  product_price, product_qty, product_use, product_status];

    // ถ้ามีการอัพโหลดรูปใหม่
    if (req.file) {
      updateQuery += ', product_image = ?';
      params.push('/images/products/' + req.file.filename);
    }

    updateQuery += ' WHERE product_id = ?';
    params.push(productId);

    await db.query(updateQuery, params);

    res.redirect('/admin/products?success=updated');
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { message: 'Unable to update product' }
    });
  }
});

// ลบสินค้า (DELETE ตามข้อกำหนดข้อ 6.3)
router.post('/products/delete/:id', isAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM product WHERE product_id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete product error:', error);
    res.json({ success: false, message: 'Unable to delete product' });
  }
});

// ค้นหาสินค้า (SEARCH ตามข้อกำหนดข้อ 6.3)
router.get('/products/search', isAdmin, async (req, res) => {
  try {
    const { q } = req.query;

    const [products] = await db.query(`
      SELECT p.*, c.category_name, b.brand_name
      FROM product p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      WHERE p.product_name LIKE ? 
         OR p.product_id LIKE ?
         OR p.product_detail LIKE ?
      ORDER BY p.product_name
    `, [`%${q}%`, `%${q}%`, `%${q}%`]);

    res.json({ success: true, products });
  } catch (error) {
    console.error('Search products error:', error);
    res.json({ success: false, message: 'Search failed' });
  }
});

// จัดการออร์เดอร์
router.get('/orders', isAdmin, async (req, res) => {
  try {
    const { status, search } = req.query;

    let query = `
      SELECT o.*, u.user_fullname, u.user_email,
             COUNT(od.id) as item_count
      FROM orders o
      JOIN user u ON o.user_id = u.user_id
      LEFT JOIN order_detail od ON o.order_id = od.order_id
      WHERE o.order_status != 'pending'
    `;
    const params = [];

    if (status) {
      query += ' AND o.order_status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (o.order_id LIKE ? OR u.user_fullname LIKE ? OR u.user_email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' GROUP BY o.order_id ORDER BY o.createdAt DESC';

    const [orders] = await db.query(query, params);

    res.render('admin/orders', {
      title: 'Manage Orders',
      orders,
      filters: { status, search }
    });
  } catch (error) {
    console.error('Admin orders error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { message: 'Unable to load orders' }
    });
  }
});

// ดูรายละเอียดออร์เดอร์
router.get('/orders/:id', isAdmin, async (req, res) => {
  try {
    const orderId = req.params.id;

    // ดึงข้อมูล order
    const [orders] = await db.query(`
      SELECT o.*, u.user_fullname, u.user_email, u.user_tel, u.user_address,
             p.payment_method, p.transaction_ref, p.createdAt as payment_date
      FROM orders o
      JOIN user u ON o.user_id = u.user_id
      LEFT JOIN payment p ON o.order_id = p.order_id
      WHERE o.order_id = ?
    `, [orderId]);

    if (orders.length === 0) {
      return res.status(404).render('error', {
        title: 'Order Not Found',
        error: { message: 'Order not found' }
      });
    }

    // ดึงรายการสินค้า
    const [items] = await db.query(`
      SELECT od.*, p.product_image
      FROM order_detail od
      LEFT JOIN product p ON od.product_id = p.product_id
      WHERE od.order_id = ?
    `, [orderId]);

    res.render('admin/order-detail', {
      title: 'Order Detail',
      order: orders[0],
      items
    });
  } catch (error) {
    console.error('Order detail error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { message: 'Unable to load order details' }
    });
  }
});

// อัพเดทสถานะออร์เดอร์
router.post('/orders/update-status', isAdmin, async (req, res) => {
  try {
    const { order_id, status } = req.body;

    await db.query(
      'UPDATE orders SET order_status = ?, updatedAt = NOW() WHERE order_id = ?',
      [status, order_id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update order status error:', error);
    res.json({ success: false, message: 'Unable to update status' });
  }
});

// จัดการลูกค้า
router.get('/customers', isAdmin, async (req, res) => {
  try {
    const { search } = req.query;

    let query = `
      SELECT u.*, 
             COUNT(DISTINCT o.order_id) as total_orders,
             COALESCE(SUM(o.order_total_net), 0) as total_spent
      FROM user u
      LEFT JOIN orders o ON u.user_id = o.user_id AND o.order_status = 'paid'
      WHERE u.user_role = 'customer'
    `;
    const params = [];

    if (search) {
      query += ' AND (u.user_fullname LIKE ? OR u.user_email LIKE ? OR u.user_username LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' GROUP BY u.user_id ORDER BY u.createdAt DESC';

    const [customers] = await db.query(query, params);

    res.render('admin/customers', {
      title: 'Manage Customers',
      customers,
      filters: { search }
    });
  } catch (error) {
    console.error('Admin customers error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { message: 'Unable to load customers' }
    });
  }
});

// จัดการหมวดหมู่สินค้า
router.get('/categories', isAdmin, async (req, res) => {
  try {
    const [categories] = await db.query(`
      SELECT c.*, COUNT(p.product_id) as product_count
      FROM categories c
      LEFT JOIN product p ON c.category_id = p.category_id
      GROUP BY c.category_id
      ORDER BY c.category_name
    `);

    res.render('admin/categories', {
      title: 'Manage Categories',
      categories
    });
  } catch (error) {
    console.error('Admin categories error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { message: 'Unable to load categories' }
    });
  }
});

// เพิ่มหมวดหมู่
router.post('/categories/add', isAdmin, async (req, res) => {
  try {
    const { category_name } = req.body;
    await db.query('INSERT INTO categories (category_name) VALUES (?)', [category_name]);
    res.json({ success: true });
  } catch (error) {
    console.error('Add category error:', error);
    res.json({ success: false, message: 'Unable to add category' });
  }
});

// แก้ไขหมวดหมู่
router.post('/categories/edit/:id', isAdmin, async (req, res) => {
  try {
    const { category_name } = req.body;
    await db.query(
      'UPDATE categories SET category_name = ? WHERE category_id = ?',
      [category_name, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Update category error:', error);
    res.json({ success: false, message: 'Unable to update category' });
  }
});

// ลบหมวดหมู่
router.post('/categories/delete/:id', isAdmin, async (req, res) => {
  try {
    // ตรวจสอบว่ามีสินค้าในหมวดหมู่นี้หรือไม่
    const [products] = await db.query(
      'SELECT COUNT(*) as count FROM product WHERE category_id = ?',
      [req.params.id]
    );

    if (products[0].count > 0) {
      return res.json({ 
        success: false, 
        message: 'Cannot delete category with existing products' 
      });
    }

    await db.query('DELETE FROM categories WHERE category_id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete category error:', error);
    res.json({ success: false, message: 'Unable to delete category' });
  }
});

// จัดการแบรนด์
router.get('/brands', isAdmin, async (req, res) => {
  try {
    const [brands] = await db.query(`
      SELECT b.*, COUNT(p.product_id) as product_count
      FROM brands b
      LEFT JOIN product p ON b.brand_id = p.brand_id
      GROUP BY b.brand_id
      ORDER BY b.brand_name
    `);

    res.render('admin/brands', {
      title: 'Manage Brands',
      brands
    });
  } catch (error) {
    console.error('Admin brands error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { message: 'Unable to load brands' }
    });
  }
});

// Login log
router.get('/login-logs', isAdmin, async (req, res) => {
  try {
    const [logs] = await db.query(`
      SELECT l.*, u.user_username, u.user_fullname, u.user_role
      FROM user_login_log l
      JOIN user u ON l.user_id = u.user_id
      ORDER BY l.login_time DESC
      LIMIT 100
    `);

    res.render('admin/login-logs', {
      title: 'Login Logs',
      logs
    });
  } catch (error) {
    console.error('Login logs error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { message: 'Unable to load login logs' }
    });
  }
});

router.get('/products/edit/:id', isAdmin, async (req, res) => {
  try {
    const [products] = await db.query('SELECT * FROM product WHERE product_id = ?', [req.params.id]);
    
    if (products.length === 0) {
      return res.status(404).render('error', {
        title: 'Product Not Found',
        error: { message: 'Product not found' }
      });
    }

    const [categories] = await db.query('SELECT * FROM categories ORDER BY category_name');
    const [brands] = await db.query('SELECT * FROM brands ORDER BY brand_name');

    res.render('admin/product-form', {
      title: 'Edit Product',
      product: products[0],
      categories,
      brands,
      action: 'edit'
    });
  } catch (error) {
    console.error('Edit product form error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { message: 'Unable to load form' }
    });
  }
});

module.exports = router;