export type ModelloCatalogo = { make: string; model: string; reliability: number; price: number; alternatives: string[] };

export const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const marche = ['Alfa Romeo','Audi','BMW','Citroen','Cupra','Dacia','Fiat','Ford','Honda','Hyundai','Jeep','Kia','Lancia','Mazda','Mercedes-Benz','Mini','Nissan','Opel','Peugeot','Renault','Seat','Skoda','Suzuki','Toyota','Volkswagen','Volvo'];
const nomi = ['Panda','500','Ypsilon','Clio','Captur','208','308','Corsa','Astra','Fiesta','Focus','Puma','Polo','Golf','T-Roc','Yaris','Corolla','C-HR','Qashqai','Juke','Sportage','Tucson','Duster','Civic','Mazda 3','CX-30','Serie 1','Serie 3','A3','A4','Classe A','Classe C','Giulia','Tonale','Leon','Ibiza','Octavia','Kamiq','Swift','Vitara','XC40','XC60'];

export const catalogo: ModelloCatalogo[] = Array.from({ length: 4225 }, (_, i) => {
  const make = marche[Math.floor(i / 65) % marche.length];
  const model = nomi[i % nomi.length] + (i >= nomi.length ? ` ${Math.floor(i / nomi.length) + 1}` : '');
  return { make, model, reliability: 5 + (i % 5), price: 8500 + (i % 28) * 1100, alternatives: [nomi[(i + 1) % nomi.length], nomi[(i + 7) % nomi.length]] };
});

const modelliCanonici: Record<string, string> = { Fiat: 'Panda', Volkswagen: 'Golf', Toyota: 'Yaris', Ford: 'Focus', Peugeot: '208' };
Object.entries(modelliCanonici).forEach(([make, model]) => { const row = catalogo.find(x => x.make === make); if (row) row.model = model; });

export const modelliPopolari = catalogo.filter((_, i) => i % 157 === 0).slice(0, 12);
