const { Business } = require('../models');
const fs = require('fs');
const path = require('path');

// Ruta de la APK real compilada
const REAL_APK_PATH = path.join(__dirname, '../../uploads/kdice-app.apk');

/**
 * Generar/preparar APK para un negocio específico
 */
exports.generateAPK = async (req, res) => {
  try {
    const { businessId, businessSlug, businessName } = req.body;

    const business = await Business.findByPk(businessId);
    if (!business) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    if (business.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para descargar esta APK' });
    }

    const apkExists = fs.existsSync(REAL_APK_PATH);
    const downloadUrl = `/api/apk/download/${business.slug}/android`;

    console.log(`[APK] Solicitud de APK para negocio: ${business.name} (${business.slug})`);

    res.json({
      success: true,
      message: apkExists ? 'APK lista para descargar' : 'APK en preparación',
      downloadUrl,
      businessSlug: business.slug,
      businessName: business.name,
      apkReady: apkExists,
      instructions: {
        android: 'Descarga el APK e instálalo en tu dispositivo Android. Asegúrate de habilitar "Fuentes desconocidas" en Ajustes > Seguridad.',
        ios: 'Para iOS, contacta a soporte para distribución en App Store o TestFlight.'
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.generateIPA = async (req, res) => {
  try {
    const { businessId } = req.body;
    const business = await Business.findByPk(businessId);
    if (!business) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }
    if (business.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }
    res.json({
      success: true,
      message: 'Para iOS, contacta a soporte para distribución en App Store o TestFlight.',
      businessSlug: business.slug,
      businessName: business.name,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/**
 * Descargar la APK real de KDice
 * La APK es universal: el usuario ingresa su negocio al hacer login
 */
exports.downloadAPK = async (req, res) => {
  try {
    const { slug } = req.params;

    // Verificar que el negocio existe
    const business = await Business.findOne({ where: { slug } });
    if (!business) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    // Verificar que la APK real existe
    if (fs.existsSync(REAL_APK_PATH)) {
      const fileName = `kdice-${slug}.apk`;
      console.log(`[APK] Descarga de APK para negocio: ${business.name} (${slug})`);
      
      // Configurar headers para descarga
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', fs.statSync(REAL_APK_PATH).size);
      
      // Stream del archivo
      const fileStream = fs.createReadStream(REAL_APK_PATH);
      fileStream.pipe(res);
    } else {
      res.status(503).json({ 
        error: 'APK no disponible en este momento. Contacta a soporte.',
        message: 'La APK está siendo preparada. Intenta de nuevo en unos minutos.'
      });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/**
 * Descargar IPA (iOS) - no disponible en esta versión
 */
exports.downloadIPA = async (req, res) => {
  res.status(503).json({ 
    error: 'La versión iOS no está disponible actualmente.',
    message: 'Contacta a soporte para distribución en App Store o TestFlight.'
  });
};

/**
 * Obtener estado de la APK
 */
exports.getAPKStatus = async (req, res) => {
  try {
    const { businessId } = req.params;

    const business = await Business.findByPk(businessId);
    if (!business) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    if (business.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    const apkExists = fs.existsSync(REAL_APK_PATH);
    const apkStats = apkExists ? fs.statSync(REAL_APK_PATH) : null;

    res.json({
      businessId,
      businessSlug: business.slug,
      businessName: business.name,
      status: apkExists ? 'ready' : 'unavailable',
      apkReady: apkExists,
      apkSize: apkStats ? `${(apkStats.size / 1024 / 1024).toFixed(1)} MB` : null,
      lastGenerated: apkStats ? apkStats.mtime : null,
      apkUrl: `/api/apk/download/${business.slug}/android`,
      instructions: {
        android: [
          '1. Descarga el archivo APK',
          '2. En tu Android, ve a Ajustes > Seguridad',
          '3. Habilita "Fuentes desconocidas" o "Instalar apps desconocidas"',
          '4. Abre el archivo APK descargado',
          '5. Toca "Instalar" y espera',
          '6. Abre KDice e inicia sesión con tu cuenta'
        ]
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
