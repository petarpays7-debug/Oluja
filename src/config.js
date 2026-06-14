export const SITE_CONFIG = {
  company: {
    brand: 'OLUJA',
    subtitle: 'DIGITALNI STUDIO',
    legalName: 'OLUJA, obrt za trgovinu na malo i usluge, vl. Petar Husar',
    email: 'oluja.store@gmail.com',
    phone: '',
    address: 'Savska ulica 14, Bilje, Hrvatska',
    oib: '54257965079',
    registrationNumber: '99067404',
    founded: '2025',
    activity:
      '47.910 – Uslužne djelatnosti posredovanja u nespecijaliziranoj trgovini na malo'
  },

  projects: {
    doors: {
      title: 'Doors Interijeri',
      url: 'https://doorsinterijeri-bgb.pages.dev'
    },

    bimmer: {
      title: 'Auto Centar Bimmer',
      url: 'https://auto-centar-bimmer.pages.dev'
    }
  }
};

// Lista projekata u redoslijedu prikaza. Novi projekt (npr. Nemo Transporti)
// dodaje se ovdje + screenshotovi u src/assets/projects/. Detalji u README.
export const PROJECTS = [
  {
    id: 'doors',
    index: '01',
    title: 'DOORS INTERIJERI',
    category: 'INTERIJERI · VRATA · POSLOVNA PREZENTACIJA',
    description:
      'Moderan i topao digitalni identitet za tvrtku specijaliziranu za sobna i garažna vrata.',
    detail:
      'Projekt je usmjeren na kvalitetan prikaz proizvoda, povjerenje kupaca i jednostavan kontakt s tvrtkom.',
    url: SITE_CONFIG.projects.doors.url,
    capabilities: ['Web dizajn', 'Razvoj', 'Prikaz proizvoda', 'Responzivnost'],
    solved: ['Prikaz proizvoda', 'Izgradnja povjerenja', 'Jednostavan kontakt'],
    cursor: 'doors',
    assets: {
      desktop: 'doors-desktop',
      wide: 'doors-wide',
      mobile: 'doors-mobile',
      detail: 'doors-detail',
      full: 'doors-full'
    }
  },
  {
    id: 'bimmer',
    index: '02',
    title: 'AUTO CENTAR BIMMER',
    category: 'AUTOMOBILI · PREMIUM PRODAJA · BMW SPECIJALIST',
    description:
      'Dinamična i premium web stranica za prodaju pažljivo odabranih BMW vozila.',
    detail:
      'Vizualni identitet kombinira tamnu premium estetiku, velike fotografije vozila i kontroliran osjećaj brzine.',
    url: SITE_CONFIG.projects.bimmer.url,
    capabilities: ['Web dizajn', 'Razvoj', 'Animacije', 'Galerija vozila'],
    solved: ['Premium percepcija', 'Prikaz vozila', 'Performanse i brzina'],
    cursor: 'bimmer',
    assets: {
      desktop: 'bimmer-desktop',
      wide: 'bimmer-wide',
      mobile: 'bimmer-mobile',
      detail: 'bimmer-detail',
      full: 'bimmer-full'
    }
  }
];

export const NAV_LINKS = [
  { label: 'Projekti', target: '#projekti', n: '01' },
  { label: 'Usluge', target: '#usluge', n: '02' },
  { label: 'Proces', target: '#proces', n: '03' },
  { label: 'Studio', target: '#studio', n: '04' },
  { label: 'Kontakt', target: '#kontakt', n: '05' }
];
