// Mock data for invoicing software

export const mockCustomers = [
  {
    id: '1',
    name: 'MALISHKA ENTERPRISES',
    address: '6TH FLOOR, 6045 TRADE HOUSE, RING ROAD, SURAT',
    state: 'Gujarat',
    gstNo: '24ABBFM3781G1ZD',
    panNo: 'ABBFM3781G',
    iecNo: 'IEC0123456789',
    phone: '+91 9876543210',
    email: 'malishka@example.com'
  },
  {
    id: '2',
    name: 'ORIENTAL TRADELINKS',
    address: 'PLOT NO. 15, 1ST FLOOR, OFFICE NO. 101, FORTUNE SQUARE, RING ROAD, SURAT',
    state: 'Gujarat',
    gstNo: '24XXXXX1234X1ZX',
    panNo: 'XXXXX1234X',
    iecNo: '',
    phone: '',
    email: ''
  }
];

export const mockExpenseHeads = [
  { id: '1', name: 'AGENCY CHARGES', hsnSac: '996511', gstRate: 18, isAlwaysIGST: false },
  { id: '2', name: 'WEIGHMENT CHARGES', hsnSac: '996519', gstRate: 18, isAlwaysIGST: false },
  { id: '3', name: 'LOLO CHARGES', hsnSac: '996521', gstRate: 18, isAlwaysIGST: false },
  { id: '4', name: 'LINE CHARGES (NON-TAXABLE)', hsnSac: '996759', gstRate: 0, isAlwaysIGST: false },
  { id: '5', name: 'DOCUMENTATION CHARGES', hsnSac: '996511', gstRate: 18, isAlwaysIGST: false },
  { id: '6', name: 'TRANSPORTATION CHARGES', hsnSac: '996411', gstRate: 18, isAlwaysIGST: false },
  { id: '7', name: 'IMPORT OCEAN FREIGHT', hsnSac: '996511', gstRate: 5, isAlwaysIGST: true }
];

export const mockInvoices = [
  {
    id: 'INV001',
    invoiceNo: '192',
    invoiceDate: '2024-01-15',
    customer: mockCustomers[0],
    voucherType: 'Tax Invoice',
    withGst: true,
    shipmentDetails: {
      refNo: 'REF001',
      beNo: 'BE123456',
      beDate: '2024-01-10',
      pol: 'QINGDAO',
      pod: 'MUNDRA',
      noOfContainers: '2',
      containerType: '40 FT',
      noOfPackages: '1120',
      mbl: 'MBL123456',
      hbl: 'HBL789012'
    },
    expenses: [
      {
        id: '1',
        expenseHead: mockExpenseHeads[0],
        qty: 1,
        rate: 10000,
        exchangeRate: 1,
        amount: 10000
      },
      {
        id: '2',
        expenseHead: mockExpenseHeads[1],
        qty: 1,
        rate: 400,
        exchangeRate: 1,
        amount: 400
      },
      {
        id: '3',
        expenseHead: mockExpenseHeads[2],
        qty: 1,
        rate: 2966.10,
        exchangeRate: 1,
        amount: 2966.10
      }
    ],
    subtotal: 13366.10,
    cgst: 1202.95,
    sgst: 1202.95,
    igst: 0,
    total: 15772,
    status: 'Paid',
    createdAt: '2024-01-15'
  },
  {
    id: 'INV002',
    invoiceNo: 'R-02',
    invoiceDate: '2024-01-20',
    customer: mockCustomers[1],
    voucherType: 'Reimbursement Note',
    withGst: false,
    shipmentDetails: {
      refNo: 'REF002',
      beNo: 'BE789012',
      beDate: '2024-01-18',
      pol: 'MUNDRA',
      pod: 'JEBEL ALI',
      noOfContainers: '1',
      containerType: '20 FT',
      noOfPackages: '500',
      mbl: 'MBL789012',
      hbl: 'HBL345678'
    },
    expenses: [
      {
        id: '1',
        expenseHead: mockExpenseHeads[3],
        qty: 1,
        rate: 10325,
        exchangeRate: 1,
        amount: 10325
      }
    ],
    subtotal: 10325,
    cgst: 0,
    sgst: 0,
    igst: 0,
    total: 10325,
    status: 'Pending',
    createdAt: '2024-01-20'
  }
];

export const companyDetails = {
  name: 'BROKER XPRESS AND LOGISTICS',
  address: 'OFFICE NO 105, 1ST FLOOR, PLOT NO.19, GOPAL NAGAR, BAROI ROAD, MUNDRA, KACHCHH, GUJARAT - (370421)',
  gstin: '24EQMPK2465R1Z2',
  email: 'brokerxpressandlogistics@gmail.com',
  state: 'Gujarat'
};

export const bankDetails = {
  bankName: 'STATE BANK OF INDIA',
  accountName: 'BROKER XPRESS AND LOGISTICS',
  accountNumber: '42339205026',
  ifscCode: 'SBIN0060356'
};

export const termsAndConditions = [
  'Interest @18% will be charged if payment is not made within due date.',
  'Our risk and responsibility cease as soon as the goods leave our premises.',
  'Subject to Mundra Jurisdiction only. E.&O.E'
];

// Helper functions
export const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    return false;
  }
};

export const getFromLocalStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return defaultValue;
  }
};

export const calculateGST = (amount, gstRate, customerState, companyState, isAlwaysIGST = false) => {
  const taxableAmount = parseFloat(amount);
  const rate = parseFloat(gstRate);
  
  if (rate === 0) {
    return { cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
  }
  
  const totalTax = (taxableAmount * rate) / 100;
  
  // If isAlwaysIGST is true (e.g., Import Ocean Freight), always apply IGST
  if (isAlwaysIGST) {
    return {
      cgst: 0,
      sgst: 0,
      igst: totalTax,
      totalTax
    };
  }
  
  // If same state, split into CGST and SGST
  if (customerState === companyState) {
    return {
      cgst: totalTax / 2,
      sgst: totalTax / 2,
      igst: 0,
      totalTax
    };
  } else {
    // If different state, IGST
    return {
      cgst: 0,
      sgst: 0,
      igst: totalTax,
      totalTax
    };
  }
};
