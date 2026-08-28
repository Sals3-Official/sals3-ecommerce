export const CHECKOUT_ALLOWED_COUNTRIES = ['AU', 'PH', 'FJ'] as const;

export type CheckoutCountry = (typeof CHECKOUT_ALLOWED_COUNTRIES)[number];

/**
 * Countries whose second address level is towns rather than cities, and whose
 * buyers may live outside every entry on the list.
 *
 * Fiji is the case: the divisions hold 25 towns between them, but deliveries
 * also reach villages and outer islands that no list of towns will ever carry.
 * The select still holds the towns — a typed city was never read by the freight
 * quote and only ever reached the courier as a string, so the list buys clean,
 * consistent data the same way Australia and the Philippines already do. The
 * hint is what covers the gap: the nearest town goes here, the village name
 * goes on the address lines, where the courier actually reads it.
 */
const CHECKOUT_TOWN_LIST_COUNTRIES = ['FJ'] as const;
const CHECKOUT_OPTIONAL_POSTAL_CODE_COUNTRIES = ['FJ'] as const;

export const CHECKOUT_COUNTRY_DETAILS = {
  PH: {
    label: 'Philippines',
    phonePrefix: '+639',
    regions: {
      'National Capital Region (NCR)': [
        'Caloocan',
        'Las Pi\u00f1as',
        'Makati',
        'Malabon',
        'Mandaluyong',
        'Manila',
        'Marikina',
        'Muntinlupa',
        'Navotas',
        'Para\u00f1aque',
        'Pasay',
        'Pasig',
        'Quezon City',
        'San Juan',
        'Taguig',
        'Valenzuela',
      ],
      'Cordillera Administrative Region (CAR)': ['Baguio', 'Tabuk'],
      'Ilocos Region (Region I)': [
        'Alaminos',
        'Batac',
        'Candon',
        'Dagupan',
        'Laoag',
        'San Carlos',
        'San Fernando',
        'Urdaneta',
        'Vigan',
      ],
      'Cagayan Valley (Region II)': [
        'Cauayan',
        'Ilagan',
        'Santiago',
        'Tuguegarao',
      ],
      'Central Luzon (Region III)': [
        'Angeles',
        'Balanga',
        'Baliuag',
        'Cabanatuan',
        'Gapan',
        'Mabalacat',
        'Malolos',
        'Meycauayan',
        'Olongapo',
        'Palayan',
        'San Fernando',
        'San Jose',
        'San Jose del Monte',
        'Science City of Mu\u00f1oz',
        'Tarlac City',
      ],
      'CALABARZON (Region IV-A)': [
        'Antipolo',
        'Bacoor',
        'Batangas City',
        'Bi\u00f1an',
        'Cabuyao',
        'Calaca',
        'Calamba',
        'Carmona',
        'Cavite City',
        'Dasmari\u00f1as',
        'General Trias',
        'Imus',
        'Lipa',
        'Lucena',
        'San Pablo',
        'San Pedro',
        'Santa Rosa',
        'Santo Tomas',
        'Tagaytay',
        'Tanauan',
        'Tayabas',
        'Trece Martires',
      ],
      'MIMAROPA (Region IV-B)': ['Calapan', 'Puerto Princesa'],
      'Bicol Region (Region V)': [
        'Iriga',
        'Legazpi',
        'Ligao',
        'Masbate City',
        'Naga',
        'Sorsogon City',
        'Tabaco',
      ],
      'Western Visayas (Region VI)': [
        'Bacolod',
        'Bago',
        'Cadiz',
        'Escalante',
        'Himamaylan',
        'Iloilo City',
        'Kabankalan',
        'La Carlota',
        'Passi',
        'Roxas',
        'Sagay',
        'San Carlos',
        'Silay',
        'Sipalay',
        'Talisay',
        'Victorias',
      ],
      'Central Visayas (Region VII)': [
        'Bais',
        'Bayawan',
        'Bogo',
        'Canlaon',
        'Carcar',
        'Cebu City',
        'Danao',
        'Dumaguete',
        'Guihulngan',
        'Lapu-Lapu',
        'Mandaue',
        'Naga',
        'Tagbilaran',
        'Talisay',
        'Tanjay',
        'Toledo',
      ],
      'Eastern Visayas (Region VIII)': [
        'Baybay',
        'Borongan',
        'Calbayog',
        'Catbalogan',
        'Maasin',
        'Ormoc',
        'Tacloban',
      ],
      'Zamboanga Peninsula (Region IX)': [
        'Dapitan',
        'Dipolog',
        'Isabela',
        'Pagadian',
        'Zamboanga City',
      ],
      'Northern Mindanao (Region X)': [
        'Cagayan de Oro',
        'El Salvador',
        'Gingoog',
        'Iligan',
        'Malaybalay',
        'Oroquieta',
        'Ozamiz',
        'Tangub',
        'Valencia',
      ],
      'Davao Region (Region XI)': [
        'Davao City',
        'Digos',
        'Mati',
        'Panabo',
        'Island Garden City of Samal',
        'Tagum',
      ],
      'SOCCSKSARGEN (Region XII)': [
        'Cotabato City',
        'General Santos',
        'Kidapawan',
        'Koronadal',
        'Tacurong',
      ],
      'Caraga (Region XIII)': [
        'Bayugan',
        'Bislig',
        'Butuan',
        'Cabadbaran',
        'Surigao City',
        'Tandag',
      ],
      'Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)': [
        'Lamitan',
        'Marawi',
      ],
    },
  },
  AU: {
    label: 'Australia',
    phonePrefix: '+614',
    regions: {
      'New South Wales': [
        'Sydney',
        'Albury',
        'Armidale',
        'Bathurst',
        'Blue Mountains',
        'Broken Hill',
        'Cessnock',
        'Coffs Harbour',
        'Dubbo',
        'Gosford',
        'Goulburn',
        'Grafton',
        'Griffith',
        'Lake Macquarie',
        'Lismore',
        'Lithgow',
        'Maitland',
        'Newcastle',
        'Orange',
        'Parramatta',
        'Penrith',
        'Port Macquarie',
        'Queanbeyan',
        'Shoalhaven',
        'Tamworth',
        'Tweed Heads',
        'Wagga Wagga',
        'Wollongong',
        'Wyong',
      ],
      Victoria: [
        'Melbourne',
        'Ararat',
        'Bairnsdale',
        'Ballarat',
        'Benalla',
        'Bendigo',
        'Colac',
        'Dandenong',
        'Echuca',
        'Frankston',
        'Geelong',
        'Hamilton',
        'Horsham',
        'Melton',
        'Mildura',
        'Moe',
        'Morwell',
        'Pakenham',
        'Portland',
        'Sale',
        'Shepparton',
        'Sunbury',
        'Swan Hill',
        'Traralgon',
        'Wangaratta',
        'Warrnambool',
        'Wodonga',
      ],
      Queensland: [
        'Brisbane',
        'Bundaberg',
        'Cairns',
        'Caloundra',
        'Gladstone',
        'Gold Coast',
        'Gympie',
        'Hervey Bay',
        'Ipswich',
        'Logan City',
        'Mackay',
        'Maryborough',
        'Mount Isa',
        'Redcliffe',
        'Rockhampton',
        'Sunshine Coast',
        'Toowoomba',
        'Townsville',
        'Warwick',
      ],
      'Western Australia': [
        'Perth',
        'Albany',
        'Broome',
        'Bunbury',
        'Busselton',
        'Fremantle',
        'Geraldton',
        'Joondalup',
        'Kalgoorlie',
        'Karratha',
        'Mandurah',
        'Port Hedland',
        'Rockingham',
      ],
      'South Australia': [
        'Adelaide',
        'Gawler',
        'Mount Barker',
        'Mount Gambier',
        'Murray Bridge',
        'Port Adelaide',
        'Port Augusta',
        'Port Lincoln',
        'Port Pirie',
        'Victor Harbor',
        'Whyalla',
      ],
      Tasmania: [
        'Hobart',
        'Burnie',
        'Clarence',
        'Devonport',
        'Glenorchy',
        'Launceston',
      ],
      'Australian Capital Territory': ['Canberra'],
      'Northern Territory': [
        'Darwin',
        'Alice Springs',
        'Katherine',
        'Palmerston',
      ],
    },
  },
  FJ: {
    label: 'Fiji',
    phonePrefix: '+679',
    regions: {
      'Central Division': [
        'Korovou',
        'Lami',
        'Nasinu',
        'Nausori',
        'Navua',
        'Pacific Harbour',
        'Suva',
      ],
      'Eastern Division': ['Levuka'],
      'Northern Division': [
        'Labasa',
        'Matei',
        'Nabouwalu',
        'Naqara',
        'Savusavu',
        'Seaqaqa',
      ],
      Rotuma: ['Ahau'],
      'Western Division': [
        'Ba',
        'Lautoka',
        'Nadi',
        'Rakiraki',
        'Sigatoka',
        'Tavua',
        'Vatukoula',
      ],
    },
  },
} as const;

export function isCheckoutCountry(value: string): value is CheckoutCountry {
  return CHECKOUT_ALLOWED_COUNTRIES.includes(value as CheckoutCountry);
}

export function checkoutRegionOptions(country: CheckoutCountry): string[] {
  return Object.keys(CHECKOUT_COUNTRY_DETAILS[country].regions);
}

export function checkoutCityOptions(
  country: CheckoutCountry,
  region: string,
): string[] {
  return [
    ...((
      CHECKOUT_COUNTRY_DETAILS[country].regions as Record<
        string,
        readonly string[]
      >
    )[region] ?? []),
  ];
}

function checkoutUsesTownList(country: CheckoutCountry): boolean {
  return (CHECKOUT_TOWN_LIST_COUNTRIES as readonly CheckoutCountry[]).includes(
    country,
  );
}

export function checkoutCityLabel(country: CheckoutCountry): string {
  return checkoutUsesTownList(country) ? 'City or town' : 'City';
}

export function checkoutCityHint(country: CheckoutCountry): string | undefined {
  return checkoutUsesTownList(country)
    ? 'Not listed? Choose the nearest town and put your village or island on address line 1.'
    : undefined;
}

export function checkoutRequiresPostalCode(country: CheckoutCountry): boolean {
  return !(
    CHECKOUT_OPTIONAL_POSTAL_CODE_COUNTRIES as readonly CheckoutCountry[]
  ).includes(country);
}
