export interface PaymentPartner {
  id: string;
  name: string;
  logo: string;
  invert?: boolean;
}

export const PAYMENT_PARTNERS: PaymentPartner[] = [
  {
    id: "binance",
    name: "Binance",
    logo: "https://upload.wikimedia.org/wikipedia/commons/f/fc/Binance-coin-bnb-logo.png",
    invert: false
  },
  {
    id: "bitcoin",
    name: "Bitcoin",
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/46/Bitcoin.svg",
    invert: false
  },
  {
    id: "bkash",
    name: "bKash",
    logo: "https://freelogopng.com/images/all_img/1656234745bkash-app-logo-png.png",
    invert: false
  },
  {
    id: "nagad",
    name: "Nagad",
    logo: "https://freelogopng.com/images/all_img/1679248787Nagad-Logo.png",
    invert: false
  },
  {
    id: "payoneer",
    name: "Payoneer",
    logo: "https://www.vectorlogo.zone/logos/payoneer/payoneer-icon.svg",
    invert: false
  },
  {
    id: "paypal",
    name: "PayPal",
    logo: "https://www.vectorlogo.zone/logos/paypal/paypal-icon.svg",
    invert: false
  },
  {
    id: "tether",
    name: "USDT (Tether)",
    logo: "https://cryptologos.cc/logos/tether-usdt-logo.svg?v=035",
    invert: false
  },
  {
    id: "visa",
    name: "Visa",
    logo: "https://www.vectorlogo.zone/logos/visa/visa-icon.svg",
    invert: false
  },
  {
    id: "mastercard",
    name: "Mastercard",
    logo: "https://www.vectorlogo.zone/logos/mastercard/mastercard-icon.svg",
    invert: false
  }
];
