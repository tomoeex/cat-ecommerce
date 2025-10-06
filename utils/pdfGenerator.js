const PDFDocument = require('pdfkit');

const generateReceipt = async (order, items) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Header
      doc.fontSize(20).text('TAX INVOICE / RECEIPT', { align: 'center' });
      doc.moveDown();
      
      doc.fontSize(12).text('Cat Supplies Store');
      doc.fontSize(10).text('123 Cat Street, Bangkok 10400');
      doc.moveDown();

      // Order info
      doc.text(`Order ID: ${order.order_id}`);
      doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
      doc.text(`Total: ฿${parseFloat(order.order_total_net).toFixed(2)}`);
      doc.moveDown();

      // Items
      items.forEach(item => {
        doc.text(`${item.product_name} x ${item.order_qty} - ฿${parseFloat(item.order_subtotal).toFixed(2)}`);
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateReceipt };