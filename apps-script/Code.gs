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
  return jsonResponse(items);
}

// Orders!A:E = timestamp | name | email | items(JSON) | total
function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ ok: false, error: 'Payload inválido' });
  }

  if (typeof body.name !== 'string' || body.name.trim() === '') {
    return jsonResponse({ ok: false, error: 'Falta el nombre del cliente' });
  }
  if (typeof body.email !== 'string' || body.email.trim() === '') {
    return jsonResponse({ ok: false, error: 'Falta el email del cliente' });
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return jsonResponse({ ok: false, error: 'El carrito está vacío' });
  }
  if (typeof body.total !== 'number' || body.total < 0) {
    return jsonResponse({ ok: false, error: 'Total inválido' });
  }

  const sheet = SpreadsheetApp.getActive().getSheetByName(ORDERS_SHEET);
  sheet.appendRow([
    body.timestamp || new Date().toISOString(),
    body.name,
    body.email,
    JSON.stringify(body.items),
    body.total,
  ]);
  return jsonResponse({ ok: true });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
