// Script para diagnosticar problemas en la modularización del bot
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Mapeo de dependencias esperadas
const expectedDependencies = {
  'src/index.js': ['./handlers', './config/database'],
  'src/handlers/index.js': ['./commands', './messages'],
  'src/handlers/messages.js': ['../config/constants', '../ui/keyboards', '../utils/permissions', '../services/alert', '../services/maniobra'],
  'src/handlers/commands.js': ['../models', './messages', '../utils/permissions', '../services/alert', '../services/maniobra'],
  'src/services/alert.js': ['../config/constants', '../utils/permissions'],
  'src/services/maniobra.js': ['../models', '../ui/keyboards', '../utils/permissions'],
  'src/utils/permissions.js': ['../config/constants'],
  'src/config/index.js': ['./constants', './database'],
  'src/models/index.js': ['./maniobra', './group']
};

function checkImports(filePath, expectedImports) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      return {
        exists: false,
        message: `❌ El archivo ${filePath} no existe`
      };
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const importedModules = [];
    
    // Extraer todos los imports/requires
    const requireRegex = /require\(['"](.*?)['"]\)/g;
    let match;
    while ((match = requireRegex.exec(content)) !== null) {
      importedModules.push(match[1]);
    }
    
    // Verificar imports esperados
    const missingImports = expectedImports.filter(imp => 
      !importedModules.some(actual => actual === imp || actual.endsWith(imp))
    );
    
    return {
      exists: true,
      content: content,
      imports: importedModules,
      missingImports: missingImports,
      message: missingImports.length ? 
        `⚠️ Faltan importaciones: ${missingImports.join(', ')}` : 
        '✅ Todas las importaciones esperadas están presentes'
    };
  } catch (error) {
    return {
      exists: false,
      error: error,
      message: `❌ Error al leer ${filePath}: ${error.message}`
    };
  }
}

function checkModuleExports(filePath, functionNames) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      return {
        exists: false,
        message: `❌ El archivo ${filePath} no existe`
      };
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Verificar funciones exportadas
    const exportLine = content.match(/module\.exports\s*=\s*{[^}]*}/);
    
    if (!exportLine) {
      return {
        exists: true,
        content: content,
        hasExports: false,
        message: `⚠️ No se encontró una línea de exportación en ${filePath}`
      };
    }
    
    const exportContent = exportLine[0];
    const missingExports = functionNames.filter(fn => 
      !exportContent.includes(fn)
    );
    
    return {
      exists: true,
      content: content,
      hasExports: true,
      exportLine: exportContent,
      missingExports: missingExports,
      message: missingExports.length ? 
        `⚠️ Faltan exportaciones: ${missingExports.join(', ')}` : 
        '✅ Todas las exportaciones esperadas están presentes'
    };
  } catch (error) {
    return {
      exists: false,
      error: error,
      message: `❌ Error al leer ${filePath}: ${error.message}`
    };
  }
}

function checkModulesFunctionality() {
  console.log('🔍 Analizando la estructura modular del bot...\n');
  
  // 1. Verificar index.js principal
  console.log('1. Verificando src/index.js');
  const indexResult = checkImports('src/index.js', expectedDependencies['src/index.js']);
  console.log(`   ${indexResult.message}`);
  
  // 2. Verificar handlers/index.js
  console.log('\n2. Verificando src/handlers/index.js');
  const handlersIndexResult = checkImports('src/handlers/index.js', expectedDependencies['src/handlers/index.js']);
  console.log(`   ${handlersIndexResult.message}`);
  
  // Verificar si setupHandlers se exporta correctamente
  const handlersExportResult = checkModuleExports('src/handlers/index.js', ['setupHandlers', 'sendMainMenu', 'sendApoyoMenu']);
  console.log(`   ${handlersExportResult.message}`);
  
  // 3. Verificar handlers/messages.js
  console.log('\n3. Verificando src/handlers/messages.js');
  const messagesResult = checkImports('src/handlers/messages.js', expectedDependencies['src/handlers/messages.js']);
  console.log(`   ${messagesResult.message}`);
  
  // Verificar si los handlers de mensajes se exportan correctamente
  const messagesExportResult = checkModuleExports('src/handlers/messages.js', ['setupMessageHandlers', 'sendMainMenu', 'sendApoyoMenu']);
  console.log(`   ${messagesExportResult.message}`);
  
  // Verificar handlers/commands.js
  console.log('\n4. Verificando src/handlers/commands.js');
  const commandsResult = checkImports('src/handlers/commands.js', expectedDependencies['src/handlers/commands.js']);
  console.log(`   ${commandsResult.message}`);
  
  // 5. Verificar servicios
  console.log('\n5. Verificando servicios');
  
  // Verificar alert.js
  const alertResult = checkImports('src/services/alert.js', expectedDependencies['src/services/alert.js']);
  console.log(`   services/alert.js: ${alertResult.message}`);
  
  const alertExportResult = checkModuleExports('src/services/alert.js', 
    ['startAlert', 'stopAlertForUser', 'cancelAllAlertsForChat', 'handleOperatorAction', 'handleAlertManagerDeactivation', 'activeAlerts']);
  console.log(`   Exportaciones en alert.js: ${alertExportResult.message}`);
  
  // Verificar maniobra.js
  const maniobraResult = checkImports('src/services/maniobra.js', expectedDependencies['src/services/maniobra.js']);
  console.log(`   services/maniobra.js: ${maniobraResult.message}`);
  
  const maniobraExportResult = checkModuleExports('src/services/maniobra.js', 
    ['startManiobrasFlow', 'handleManiobrasState', 'clearUserStates', 'userStates']);
  console.log(`   Exportaciones en maniobra.js: ${maniobraExportResult.message}`);
  
  // 6. Verificar utilidades
  console.log('\n6. Verificando utils');
  
  // Verificar permissions.js
  const permissionsResult = checkImports('src/utils/permissions.js', expectedDependencies['src/utils/permissions.js']);
  console.log(`   utils/permissions.js: ${permissionsResult.message}`);
  
  const permissionsExportResult = checkModuleExports('src/utils/permissions.js', 
    ['isOperator', 'isAlertManager', 'isSuperAdmin', 'getUserName', 'normalizeText']);
  console.log(`   Exportaciones en permissions.js: ${permissionsExportResult.message}`);
  
  // 7. Verificar constants.js
  console.log('\n7. Verificando configuración');
  
  const constantsPath = 'src/config/constants.js';
  try {
    const constantsContent = fs.readFileSync(path.join(process.cwd(), constantsPath), 'utf8');
    
    // Verificar la existencia de constantes clave
    const keyConstants = [
      'operatorIds', 'alertManagerIds', 'SUPER_ADMIN_ID', 
      'alertTypes', 'buttonActions', 'cancelationMessages'
    ];
    
    const missingConstants = keyConstants.filter(constant => !constantsContent.includes(constant));
    
    if (missingConstants.length) {
      console.log(`   ⚠️ Faltan constantes clave en ${constantsPath}: ${missingConstants.join(', ')}`);
    } else {
      console.log(`   ✅ Todas las constantes clave están presentes en ${constantsPath}`);
    }
    
    // Verificar que buttonActions tiene la acción APOYO
    if (constantsContent.includes("'🤝 APOYO': 'APOYO'")) {
      console.log(`   ✅ La acción '🤝 APOYO' está configurada correctamente`);
    } else {
      console.log(`   ⚠️ No se encontró la acción '🤝 APOYO' o está mal configurada`);
    }
  } catch (error) {
    console.log(`   ❌ Error al leer ${constantsPath}: ${error.message}`);
  }
  
  // 8. Verificar la conexión entre handlers/messages.js y la acción APOYO
  console.log('\n8. Verificando manejo de la acción APOYO');
  
  try {
    const messagesPath = 'src/handlers/messages.js';
    const messagesContent = fs.readFileSync(path.join(process.cwd(), messagesPath), 'utf8');
    
    // Buscar el patrón de código que maneja APOYO
    const hasApoyoHandler = messagesContent.includes("if (action === 'APOYO')") || 
                           messagesContent.includes('if (action === "APOYO")');
    
    if (hasApoyoHandler) {
      console.log(`   ✅ El handler para la acción 'APOYO' está presente`);
      
      // Verificar que llama a sendApoyoMenu correctamente
      if (messagesContent.includes("sendApoyoMenu(bot, chatId)")) {
        console.log(`   ✅ Se llama correctamente a sendApoyoMenu con los parámetros adecuados`);
      } else {
        console.log(`   ⚠️ La llamada a sendApoyoMenu parece incorrecta o incompleta`);
      }
    } else {
      console.log(`   ❌ No se encontró un handler para la acción 'APOYO'`);
    }
  } catch (error) {
    console.log(`   ❌ Error al analizar el manejo de APOYO: ${error.message}`);
  }
  
  // 9. Verificar el funcionamiento del teclado
  console.log('\n9. Verificando teclados UI');
  
  try {
    const keyboardsPath = 'src/ui/keyboards.js';
    const keyboardsContent = fs.readFileSync(path.join(process.cwd(), keyboardsPath), 'utf8');
    
    // Verificar las funciones para generar teclados
    const hasMainMenu = keyboardsContent.includes("function getMainMenuKeyboard()");
    const hasApoyoMenu = keyboardsContent.includes("function getApoyoMenuKeyboard()");
    
    if (hasMainMenu && hasApoyoMenu) {
      console.log(`   ✅ Las funciones para generar teclados están definidas`);
      
      // Verificar las exportaciones
      const keyboardExportResult = checkModuleExports(keyboardsPath, 
        ['getMainMenuKeyboard', 'getApoyoMenuKeyboard', 'getConfirmationKeyboard']);
      console.log(`   ${keyboardExportResult.message}`);
    } else {
      console.log(`   ⚠️ Faltan algunas funciones para generar teclados`);
    }
  } catch (error) {
    console.log(`   ❌ Error al verificar los teclados: ${error.message}`);
  }
}

console.log('======================================================');
console.log('DIAGNÓSTICO DE MODULARIZACIÓN DEL BOT DE TELEGRAM');
console.log('======================================================\n');

checkModulesFunctionality();

console.log('\n======================================================');
console.log('RESUMEN DE POSIBLES SOLUCIONES:');
console.log('======================================================');
console.log('1. Asegúrate que todos los módulos importan correctamente sus dependencias');
console.log('2. Verifica que las funciones están siendo exportadas con nombres consistentes');
console.log('3. Comprueba que handlers/messages.js maneje correctamente la acción "APOYO"');
console.log('4. Confirma que sendApoyoMenu recibe el bot como primer parámetro');
console.log('5. Revisa que los teclados están siendo exportados y utilizados correctamente');
console.log('6. Verifica que src/handlers/index.js exporte setupHandlers, sendMainMenu y sendApoyoMenu');