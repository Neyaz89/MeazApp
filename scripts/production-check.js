
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Running Comprehensive Production Readiness Check...\n');

// Production readiness checklist
const checks = {
  security: false,
  dependencies: false,
  typecheck: false,
  linting: false,
  build: false,
  configuration: false,
  performance: false
};

try {
  // 1. Check for security vulnerabilities
  console.log('🔒 Checking for security vulnerabilities...');
  try {
    execSync('npm audit', { stdio: 'pipe' });
    console.log('✅ No security vulnerabilities found');
    checks.security = true;
  } catch (error) {
    const output = error.stdout?.toString() || '';
    if (output.includes('found 0 vulnerabilities')) {
      console.log('✅ No security vulnerabilities found');
      checks.security = true;
    } else {
      console.log('⚠️ Security vulnerabilities found - running npm audit fix...');
      try {
        execSync('npm audit fix --force', { stdio: 'inherit' });
        checks.security = true;
      } catch (fixError) {
        console.log('❌ Could not fix all security vulnerabilities');
      }
    }
  }
  
  // 2. Check dependencies
  console.log('\n📦 Checking dependencies...');
  try {
    execSync('npm outdated', { stdio: 'pipe' });
    console.log('✅ All dependencies are up to date');
    checks.dependencies = true;
  } catch (error) {
    const output = error.stdout?.toString() || '';
    if (output.trim() === '') {
      console.log('✅ All dependencies are up to date');
      checks.dependencies = true;
    } else {
      console.log('⚠️ Some dependencies have newer versions available');
      console.log('Run "npm run update-deps" to update all dependencies');
      checks.dependencies = false;
    }
  }
  
  // 3. Type checking
  console.log('\n🎯 Running TypeScript type check...');
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    console.log('✅ TypeScript compilation successful');
    checks.typecheck = true;
  } catch (error) {
    console.log('❌ TypeScript errors found:');
    console.log(error.stdout?.toString() || error.message);
    checks.typecheck = false;
  }
  
  // 4. Linting
  console.log('\n🧹 Running ESLint...');
  try {
    execSync('npm run lint', { stdio: 'pipe' });
    console.log('✅ No linting errors found');
    checks.linting = true;
  } catch (error) {
    console.log('⚠️ Linting issues found - attempting to fix...');
    try {
      execSync('npm run lint:fix', { stdio: 'inherit' });
      checks.linting = true;
    } catch (fixError) {
      console.log('❌ Could not fix all linting issues');
      checks.linting = false;
    }
  }

  // 5. Build test
  console.log('\n🏗️ Testing Expo build...');
  try {
    execSync('npx expo export --platform web', { stdio: 'pipe' });
    console.log('✅ Expo build successful');
    checks.build = true;
  } catch (error) {
    console.log('❌ Build failed:');
    console.log(error.stdout?.toString() || error.message);
    checks.build = false;
  }

  // 6. Configuration checks
  console.log('\n⚙️ Checking configuration files...');
  const configFiles = [
    'app.json',
    'eas.json',
    'package.json',
    'tsconfig.json'
  ];
  
  let configComplete = true;
  configFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} found`);
    } else {
      console.log(`❌ ${file} missing`);
      configComplete = false;
    }
  });
  
  // Check app.json for essential fields
  if (fs.existsSync('app.json')) {
    const appConfig = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    const expo = appConfig.expo;
    
    if (expo?.name && expo?.slug && expo?.version) {
      console.log('✅ App metadata configured');
    } else {
      console.log('❌ Missing essential app metadata');
      configComplete = false;
    }
    
    if (expo?.ios?.bundleIdentifier && expo?.android?.package) {
      console.log('✅ Bundle identifiers configured');
    } else {
      console.log('❌ Missing bundle identifiers');
      configComplete = false;
    }
  }
  
  checks.configuration = configComplete;

  // 7. Performance checks
  console.log('\n⚡ Running performance checks...');
  const performanceIssues = [];
  
  // Check for large dependencies
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const depCount = Object.keys(packageJson.dependencies || {}).length;
    if (depCount > 50) {
      performanceIssues.push(`High dependency count: ${depCount}`);
    }
  } catch (error) {
    performanceIssues.push('Could not analyze dependencies');
  }
  
  // Check for unoptimized images
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif'];
  const checkImageSizes = (dir) => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir, { withFileTypes: true });
    files.forEach(file => {
      if (file.isDirectory()) {
        checkImageSizes(path.join(dir, file.name));
      } else if (imageExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
        const filePath = path.join(dir, file.name);
        const stats = fs.statSync(filePath);
        if (stats.size > 500 * 1024) { // 500KB
          performanceIssues.push(`Large image: ${filePath} (${Math.round(stats.size / 1024)}KB)`);
        }
      }
    });
  };
  
  checkImageSizes('assets');
  
  if (performanceIssues.length === 0) {
    console.log('✅ No performance issues detected');
    checks.performance = true;
  } else {
    console.log('⚠️ Performance issues found:');
    performanceIssues.forEach(issue => console.log(`   - ${issue}`));
    checks.performance = false;
  }

  // Summary
  console.log('\n📊 PRODUCTION READINESS SUMMARY');
  console.log('=====================================');
  
  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  
  Object.entries(checks).forEach(([check, status]) => {
    const icon = status ? '✅' : '❌';
    console.log(`${icon} ${check.charAt(0).toUpperCase() + check.slice(1)}`);
  });
  
  console.log(`\n🎯 Score: ${passed}/${total} checks passed`);
  
  if (passed === total) {
    console.log('\n🎉 PRODUCTION READY! 🎉');
    console.log('Your app is ready for deployment!');
    
    console.log('\n📱 Next steps:');
    console.log('1. Set up environment variables in Replit Secrets');
    console.log('2. Configure Supabase and Agora credentials');
    console.log('3. Test thoroughly on all target platforms');
    console.log('4. Deploy using Replit Deployments');
  } else {
    console.log('\n⚠️ PRODUCTION READINESS INCOMPLETE');
    console.log('Please address the failed checks before deploying.');
    
    console.log('\n🔧 Recommended actions:');
    if (!checks.security) console.log('- Fix security vulnerabilities with npm audit fix');
    if (!checks.dependencies) console.log('- Update dependencies with npm run update-deps');
    if (!checks.typecheck) console.log('- Fix TypeScript errors');
    if (!checks.linting) console.log('- Fix linting issues with npm run lint:fix');
    if (!checks.build) console.log('- Resolve build errors');
    if (!checks.configuration) console.log('- Complete app configuration');
    if (!checks.performance) console.log('- Optimize performance issues');
  }
  
  console.log('\n=====================================\n');
  
  if (passed < total) {
    process.exit(1);
  }
  
} catch (error) {
  console.error('\n❌ Production check failed:', error.message);
  process.exit(1);
}
