const slugify = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const makes = ['Alfa Romeo','Audi','BMW','Citroen','Cupra','Dacia','Fiat','Ford','Honda','Hyundai','Jeep','Kia','Lancia','Mazda','Mercedes-Benz','Mini','Nissan','Opel','Peugeot','Renault','Seat','Skoda','Suzuki','Toyota','Volkswagen','Volvo'];
const names = ['Panda','500','Ypsilon','Clio','Captur','208','308','Corsa','Astra','Fiesta','Focus','Puma','Polo','Golf','T-Roc','Yaris','Corolla','C-HR','Qashqai','Juke','Sportage','Tucson','Duster','Civic','Mazda 3','CX-30','Serie 1','Serie 3','A3','A4','Classe A','Classe C','Giulia','Tonale','Leon','Ibiza','Octavia','Kamiq','Swift','Vitara','XC40','XC60'];
const catalogo = Array.from({ length: 4225 }, (_, i) => { const make = makes[Math.floor(i / 65) % makes.length]; const model = names[i % names.length] + (i >= names.length ? ` ${Math.floor(i / names.length) + 1}` : ''); return { make, model, reliability: 5 + i % 5, price: 8500 + i % 28 * 1100, alternatives: [names[(i + 1) % names.length], names[(i + 7) % names.length]] }; });
const canonicalModels = { Fiat: 'Panda', Volkswagen: 'Golf', Toyota: 'Yaris', Ford: 'Focus', Peugeot: '208' };
Object.entries(canonicalModels).forEach(([make, model]) => { const row = catalogo.find(x => x.make === make); row.model = model; });
const modelliPopolari = catalogo.filter((_, i) => i % 157 === 0).slice(0, 12);
module.exports = { slugify, catalogo, modelliPopolari, makes };
