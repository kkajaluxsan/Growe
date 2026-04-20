import '../src/bootstrap-env.js';
import { getTransporter, smtpConfig } from '../src/config/smtp.js';

async function testSMTP() {
  const transporter = getTransporter();
  console.log('Testing SMTP connection...');
  try {
    await transporter.verify();
    console.log('SMTP Connection Successful!');
    
    console.log('Sending test email to', smtpConfig.from, '...');
    const info = await transporter.sendMail({
      from: smtpConfig.from,
      to: 'growelearnning@gmail.com',
      subject: 'Growe SMTP Test',
      text: 'If you are reading this, your Gmail SMTP configuration in .env is working correctly!',
    });
    console.log('Email sent successfully!', info.messageId);
    process.exit(0);
  } catch (err) {
    console.error('SMTP Error:', err);
    process.exit(1);
  }
}

testSMTP();
