const { SESClient, SendEmailCommand, SendRawEmailCommand } = require('@aws-sdk/client-ses');
const { logger } = require('../middleware/logger');

// Initialize SES client with environment configuration
// Ensure these env vars are set: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
const sesClient = new SESClient({
  region: process.env.AWS_REGION || process.env.AWS_SES_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

// Check if email is enabled and properly configured
const isEmailEnabled = () => {
  const enabled = !!(
    process.env.AWS_ACCESS_KEY_ID && 
    process.env.AWS_SECRET_ACCESS_KEY && 
    process.env.AWS_REGION &&
    process.env.AWS_SES_FROM_EMAIL
  );
  
  if (!enabled) {
    logger.warn('Email is not enabled - Missing configuration:', {
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      hasRegion: !!process.env.AWS_REGION,
      hasFromEmail: !!process.env.AWS_SES_FROM_EMAIL,
      fromEmail: process.env.AWS_SES_FROM_EMAIL || 'NOT SET'
    });
  }
  
  return enabled;
};

/**
 * Send an email using AWS SES
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlBody - HTML email body
 * @param {string} [textBody] - Plain text email body (optional)
 * @returns {Promise<boolean>} Success status
 */
async function sendEmail(to, subject, htmlBody, textBody = null) {
  try {
    // Check if email is enabled
    if (!isEmailEnabled()) {
      logger.warn('Email is not enabled - AWS SES credentials not configured');
      return false;
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!to || !emailRegex.test(to)) {
      logger.error(`Invalid recipient email format: ${to}`);
      return false;
    }

    const fromEmail = process.env.AWS_SES_FROM_EMAIL;
    if (!fromEmail || !emailRegex.test(fromEmail)) {
      logger.error(`Invalid sender email format: ${fromEmail}`);
      return false;
    }

    // Validate subject and body
    if (!subject || subject.trim().length === 0) {
      logger.error('Email subject is empty or invalid');
      return false;
    }

    if (!htmlBody || htmlBody.trim().length === 0) {
      logger.error('Email body is empty or invalid');
      return false;
    }

    // Extract sender name and email
    const senderName = process.env.AWS_SES_FROM_NAME || 'Online Electrical Wholesale';
    const fromAddress = `${senderName} <${fromEmail}>`;
    
    // Prepare email parameters with proper headers to avoid spam
    const params = {
      Source: fromAddress,
      Destination: {
        ToAddresses: [to]
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8'
          }
        }
      },
      // Add configuration set for better deliverability (optional)
      ConfigurationSetName: process.env.AWS_SES_CONFIGURATION_SET || undefined,
      // Add reply-to address
      ReplyToAddresses: [process.env.AWS_SES_REPLY_TO || fromEmail]
    };

    // Add text body if provided
    if (textBody) {
      params.Message.Body.Text = {
        Data: textBody,
        Charset: 'UTF-8'
      };
    }

    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);
    
    logger.info(`Email sent successfully to ${to}. MessageId: ${response.MessageId}`);
    return true;

  } catch (error) {
    // Handle specific AWS SES errors
    if (error.code === 'MessageRejected' || error.name === 'MessageRejected') {
      logger.error(`Email rejected - check email address and SES configuration: ${error.message}`);
    } else if (error.code === 'AccessDenied' || error.message.includes('not authorized')) {
      logger.error(`Email access denied - IAM user lacks SES:SendEmail permission: ${error.message}`);
    } else if (error.code === 'InvalidParameter' || error.name === 'InvalidParameterValue') {
      logger.error(`Email invalid parameter: ${error.message}`);
    } else if (error.code === 'Throttling' || error.name === 'Throttling') {
      logger.error(`Email throttled - too many requests: ${error.message}`);
    } else {
      logger.error(`Email send failed: ${error.message}`, { error: error.stack });
    }
    
    return false;
  }
}

/**
 * Send OTP verification email
 * @param {string} to - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @param {string} [userName] - User's name for personalization
 * @returns {Promise<boolean>} Success status
 */
async function sendOtpEmail(to, otp, userName = null) {
  // Improved subject line - less spammy, more professional
  const subject = 'Complete Your Registration - Verification Code';
  const name = userName || 'User';
  const companyName = process.env.COMPANY_NAME || 'Online Electrical Wholesale';
  const companyWebsite = process.env.COMPANY_WEBSITE || 'https://onlineelectricalwholesale.com.au';
  const fromEmail = process.env.AWS_SES_FROM_EMAIL;
  const senderName = process.env.AWS_SES_FROM_NAME || companyName;

  // Validate fromEmail is set
  if (!fromEmail) {
    logger.error('AWS_SES_FROM_EMAIL is not configured in environment variables');
    return false;
  }
  
  // Professional HTML email template with better structure to avoid spam filters
  const htmlBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Email Verification</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5; padding: 20px;">
        <tr>
          <td align="center" style="padding: 20px 0;">
            <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="padding: 30px 30px 20px; text-align: center; background-color: #ffffff; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #333333; font-size: 24px; font-weight: 600;">${companyName}</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 30px;">
                  <h2 style="margin: 0 0 20px; color: #333333; font-size: 20px; font-weight: 600;">Verify Your Email Address</h2>
                  <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">Hello ${name},</p>
                  <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.6;">Thank you for registering with ${companyName}. Please use the verification code below to complete your registration:</p>
                  
                  <!-- OTP Code Box -->
                  <table role="presentation" style="width: 100%; margin: 30px 0;">
                    <tr>
                      <td align="center" style="padding: 25px; background-color: #f8f9fa; border-radius: 6px; border: 2px dashed #dee2e6;">
                        <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #007bff; font-family: 'Courier New', monospace;">${otp}</div>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">This verification code will expire in <strong style="color: #333333;">10 minutes</strong>.</p>
                  
                  <p style="margin: 30px 0 20px; color: #666666; font-size: 14px; line-height: 1.6;">If you didn't create an account with ${companyName}, please ignore this email or contact our support team if you have concerns.</p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 20px 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #dee2e6;">
                  <p style="margin: 0 0 10px; color: #999999; font-size: 12px; line-height: 1.5; text-align: center;">
                    This is an automated message from ${companyName}. Please do not reply to this email.
                  </p>
                  <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.5; text-align: center;">
                    <a href="${companyWebsite}" style="color: #007bff; text-decoration: none;">Visit our website</a> | 
                    <a href="${companyWebsite}/support" style="color: #007bff; text-decoration: none;">Contact Support</a>
                  </p>
                  <p style="margin: 15px 0 0; color: #999999; font-size: 11px; line-height: 1.5; text-align: center;">
                    © ${new Date().getFullYear()} ${companyName}. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const textBody = `
    Email Verification
    
    Hello ${name},
    
    Thank you for registering with us! Please use the following OTP code to verify your email address:
    
    ${otp}
    
    This code will expire in 10 minutes.
    
    If you didn't request this code, please ignore this email.
    
    This is an automated message, please do not reply to this email.
  `;

  // Use SendRawEmail for better control over headers (improves deliverability)
  return await sendRawEmail(to, fromEmail, senderName, subject, htmlBody, textBody);
}

/**
 * Send email using SendRawEmail for better header control and deliverability
 * @param {string} to - Recipient email
 * @param {string} fromEmail - Sender email
 * @param {string} senderName - Sender name
 * @param {string} subject - Email subject
 * @param {string} htmlBody - HTML body
 * @param {string} textBody - Plain text body
 * @returns {Promise<boolean>} Success status
 */
async function sendRawEmail(to, fromEmail, senderName, subject, htmlBody, textBody) {
  try {
    // Validate inputs
    if (!fromEmail || !to) {
      logger.error('sendRawEmail: fromEmail and to are required');
      return false;
    }

    // Extract domain from email for Message-ID
    const emailDomain = fromEmail.includes('@') ? fromEmail.split('@')[1] : 'example.com';
    
    // Generate unique Message-ID
    const messageId = `<${Date.now()}-${Math.random().toString(36).substr(2, 9)}@${emailDomain}>`;
    const date = new Date().toUTCString();
    
    // Build email headers for better deliverability
    const headers = [
      `From: ${senderName} <${fromEmail}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Date: ${date}`,
      `Message-ID: ${messageId}`,
      `MIME-Version: 1.0`,
      `X-Mailer: Online Electrical Wholesale API`,
      `X-Priority: 3`,
      `X-MSMail-Priority: Normal`,
      `Importance: Normal`,
      `List-Unsubscribe: <${process.env.COMPANY_WEBSITE || 'https://onlineelectricalwholesale.com.au'}/unsubscribe>`,
      `List-Unsubscribe-Post: List-Unsubscribe=One-Click`,
    ];

    // Add Reply-To if configured
    if (process.env.AWS_SES_REPLY_TO) {
      headers.push(`Reply-To: ${process.env.AWS_SES_REPLY_TO}`);
    }

    // Build multipart email body
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);

    // Build email body
    let body = '';
    
    // Plain text part
    if (textBody) {
      body += `--${boundary}\r\n`;
      body += `Content-Type: text/plain; charset=UTF-8\r\n`;
      body += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
      body += `${textBody}\r\n\r\n`;
    }
    
    // HTML part
    body += `--${boundary}\r\n`;
    body += `Content-Type: text/html; charset=UTF-8\r\n`;
    body += `Content-Transfer-Encoding: quoted-printable\r\n\r\n`;
    body += `${htmlBody}\r\n\r\n`;
    body += `--${boundary}--`;

    // Combine headers and body
    const rawMessage = headers.join('\r\n') + '\r\n\r\n' + body;

    // Encode to base64
    const rawMessageBuffer = Buffer.from(rawMessage, 'utf-8');

    const params = {
      RawMessage: {
        Data: rawMessageBuffer
      },
      ConfigurationSetName: process.env.AWS_SES_CONFIGURATION_SET || undefined
    };

    const command = new SendRawEmailCommand(params);
    const response = await sesClient.send(command);
    
    logger.info(`Email sent successfully to ${to}. MessageId: ${response.MessageId}`);
    return true;

  } catch (error) {
    // Fallback to regular SendEmail if SendRawEmail fails
    logger.warn(`SendRawEmail failed, falling back to SendEmail: ${error.message}`);
    return await sendEmail(to, subject, htmlBody, textBody);
  }
}

module.exports = { sendEmail, sendOtpEmail };

