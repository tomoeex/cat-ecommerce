# Cat Supplies E-commerce Web Application

โปรเจค Database Web Application สำหรับร้านขายของใช้แมว

## การติดตั้ง

1. npm install
2. สร้างฐานข้อมูล: mysql -u root -p < database_schema.sql
3. ตั้งค่า .env
4. npm run dev/npx nodemon app.js

## บัญชีทดสอบ

- Admin: admin / Admin@123
- Customer: customer / Customer@123

ทางเลือก: เพิ่ม Listen ใน app.js เอง (แบบที่คุณพยายามทำ)
ถ้าคุณอยากให้รันผ่าน app.js ได้เลย ให้เพิ่มโค้ดนี้ไว้ที่ ท้ายสุดของไฟล์ (ต่อจาก module.exports = app;):

// ... โค้ดเดิมของคุณ ...
module.exports = app;

// เพิ่มส่วนนี้เข้าไปท้ายไฟล์
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`--------------------------------------`);
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log(`--------------------------------------`);
});


