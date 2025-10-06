const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const [featuredProducts] = await db.query(`
      SELECT p.*, c.category_name, b.brand_name
      FROM product p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      WHERE p.product_qty > 0 AND p.product_status = 1
      ORDER BY p.product_rating DESC, p.createdAt DESC
      LIMIT 8
    `);

    const [categories] = await db.query('SELECT * FROM categories ORDER BY category_name');

    res.render('home', {
      title: 'Home - Cat Supplies Store',
      featuredProducts,
      categories
    });
  } catch (error) {
    console.error('Home page error:', error);
    res.status(500).render('error', { 
      title: 'Error', 
      error: { message: 'Unable to load home page' }
    });
  }
});

router.get('/contact', (req, res) => {
  const teamMembers = [
    { name: 'สมาชิกคนที่ 1', studentId: '66XXXXXXX', role: 'Project Manager' },
    { name: 'สมาชิกคนที่ 2', studentId: '66XXXXXXX', role: 'Backend Developer' },
    { name: 'สมาชิกคนที่ 3', studentId: '66XXXXXXX', role: 'Frontend Developer' },
    { name: 'สมาชิกคนที่ 4', studentId: '66XXXXXXX', role: 'Database Designer' }
  ];

  res.render('contact', {
    title: 'Contact Us',
    teamMembers,
    storeInfo: {
      name: 'Cat Supplies Store',
      address: '123 Cat Street, Bangkok 10400, Thailand',
      phone: '02-XXX-XXXX',
      email: 'info@catstore.com',
      hours: 'Mon-Sat: 9:00 AM - 6:00 PM'
    }
  });
});

module.exports = router;