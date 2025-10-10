import { NextApiRequest, NextApiResponse } from 'next';
import sgMail from '../../lib/sendgrid';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const { to, subject, text, html } = req.body;
    const msg = {
      to,
      from: 'your-email@example.com', // Change to your verified sender
      subject,
      text,
      html,
    };

    try {
      await sgMail.send(msg);
      res.status(200).json({ success: true });
    } catch (error) {
      // console.error(error);
      if (error.response) {
        // console.error(error.response.body)
      }
      res.status(500).json({ error: 'Error sending email' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};