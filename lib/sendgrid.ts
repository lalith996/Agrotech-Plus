import sgMail from '@sendgrid/mail';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
} else {
  console.warn('SENDGRID_API_KEY is not set. Email notifications will be disabled.');
}

interface MailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string; // Optional: will use a default if not provided
}

export const sendEmail = async (options: MailOptions) => {
  if (!SENDGRID_API_KEY) {
    console.log('Email not sent: SENDGRID_API_KEY is missing.');
    // In a real app, you might want to return a more specific error
    // or have a fallback mechanism.
    return Promise.resolve(); 
  }

  const defaultFrom = process.env.SENDGRID_FROM_EMAIL || 'no-reply@yourapp.com';

  const msg = {
    to: options.to,
    from: options.from || defaultFrom,
    subject: options.subject,
    html: options.html,
  };

  try {
    await sgMail.send(msg);
    console.log(`Email sent to ${options.to}`);
  } catch (error) {
    console.error('Error sending email:', error);

    if (error.response) {
      console.error(error.response.body)
    }
    // Depending on the context, you might want to re-throw the error
    // throw error;
  }
};

// Export sgMail as default for backward compatibility
export default sgMail;
