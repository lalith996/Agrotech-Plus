import twilio from 'twilio';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

let client;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
} else {
  console.warn('Twilio credentials are not fully set. SMS notifications will be disabled.');
}

interface SmsOptions {
  to: string; // E.164 format
  body: string;
}

export const sendSms = async (options: SmsOptions) => {
  if (!client || !TWILIO_PHONE_NUMBER) {
    console.log(`SMS not sent to ${options.to}: Twilio is not configured.`);
    return Promise.resolve();
  }

  try {
    await client.messages.create({
      body: options.body,
      from: TWILIO_PHONE_NUMBER,
      to: options.to,
    });
    console.log(`SMS sent to ${options.to}`);
  } catch (error) {
    console.error('Error sending SMS:', error);
    // throw error;
  }
};

// Export client as default for backward compatibility
export default client;
