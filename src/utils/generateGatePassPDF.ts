import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export interface GatePassData {
  bookingReference: string;
  fullName: string;
  email: string;
  phone: string;
  bookingDate: string;
  preferredTime: string;
  numberOfGuests: number;
  expectedEntryTime: string;
}

export const generateBookingReference = (bookingId: string): string => {
  // Generate a user-friendly reference code from the booking ID
  const prefix = 'RCMRD';
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const idPart = bookingId.slice(0, 6).toUpperCase();
  return `${prefix}-${datePart}-${idPart}`;
};

export const generateGatePassPDF = async (data: GatePassData): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // Colors
  const primaryBlue = [30, 64, 175]; // RGB for primary blue
  const darkBlue = [17, 24, 39];
  const lightGray = [243, 244, 246];
  const mediumGray = [107, 114, 128];

  // Header background
  doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.rect(0, 0, pageWidth, 55, 'F');

  // Logo placeholder - RCMRD text as logo
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('RCMRD', pageWidth / 2, 22, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Aquatic Center', pageWidth / 2, 32, { align: 'center' });

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('SWIMMING POOL GATE PASS', pageWidth / 2, 48, { align: 'center' });

  // Booking Reference Box
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(margin, 65, contentWidth, 25, 3, 3, 'F');

  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('BOOKING REFERENCE', pageWidth / 2, 73, { align: 'center' });

  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(data.bookingReference, pageWidth / 2, 84, { align: 'center' });

  // Status badge
  doc.setFillColor(34, 197, 94); // Green
  doc.roundedRect(pageWidth / 2 - 25, 95, 50, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CONFIRMED', pageWidth / 2, 103, { align: 'center' });

  // Details section
  let yPos = 120;
  const lineHeight = 14;

  const addDetailRow = (label: string, value: string) => {
    doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(label, margin, yPos);

    doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(value, margin, yPos + 6);

    yPos += lineHeight;
  };

  // Draw divider
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, 115, pageWidth - margin, 115);

  // Add details in two columns
  const colWidth = contentWidth / 2 - 5;

  // Left column
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('FULL NAME', margin, yPos);
  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(data.fullName, margin, yPos + 6);

  // Right column - Booking Date
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('BOOKING DATE', margin + colWidth + 10, yPos);
  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(data.bookingDate, margin + colWidth + 10, yPos + 6);

  yPos += lineHeight + 4;

  // Email and Time
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('EMAIL', margin, yPos);
  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(data.email, margin, yPos + 6);

  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('PREFERRED TIME', margin + colWidth + 10, yPos);
  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(data.preferredTime, margin + colWidth + 10, yPos + 6);

  yPos += lineHeight + 4;

  // Phone and Guests
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('PHONE NUMBER', margin, yPos);
  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(data.phone, margin, yPos + 6);

  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('NUMBER OF GUESTS', margin + colWidth + 10, yPos);
  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(data.numberOfGuests.toString(), margin + colWidth + 10, yPos + 6);

  yPos += lineHeight + 4;

  // Expected Entry Time
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('EXPECTED ENTRY TIME', margin, yPos);
  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(data.expectedEntryTime, margin, yPos + 6);

  yPos += lineHeight + 15;

  // QR Code section
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  yPos += 10;

  // Generate QR code
  try {
    const qrCodeData = `RCMRD-GATEPASS:${data.bookingReference}|${data.fullName}|${data.bookingDate}|${data.preferredTime}`;
    const qrCodeUrl = await QRCode.toDataURL(qrCodeData, {
      width: 120,
      margin: 1,
      color: {
        dark: '#1E40AF',
        light: '#FFFFFF'
      }
    });

    // Center QR code
    const qrSize = 45;
    doc.addImage(qrCodeUrl, 'PNG', pageWidth / 2 - qrSize / 2, yPos, qrSize, qrSize);

    yPos += qrSize + 8;

    doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Scan for verification', pageWidth / 2, yPos, { align: 'center' });
  } catch (error) {
    console.error('Error generating QR code:', error);
    // Fallback text if QR fails
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.roundedRect(margin, yPos, contentWidth, 30, 3, 3, 'F');
    doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(data.bookingReference, pageWidth / 2, yPos + 18, { align: 'center' });
    yPos += 35;
  }

  // Footer
  const footerY = 270;

  doc.setDrawColor(229, 231, 235);
  doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10);

  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  const footerText = 'This document serves as proof of booking and must be presented at the gate.';
  doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('RCMRD Aquatic Center | Kasarani, Nairobi | www.rcmrd.org', pageWidth / 2, footerY + 8, { align: 'center' });

  // Return as blob
  return doc.output('blob');
};

export const downloadGatePassPDF = async (data: GatePassData): Promise<void> => {
  const blob = await generateGatePassPDF(data);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `RCMRD-Gate-Pass-${data.bookingReference}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
