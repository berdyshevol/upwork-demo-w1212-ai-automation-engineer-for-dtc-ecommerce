// Seeded, read-only fixtures. Stand-ins for the helpdesk inbox and the Shopify
// order feed — no network, no database, identical for every visitor.

export interface Message {
  id: string;
  from: string;
  email: string;
  subject: string;
  body: string;
  receivedAt: string; // ISO, UTC
  orderRef: string | null; // order number quoted in the message, when there is one
}

export interface Order {
  orderNumber: string;
  email: string;
  items: string[];
  fulfillmentStatus: string;
  carrier: string;
  tracking: string;
  eta: string;
  placedAt: string;
}

export const MESSAGES: Message[] = [
  {
    id: 'm-1042',
    from: 'Dana Whitfield',
    email: 'dana.whitfield@example.com',
    subject: 'Order hasn’t moved in 5 days',
    body:
      'Hi — I placed order #1042 last Tuesday and the tracking hasn’t updated since Friday. ' +
      'It hasn’t moved in 5 days. Where is my order? I need it before the weekend.',
    receivedAt: '2026-08-14T08:12:00Z',
    orderRef: '1042',
  },
  {
    id: 'm-1043',
    from: 'Marcus Ihara',
    email: 'marcus.ihara@example.com',
    subject: 'Arrived cracked, photo attached',
    body:
      'The dripper from order #1043 arrived cracked down the side — photo attached. ' +
      'The outer box was damaged too. Can you sort this out before the weekend?',
    receivedAt: '2026-08-14T07:58:00Z',
    orderRef: '1043',
  },
  {
    id: 'm-1044',
    from: 'Priya Raman',
    email: 'priya.raman@example.com',
    subject: 'Wrong size — can I exchange for a medium?',
    body:
      'I ordered the merino crew in large on order #1044, but it is the wrong size on me. ' +
      'Can I exchange it for a medium? Happy to send it back this week.',
    receivedAt: '2026-08-14T07:31:00Z',
    orderRef: '1044',
  },
  {
    id: 'm-1045',
    from: 'Elena Novak',
    email: 'elena.novak@example.com',
    subject: 'Is the travel tumbler dishwasher safe?',
    body:
      'Quick one — is the Summit tumbler from order #1045 dishwasher safe, or is it hand wash only? ' +
      'Also curious about the care instructions for the lid gasket.',
    receivedAt: '2026-08-14T06:45:00Z',
    orderRef: '1045',
  },
  {
    id: 'm-1046',
    from: 'Tom Becker',
    email: 'tom.becker@example.com',
    subject: 'Tracking says delivered, nothing on my porch',
    body:
      'USPS says delivered on order #1046, but there is nothing on my porch and the neighbours ' +
      'do not have it either. Where is my order?',
    receivedAt: '2026-08-13T20:04:00Z',
    orderRef: '1046',
  },
  {
    id: 'm-1047',
    from: 'Grace Oyelaran',
    email: 'grace.oyelaran@example.com',
    subject: 'Refund still not showing on my card',
    body:
      'I posted the mug set back on order #1047 two weeks ago and the refund still has not landed ' +
      'on my card. Can you check where the return got to?',
    receivedAt: '2026-08-13T18:22:00Z',
    orderRef: '1047',
  },
  {
    id: 'm-1048',
    from: 'Sam Idris',
    email: 'sam.idris@example.com',
    subject: 'Following up on my note from Tuesday',
    body:
      'Hi team — just following up on the note I sent Tuesday about order #1048. ' +
      'Let me know when you get a chance. Thanks!',
    receivedAt: '2026-08-13T16:10:00Z',
    orderRef: '1048',
  },
  {
    id: 'm-bulk',
    from: 'Nadia Haddad',
    email: 'nadia.haddad@northwind-studio.example.com',
    subject: 'Bulk order for our office — 40 tumblers',
    body:
      'We would like 40 tumblers for our office in September. Who handles wholesale pricing and ' +
      'lead times? We have not bought from you before.',
    receivedAt: '2026-08-13T14:47:00Z',
    orderRef: null,
  },
];

export const ORDERS: Order[] = [
  {
    orderNumber: '1042',
    email: 'dana.whitfield@example.com',
    items: ['Cascade Pour-Over Kettle × 1', 'Ridge Roast 12 oz × 2'],
    fulfillmentStatus: 'In transit',
    carrier: 'UPS',
    tracking: '1Z999AA10123456784',
    eta: 'Aug 18, 2026',
    placedAt: 'Aug 5, 2026',
  },
  {
    orderNumber: '1043',
    email: 'marcus.ihara@example.com',
    items: ['Sandstone Ceramic Dripper × 1'],
    fulfillmentStatus: 'Delivered',
    carrier: 'USPS',
    tracking: '9400111899223197428490',
    eta: 'Delivered Aug 11, 2026',
    placedAt: 'Aug 4, 2026',
  },
  {
    orderNumber: '1044',
    email: 'priya.raman@example.com',
    items: ['Trailhead Merino Crew, Large × 1'],
    fulfillmentStatus: 'Delivered',
    carrier: 'UPS',
    tracking: '1Z999AA10199887766',
    eta: 'Delivered Aug 9, 2026',
    placedAt: 'Aug 2, 2026',
  },
  {
    orderNumber: '1045',
    email: 'elena.novak@example.com',
    items: ['Summit Travel Tumbler 16 oz × 2'],
    fulfillmentStatus: 'Delivered',
    carrier: 'FedEx',
    tracking: '771234567890',
    eta: 'Delivered Aug 7, 2026',
    placedAt: 'Aug 1, 2026',
  },
  {
    orderNumber: '1046',
    email: 'tom.becker@example.com',
    items: ['Ridge Roast Sampler × 1'],
    fulfillmentStatus: 'Delivered (carrier scan)',
    carrier: 'USPS',
    tracking: '9400111899223197399011',
    eta: 'Delivered Aug 12, 2026',
    placedAt: 'Aug 6, 2026',
  },
  {
    orderNumber: '1047',
    email: 'grace.oyelaran@example.com',
    items: ['Terrace Ceramic Mug Set × 1'],
    fulfillmentStatus: 'Return in transit',
    carrier: 'USPS',
    tracking: '9202390178451123',
    eta: 'Refund posts 3 business days after the return scan',
    placedAt: 'Jul 24, 2026',
  },
  {
    orderNumber: '1048',
    email: 'sam.idris@example.com',
    items: ['Ridge Roast 2 lb × 1'],
    fulfillmentStatus: 'Preparing to ship',
    carrier: 'UPS',
    tracking: 'Label created, not yet scanned',
    eta: 'Aug 20, 2026',
    placedAt: 'Aug 12, 2026',
  },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Fixed UTC formatting so the demo reads the same on every host and in CI. */
export function formatReceived(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${hh}:${mm} UTC`;
}

export function getMessage(id: string): Message | undefined {
  return MESSAGES.find((m) => m.id === id);
}

export function findOrder(orderRef: string | null, email: string): Order | undefined {
  if (orderRef) {
    const byNumber = ORDERS.find((o) => o.orderNumber === orderRef);
    if (byNumber) return byNumber;
  }
  return ORDERS.find((o) => o.email === email);
}
