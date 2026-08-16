import { prisma } from '@/lib/prisma';

type BookingForWhatsApp = {
  id: string;
  totalAmount: number;
  collectionDate: Date;
  slot: string;
  mode: 'HOME' | 'CENTRE';
  whatsappNotifiedAt: Date | null;
  patient: { name: string; phone: string };
  items: { test: { name: string } }[];
};

function normalizeIndianPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return digits;
}

export async function sendBookingConfirmationWhatsApp(booking: BookingForWhatsApp) {
  if (booking.whatsappNotifiedAt) return { skipped: true };

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME || 'tglabs_booking_confirmed';
  const languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en_US';
  const graphVersion = process.env.WHATSAPP_GRAPH_VERSION || 'v23.0';

  if (!accessToken || !phoneNumberId) {
    console.warn('WhatsApp confirmation skipped: credentials are not configured.');
    return { skipped: true };
  }

  const testNames = booking.items.map((item) => item.test.name).join(', ');
  const date = booking.collectionDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizeIndianPhone(booking.patient.phone),
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: booking.patient.name },
              { type: 'text', text: booking.id },
              { type: 'text', text: testNames || 'Diagnostic test' },
              { type: 'text', text: booking.mode === 'HOME' ? 'Home sample collection' : 'Centre booking' },
              { type: 'text', text: date },
              { type: 'text', text: booking.slot },
              { type: 'text', text: `₹${booking.totalAmount}` },
            ],
          },
        ],
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('WhatsApp confirmation failed', { status: response.status, payload });
    throw new Error('WhatsApp confirmation failed.');
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { whatsappNotifiedAt: new Date() },
  });

  return { ok: true, messageId: payload?.messages?.[0]?.id as string | undefined };
}
