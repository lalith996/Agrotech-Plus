import { NextApiRequest, NextApiResponse } from 'next';
import client from '../../lib/twilio';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const { to, body } = req.body;

    try {
      const message = await client.messages.create({
        body,
        to,
        from: process.env.TWILIO_PHONE_NUMBER, // Your Twilio phone number
      });
      // console.log(message.sid);
      res.status(200).json({ success: true, sid: message.sid });
    } catch (error) {
      // console.error(error);
      res.status(500).json({ error: 'Error sending SMS' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};