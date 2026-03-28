const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

/**
 * Script para generar APK personalizada para un negocio
 * Uso: node scripts/generate-apk.js <businessSlug> <businessName>
 */

const businessSlug = process.argv[2];
const businessName = process.argv[3] || 'Negocio';

if (!businessSlug) {
  console.error('❌ Error: Debes proporcionar el businessSlug');
  console.log('Uso: node scripts/generate-apk.js <businessSlug> <businessName>');
  process.exit(1);
}

console.log(`🏢 Generando APK para: ${businessName} (${businessSlug})`);

// 1. Construir el frontend
console.log('📦 Construyendo frontend...');
exec('npm run build', { cwd: '../frontend' }, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error construyendo frontend:', error);
    process.exit(1);
  }
  
  console.log('✅ Frontend construido');
  
  // 2. Generar APK con Capacitor
  console.log('📱 Generando APK...');
  exec('npx cap build android', { cwd: '../frontend' }, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Error generando APK:', error);
      process.exit(1);
    }
    
    console.log('✅ APK generada');
    
    // 3. Copiar APK con nombre personalizado
    const sourceApk = path.join('../frontend/android/app/build/outputs/apk/debug/app-debug.apk');
    const targetApk = path.join(__dirname, '../uploads', `${businessSlug.toLowerCase()}-app.apk`);
    
    if (fs.existsSync(sourceApk)) {
      console.log(`📋 Copiando APK a: ${targetApk}`);
      fs.copyFileSync(sourceApk, targetApk);
      console.log('✅ APK copiada exitosamente');
      console.log(`🎯 APK personalizada lista: ${businessSlug.toLowerCase()}-app.apk`);
      console.log(`📂 Ubicación: ${targetApk}`);
    } else {
      console.error('❌ No se encontró el APK generada');
      process.exit(1);
    }
  });
});
