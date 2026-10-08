import PDFDocument from 'pdfkit';

export const generatePDFReport = (reportType, data, res) => {
  const doc = new PDFDocument({ margin: 40 });
  const filename = `MediQueue_${reportType}_Report_${Date.now()}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  doc.pipe(res);

  // Header Banner
  doc
    .fillColor('#0F766E')
    .fontSize(22)
    .text('MediQueue Hospital', { align: 'center' })
    .fontSize(12)
    .fillColor('#64748B')
    .text('Smart Digital Queue Management & Hospital Report', { align: 'center' })
    .moveDown(0.5);

  doc.strokeColor('#0F766E').lineWidth(2).moveTo(40, 95).lineTo(570, 95).stroke();

  doc.moveDown(1.5);
  doc
    .fillColor('#0F172A')
    .fontSize(16)
    .text(`Report Type: ${reportType.replace(/_/g, ' ').toUpperCase()}`, { underline: true });
  doc.fontSize(10).text(`Generated On: ${new Date().toLocaleString()}`).moveDown(1);

  if (Array.isArray(data) && data.length > 0) {
    data.forEach((item, index) => {
      doc
        .fontSize(11)
        .fillColor('#0F766E')
        .text(`${index + 1}. ${item.title || item.tokenNumber || item.doctorName || 'Record'}`);

      doc.fontSize(9).fillColor('#334155');
      Object.keys(item).forEach((key) => {
        if (typeof item[key] !== 'object') {
          doc.text(`   • ${key}: ${item[key]}`);
        }
      });
      doc.moveDown(0.5);
    });
  } else {
    doc.fontSize(11).fillColor('#64748B').text('No operational data found for this report period.');
  }

  // Footer
  doc.moveDown(2);
  doc.fontSize(8).fillColor('#94A3B8').text('MediQueue Hospital Operations — Confidential Internal Document', {
    align: 'center',
  });

  doc.end();
};
