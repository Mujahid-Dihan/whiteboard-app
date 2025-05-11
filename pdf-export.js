function exportToPDF() {
    // Show loading indicator
    const exportBtn = document.getElementById('exportPdfBtn');
    const originalText = exportBtn.innerHTML;
    exportBtn.innerHTML = '⏳ Exporting...';
    exportBtn.disabled = true;

    // Use html2canvas to capture the canvas
    html2canvas(document.getElementById('whiteboard'), {
        scale: 2, // Higher quality
        logging: false,
        useCORS: true
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('landscape');
        
        // Calculate aspect ratio
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        // Add image to PDF
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        
        // Add watermark
        pdf.setFontSize(12);
        pdf.setTextColor(150);
        pdf.text('Exported from CollabBoard', 10, 10);
        
        // Download the PDF
        pdf.save('collabBoard-export.pdf');
        
        // Restore button
        exportBtn.innerHTML = originalText;
        exportBtn.disabled = false;
    }).catch(err => {
        console.error('PDF export failed:', err);
        exportBtn.innerHTML = '❌ Export Failed';
        setTimeout(() => {
            exportBtn.innerHTML = originalText;
            exportBtn.disabled = false;
        }, 2000);
    });
}