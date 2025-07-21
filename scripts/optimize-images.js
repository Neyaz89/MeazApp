
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function optimizeImages() {
  const assetsDir = './assets/images';
  
  if (!fs.existsSync(assetsDir)) {
    console.log('No assets/images directory found');
    return;
  }

  const files = fs.readdirSync(assetsDir);
  
  for (const file of files) {
    if (file.match(/\.(png|jpg|jpeg)$/i)) {
      const filePath = path.join(assetsDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.size > 500 * 1024) { // If larger than 500KB
        console.log(`Optimizing ${file} (${Math.round(stats.size / 1024)}KB)`);
        
        const optimizedPath = path.join(assetsDir, `optimized_${file}`);
        
        await sharp(filePath)
          .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
          .png({ quality: 80, compressionLevel: 9 })
          .toFile(optimizedPath);
        
        // Replace original with optimized
        fs.renameSync(optimizedPath, filePath);
        
        const newStats = fs.statSync(filePath);
        console.log(`✅ ${file} optimized: ${Math.round(stats.size / 1024)}KB → ${Math.round(newStats.size / 1024)}KB`);
      }
    }
  }
}

optimizeImages().catch(console.error);
