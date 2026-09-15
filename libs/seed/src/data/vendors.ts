/** Seed vendors + menus — real Cape Coast names (TripAdvisor), Ghanaian fare, GHS prices in pesewas. */

export interface SeedMenuItem {
  name: string;
  category: string;
  pricePesewas: number;
  prepTimeMin: number;
  unit?: string;
  stock?: number | null;
  prescriptionOnly?: boolean;
  modifiers?: string[];
}

export interface SeedVendor {
  name: string;
  vendorType: string;
  lat: number;
  lng: number;
  deliveryRadiusKm: number;
  acceptsCod: boolean;
  accepting: boolean;
  maxConcurrentOrders: number;
  hours: { open: string; close: string }[] | null; // null = 24/7
  menu: SeedMenuItem[];
}

export const SEED_VENDORS: SeedVendor[] = [
  {
    name: 'Lemon Lounge',
    vendorType: 'FOOD',
    lat: 5.116,
    lng: -1.252,
    deliveryRadiusKm: 8,
    acceptsCod: true,
    accepting: true,
    maxConcurrentOrders: 5,
    hours: [{ open: '08:00', close: '22:00' }],
    menu: [
      { name: 'Jollof Rice & Chicken', category: 'Rice', pricePesewas: 4500, prepTimeMin: 15 },
      { name: 'Fried Rice & Chicken', category: 'Rice', pricePesewas: 4800, prepTimeMin: 15 },
      { name: 'Banku & Grilled Tilapia', category: 'Local', pricePesewas: 5500, prepTimeMin: 20 },
      { name: 'Grilled Chicken & Chips', category: 'Grill', pricePesewas: 5000, prepTimeMin: 18 },
      { name: 'Garden Salad', category: 'Light', pricePesewas: 2500, prepTimeMin: 8 },
      { name: 'Mango Smoothie', category: 'Drinks', pricePesewas: 1500, prepTimeMin: 5 },
      { name: 'Fresh Orange Juice', category: 'Drinks', pricePesewas: 1200, prepTimeMin: 5 },
      { name: 'Kelewele (small)', category: 'Snacks', pricePesewas: 1000, prepTimeMin: 6 },
    ],
  },
  {
    name: 'Emperor Ital Joint',
    vendorType: 'FOOD',
    lat: 5.112,
    lng: -1.244,
    deliveryRadiusKm: 7,
    acceptsCod: true,
    accepting: true,
    maxConcurrentOrders: 4,
    hours: [{ open: '10:00', close: '21:00' }],
    menu: [
      { name: 'Waakye & Salad', category: 'Local', pricePesewas: 3000, prepTimeMin: 12 },
      { name: 'Red Red & Plantain', category: 'Local', pricePesewas: 2800, prepTimeMin: 12 },
      { name: 'Vegetable Fried Rice', category: 'Rice', pricePesewas: 3200, prepTimeMin: 14 },
      { name: 'Peanut Butter Smoothie', category: 'Drinks', pricePesewas: 1400, prepTimeMin: 5 },
      { name: 'Fruit Bowl', category: 'Light', pricePesewas: 2200, prepTimeMin: 7 },
    ],
  },
  {
    name: 'Zizibi Restaurant & Bar',
    vendorType: 'FOOD',
    lat: 5.104,
    lng: -1.238,
    deliveryRadiusKm: 8,
    acceptsCod: true,
    accepting: true,
    maxConcurrentOrders: 6,
    hours: [{ open: '11:00', close: '23:00' }],
    menu: [
      { name: 'Fufu & Light Soup', category: 'Local', pricePesewas: 4200, prepTimeMin: 18 },
      { name: 'Ampesi & Kontomire', category: 'Local', pricePesewas: 3800, prepTimeMin: 16 },
      { name: 'Jollof Rice & Beef', category: 'Rice', pricePesewas: 4500, prepTimeMin: 15 },
      { name: 'Grilled Prawns', category: 'Seafood', pricePesewas: 6000, prepTimeMin: 20 },
      { name: 'Fresh Tilapia (grilled)', category: 'Seafood', pricePesewas: 5500, prepTimeMin: 20 },
      { name: 'Star Beer (chilled)', category: 'Drinks', pricePesewas: 1500, prepTimeMin: 3 },
    ],
  },
  {
    name: 'Baobab House',
    vendorType: 'FOOD',
    lat: 5.121,
    lng: -1.257,
    deliveryRadiusKm: 7,
    acceptsCod: true,
    accepting: true,
    maxConcurrentOrders: 4,
    hours: [{ open: '09:00', close: '20:00' }],
    menu: [
      { name: 'Waakye & Egg', category: 'Local', pricePesewas: 3200, prepTimeMin: 12 },
      { name: 'Kenkey & Fried Fish', category: 'Local', pricePesewas: 4000, prepTimeMin: 15 },
      { name: 'Bread & Beans', category: 'Breakfast', pricePesewas: 1800, prepTimeMin: 6 },
      { name: 'Tea (Milo/Koko)', category: 'Drinks', pricePesewas: 800, prepTimeMin: 4 },
    ],
  },
  {
    name: 'New Life Café',
    vendorType: 'FOOD',
    lat: 5.126,
    lng: -1.261,
    deliveryRadiusKm: 7,
    acceptsCod: true,
    accepting: true,
    maxConcurrentOrders: 4,
    hours: [{ open: '07:00', close: '19:00' }],
    menu: [
      { name: 'Pancakes (3)', category: 'Breakfast', pricePesewas: 2200, prepTimeMin: 10 },
      { name: 'Omelette & Toast', category: 'Breakfast', pricePesewas: 2500, prepTimeMin: 10 },
      { name: 'Fried Rice & Sausage', category: 'Rice', pricePesewas: 4000, prepTimeMin: 15 },
      { name: 'Cappuccino', category: 'Drinks', pricePesewas: 1800, prepTimeMin: 5 },
      { name: 'Fruit Salad', category: 'Light', pricePesewas: 2000, prepTimeMin: 6 },
    ],
  },
  {
    name: 'Ancestral Flavours Coffee & Juices',
    vendorType: 'FOOD',
    lat: 5.108,
    lng: -1.249,
    deliveryRadiusKm: 6,
    acceptsCod: true,
    accepting: true,
    maxConcurrentOrders: 3,
    hours: [{ open: '08:00', close: '21:00' }],
    menu: [
      { name: 'Soobolo', category: 'Drinks', pricePesewas: 1000, prepTimeMin: 4 },
      { name: 'Bissap (Hibiscus) Juice', category: 'Drinks', pricePesewas: 1200, prepTimeMin: 4 },
      { name: 'Fresh Coconut Water', category: 'Drinks', pricePesewas: 1500, prepTimeMin: 4 },
      { name: 'African Coffee', category: 'Drinks', pricePesewas: 1600, prepTimeMin: 5 },
      { name: 'Peanut Butter & Banana Smoothie', category: 'Drinks', pricePesewas: 1800, prepTimeMin: 6 },
    ],
  },
  {
    name: "Baab's Veggie Fie",
    vendorType: 'FOOD',
    lat: 5.113,
    lng: -1.24,
    deliveryRadiusKm: 6,
    acceptsCod: true,
    accepting: true,
    maxConcurrentOrders: 3,
    hours: [{ open: '10:00', close: '20:00' }],
    menu: [
      { name: 'Veggie Bowl (seasonal)', category: 'Vegan', pricePesewas: 3500, prepTimeMin: 12 },
      { name: 'Veggie Burger', category: 'Vegan', pricePesewas: 3000, prepTimeMin: 12 },
      { name: 'Plantain Chips', category: 'Snacks', pricePesewas: 1000, prepTimeMin: 5 },
      { name: 'Mango & Banana Smoothie', category: 'Drinks', pricePesewas: 1700, prepTimeMin: 5 },
    ],
  },
  {
    name: 'Kokodo Restaurant',
    vendorType: 'FOOD',
    lat: 5.118,
    lng: -1.255,
    deliveryRadiusKm: 7,
    acceptsCod: true,
    accepting: true,
    maxConcurrentOrders: 4,
    hours: [{ open: '10:00', close: '22:00' }],
    menu: [
      { name: 'Fisherman Soup & Rice', category: 'Seafood', pricePesewas: 5200, prepTimeMin: 20 },
      { name: 'Octopus Stew', category: 'Seafood', pricePesewas: 6500, prepTimeMin: 22 },
      { name: 'Jollof Rice & Fish', category: 'Rice', pricePesewas: 4800, prepTimeMin: 16 },
      { name: 'Fried Plantain', category: 'Snacks', pricePesewas: 1200, prepTimeMin: 5 },
    ],
  },
  {
    name: 'Orange Beach Bar',
    vendorType: 'FOOD',
    lat: 5.1,
    lng: -1.23,
    deliveryRadiusKm: 8,
    acceptsCod: true,
    accepting: true,
    maxConcurrentOrders: 4,
    hours: [{ open: '12:00', close: '23:00' }],
    menu: [
      { name: 'Grilled Chicken & Chips', category: 'Grill', pricePesewas: 5200, prepTimeMin: 18 },
      { name: 'Beach Jollof', category: 'Rice', pricePesewas: 4500, prepTimeMin: 15 },
      { name: 'Coconut Shrimp', category: 'Seafood', pricePesewas: 5800, prepTimeMin: 18 },
      { name: 'Pineapple Juice', category: 'Drinks', pricePesewas: 1200, prepTimeMin: 4 },
      { name: 'Club Beer (chilled)', category: 'Drinks', pricePesewas: 1400, prepTimeMin: 3 },
    ],
  },
  {
    name: 'Akoma Kesse Fie Beach Bar & Restaurant',
    vendorType: 'FOOD',
    lat: 5.105,
    lng: -1.242,
    deliveryRadiusKm: 8,
    acceptsCod: true,
    accepting: true,
    maxConcurrentOrders: 4,
    hours: [{ open: '10:00', close: '22:00' }],
    menu: [
      { name: 'Banku & Pepper Soup', category: 'Local', pricePesewas: 4200, prepTimeMin: 18 },
      { name: 'Grilled Sea Bass', category: 'Seafood', pricePesewas: 6000, prepTimeMin: 20 },
      { name: 'Kelewele (large)', category: 'Snacks', pricePesewas: 1800, prepTimeMin: 7 },
      { name: 'Coconut Juice', category: 'Drinks', pricePesewas: 1400, prepTimeMin: 4 },
    ],
  },
];
