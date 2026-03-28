const { Business } = require('../models');
const fs = require('fs');
const path = require('path');

// Ruta de la APK real compilada (se generará con el nombre del negocio)
const getApkPath = (businessSlug) => path.join(__dirname, `../../uploads/${businessSlug.toLowerCase()}-app.apk`);

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

    const apkPath = getApkPath(businessSlug);
    const apkExists = fs.existsSync(apkPath);
    const downloadUrl = `/api/apk/download/${businessSlug}/android`;

    console.log(`[APK] Solicitud de APK para negocio: ${businessName} (${businessSlug})`);
    console.log(`[APK] Ruta del archivo: ${apkPath}`);
    console.log(`[APK] Existe: ${apkExists}`);

    res.json({
      success: true,
      message: apkExists ? 'APK lista para descargar' : 'APK en preparación',
      downloadUrl,
      businessSlug,
      businessName,
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
 * Verificar si hay una versión más reciente de la APK
 */
exports.checkForUpdate = async (req, res) => {
  try {
    const { slug } = req.params;

    const business = await Business.findOne({ where: { slug } });
    if (!business) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    const apkPath = getApkPath(slug);
    const apkExists = fs.existsSync(apkPath);
    
    if (!apkExists) {
      return res.json({
        hasUpdate: false,
        message: 'No hay APK disponible',
        currentVersion: null,
        latestVersion: null
      });
    }

    // Obtener información del archivo actual
    const apkStats = fs.statSync(apkPath);
    const currentVersion = {
      hash: require('crypto').createHash('md5').update(fs.readFileSync(apkPath)).digest('hex'),
      size: apkStats.size,
      lastModified: apkStats.mtime.toISOString(),
      fileName: `${slug.toLowerCase()}-app.apk`
    };

    // Simular versión del servidor (en una app real vendría de una BD)
    const latestVersion = {
      version: '1.0.1',
      releaseDate: new Date().toISOString(),
      changes: [
        'Mejoras en el sistema de notificaciones',
        'Optimización del rendimiento',
        'Corrección de bugs menores'
      ]
    };

    // Comparar versiones (simulado - en producción sería con BD)
    const hasUpdate = false; // Siempre false por ahora, o podrías comparar hashes

    res.json({
      hasUpdate,
      currentVersion,
      latestVersion,
      apkExists: true,
      downloadUrl: `/api/apk/download/${slug}/android`,
      message: hasUpdate 
        ? 'Hay una nueva versión disponible' 
        : 'Tienes la versión más reciente'
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

    const business = await Business.findOne({ where: { slug } });
    if (!business) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    const apkPath = getApkPath(slug);
    
    // Verificar que la APK existe y obtener su metadata
    if (!fs.existsSync(apkPath)) {
      return res.status(404).json({ 
        error: 'APK no disponible',
        message: 'La APK para este negocio no está disponible. Contacta a soporte.'
      });
    }

    // Obtener información del archivo para control de versiones
    const apkStats = fs.statSync(apkPath);
    const fileName = `${slug.toLowerCase()}-app.apk`;
    const fileHash = require('crypto').createHash('md5').update(fs.readFileSync(apkPath)).digest('hex');
    const lastModified = apkStats.mtime.toISOString();
    
    console.log(`[APK] Descarga de APK para negocio: ${business.name} (${slug})`);
    console.log(`[APK] Archivo: ${fileName}`);
    console.log(`[APK] Tamaño: ${(apkStats.size / 1024 / 1024).toFixed(1)} MB`);
    console.log(`[APK] Última modificación: ${lastModified}`);
    console.log(`[APK] Hash: ${fileHash}`);
    
    // Configurar headers para descarga con control de caché
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', apkStats.size);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('ETag', `"${fileHash}"`);
    res.setHeader('Last-Modified', lastModified);
    
    // Stream del archivo
    const fileStream = fs.createReadStream(apkPath);
    fileStream.pipe(res);
    
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

    const apkPath = getApkPath(business.slug);
    const apkExists = fs.existsSync(apkPath);
    const apkStats = apkExists ? fs.statSync(apkPath) : null;

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
