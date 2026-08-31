// Apps Script Web App — puente entre el frontend y dos hojas: "Menu" y "Orders".
// Deploy: Extensiones > Apps Script > pegar este código > Implementar > Aplicación web
//   Ejecutar como: Yo | Quién tiene acceso: Cualquiera

const MENU_SHEET = 'Menu';
const ORDERS_SHEET = 'Orders';

// Menu!A:D = id | name | description | price
function doGet() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(MENU_SHEET);
  const rows = sheet.getDataRange().getValues();
  const [header, ...data] = rows;
  const items = data
    .filter(r => r[0] !== '')
    .map(r => ({
      id: String(r[0]),
      name: r[1],
      description: r[2],
      price: Number(r[3]),
    }));
  return ContentService.createTextOutput(JSON.stringify(items))
    .setMimeType(ContentService.MimeType.JSON);
}

// Orders!A:E = timestamp | name | email | items(JSON) | total
function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActive().getSheetByName(ORDERS_SHEET);
  sheet.appendRow([
    body.timestamp || new Date().toISOString(),
    body.name || '',
    body.email || '',
    JSON.stringify(body.items || []),
    body.total || 0,
  ]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
