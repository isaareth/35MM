/**
 * Envío de correos de 35mm desde una cuenta de Gmail, sin servicios de pago.
 *
 * El backend (Railway) le manda cada mensaje a este script por HTTPS y el
 * script lo envía con la cuenta de Gmail que lo despliega. Gmail normal permite
 * unos 100 correos al día por este medio; cuando se agota, el script responde
 * { ok: false, code: "quota" } y el panel deja el resto pendiente para mañana.
 *
 * Configuración (una sola vez):
 *  1. script.google.com > Nuevo proyecto (con la cuenta de Gmail que enviará).
 *  2. Pega este archivo en Code.gs.
 *  3. Configuración del proyecto (engranaje) > Propiedades de la secuencia de
 *     comandos > Agregar:
 *       WEBHOOK_SECRET = una clave larga inventada (la misma va en Railway)
 *       REPLY_TO       = (opcional) correo al que llegan las respuestas
 *  4. En el editor elige la función "autorizar" y pulsa Ejecutar; acepta los
 *     permisos de Google (solo pide enviar correos).
 *  5. Implementar > Nueva implementación > tipo "Aplicación web":
 *       Ejecutar como: Yo        Quién tiene acceso: Cualquier persona
 *     Copia la URL que termina en /exec.
 *  6. En Railway: EMAIL_PROVIDER=webhook, EMAIL_WEBHOOK_URL=<esa URL>,
 *     EMAIL_WEBHOOK_SECRET=<la misma clave del paso 3>.
 *
 * Si cambias este código, hay que volver a implementar (Implementar >
 * Administrar implementaciones > editar > Nueva versión) para que la URL use
 * la versión nueva.
 */

const NOMBRE_REMITENTE = '35mm Festival de Cortos';
const MAX_ASUNTO = 250;
const MAX_HTML = 200000;

function respuesta_(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function doGet() {
  return respuesta_({ ok: true, servicio: 'correos-35mm' });
}

function doPost(e) {
  try {
    const props = PropertiesService.getScriptProperties();
    const clave = props.getProperty('WEBHOOK_SECRET');
    if (!clave) {
      return respuesta_({ ok: false, error: 'Falta configurar WEBHOOK_SECRET en el script.' });
    }

    let datos;
    try {
      datos = JSON.parse((e && e.postData && e.postData.contents) || '');
    } catch (err) {
      return respuesta_({ ok: false, error: 'El mensaje recibido no es JSON válido.' });
    }
    if (!datos || datos.secret !== clave) {
      return respuesta_({ ok: false, error: 'No autorizado.' });
    }

    const para = String(datos.to || '').trim();
    const asunto = String(datos.subject || '').trim();
    const texto = String(datos.text || '');
    let html = String(datos.html || '');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para)) {
      return respuesta_({ ok: false, error: 'Correo de destino no válido.' });
    }
    if (!asunto || asunto.length > MAX_ASUNTO) {
      return respuesta_({ ok: false, error: 'Asunto vacío o demasiado largo.' });
    }
    if (!texto && !html) {
      return respuesta_({ ok: false, error: 'El mensaje no tiene contenido.' });
    }
    if (html.length > MAX_HTML) {
      return respuesta_({ ok: false, error: 'El mensaje es demasiado grande.' });
    }

    const restantes = MailApp.getRemainingDailyQuota();
    if (restantes < 1) {
      return respuesta_({
        ok: false,
        code: 'quota',
        error: 'Se agotó el límite diario de correos de Gmail. Reintenta mañana.',
      });
    }

    const opciones = { name: NOMBRE_REMITENTE };
    const responderA = props.getProperty('REPLY_TO');
    if (responderA) opciones.replyTo = responderA;

    // El QR viaja dentro del correo (no como imagen remota), así se ve aunque
    // el lector de correo bloquee las imágenes externas.
    if (html && datos.qr_png_base64 && datos.qr_url && html.indexOf(datos.qr_url) !== -1) {
      const qr = Utilities.newBlob(Utilities.base64Decode(datos.qr_png_base64), 'image/png', 'qr.png');
      html = html.split(datos.qr_url).join('cid:codigoqr');
      opciones.inlineImages = { codigoqr: qr };
    }
    if (html) opciones.htmlBody = html;

    MailApp.sendEmail(para, asunto, texto, opciones);
    return respuesta_({ ok: true, restantes: restantes - 1 });
  } catch (err) {
    console.error(String(err));
    return respuesta_({ ok: false, error: 'Error al enviar: ' + String((err && err.message) || err) });
  }
}

/** Ejecútala una vez desde el editor: Google pide aquí el permiso de enviar correos. */
function autorizar() {
  console.log('Correos que aún puede enviar hoy: ' + MailApp.getRemainingDailyQuota());
}

/** Opcional: te manda un correo de prueba a ti mismo, sin pasar por el backend. */
function probar() {
  const yo = Session.getActiveUser().getEmail();
  MailApp.sendEmail(yo, 'Prueba del script de 35mm', 'Si lo ves, el script puede enviar correos.', {
    name: NOMBRE_REMITENTE,
  });
  console.log('Enviado a ' + yo);
}
