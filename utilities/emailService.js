// ============================================
// EMAIL SERVICE
// ============================================
const nodemailer = require('nodemailer');
const pool = require('../config/db');
const logger = require('./logger');

// Configure email transporter (Gmail example - update with your credentials)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

const sendNotificationEmail = async (recipientEmail, userName, subject, message) => {
  try {
    if (!process.env.SMTP_USER) {
      logger.warn('Email service not configured - skipping email');
      return;
    }

    const htmlContent = `
      <h2>${subject}</h2>
      <p>Hi ${userName},</p>
      <p>${message}</p>
      <p>---</p>
      <p>This is an automated notification from CRM System</p>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: recipientEmail,
      subject: subject,
      html: htmlContent
    });

    // Log email
    await pool.query(
      `INSERT INTO email_logs (recipient_email, subject, status, sent_at)
       VALUES (?, ?, 'sent', NOW())`,
      [recipientEmail, subject]
    );

    logger.info(`Email sent to ${recipientEmail}`);
  } catch (error) {
    logger.error('Failed to send email:', error.message);
    
    // Log failed email
    try {
      await pool.query(
        `INSERT INTO email_logs (recipient_email, subject, status, error_message)
         VALUES (?, ?, 'failed', ?)`,
        [recipientEmail, subject, error.message]
      );
    } catch (dbError) {
      logger.error('Failed to log email error:', dbError.message);
    }
  }
};

const sendLeadAssignmentEmail = async (assigneeEmail, assigneeName, leadName) => {
  const subject = `New Lead Assigned: ${leadName}`;
  const message = `A new lead "${leadName}" has been assigned to you.`;
  await sendNotificationEmail(assigneeEmail, assigneeName, subject, message);
};

const sendTaskDeadlineEmail = async (userEmail, userName, taskTitle, dueDate) => {
  const subject = `Task Reminder: ${taskTitle}`;
  const message = `Your task "${taskTitle}" is due on ${dueDate}.`;
  await sendNotificationEmail(userEmail, userName, subject, message);
};

const sendDealUpdateEmail = async (userEmail, userName, dealTitle, updateMessage) => {
  const subject = `Deal Update: ${dealTitle}`;
  const message = `Deal "${dealTitle}" has been updated: ${updateMessage}`;
  await sendNotificationEmail(userEmail, userName, subject, message);
};

module.exports = {
  sendNotificationEmail,
  sendLeadAssignmentEmail,
  sendTaskDeadlineEmail,
  sendDealUpdateEmail
};
