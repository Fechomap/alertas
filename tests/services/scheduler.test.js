// tests/services/scheduler.test.js
const { initializeScheduler, testWeeklyReport } = require('../../src/services/scheduler');

// Mock de node-cron
jest.mock('node-cron', () => ({
  schedule: jest.fn()
}));

// Mock del servicio de reportes
jest.mock('../../src/services/report', () => ({
  generateWeeklyExcel: jest.fn().mockResolvedValue(Buffer.from('fake excel data'))
}));

describe('Scheduler Service', () => {
  let mockBot;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock del bot
    mockBot = {
      sendDocument: jest.fn().mockResolvedValue({ message_id: 123 }),
      sendMessage: jest.fn().mockResolvedValue({ message_id: 124 })
    };

    // Mock de variables de entorno
    process.env.ADMIN_CHAT_ID = '7143094298';
  });

  afterEach(() => {
    delete process.env.ADMIN_CHAT_ID;
  });

  describe('initializeScheduler', () => {
    it('debería inicializar el scheduler correctamente', () => {
      const cron = require('node-cron');
      
      initializeScheduler(mockBot);
      
      // Verificar que se programó el job
      expect(cron.schedule).toHaveBeenCalledWith(
        '55 23 * * 0', // Domingos 23:55
        expect.any(Function),
        { timezone: 'America/Mexico_City' }
      );
    });
  });

  describe('testWeeklyReport', () => {
    it('debería enviar reporte de prueba al admin cuando ADMIN_CHAT_ID está configurado', async () => {
      const { generateWeeklyExcel } = require('../../src/services/report');
      
      // Inicializar scheduler con el bot mock
      initializeScheduler(mockBot);
      
      await testWeeklyReport();
      
      // Verificar que se generó el Excel
      expect(generateWeeklyExcel).toHaveBeenCalled();
      
      // Verificar que se envió al chat ID correcto
      expect(mockBot.sendDocument).toHaveBeenCalledWith(
        '7143094298',
        expect.any(String), // Ahora es una ruta de archivo
        expect.objectContaining({
          caption: expect.stringContaining('Reporte Semanal Automático'),
          parse_mode: 'Markdown'
        })
      );
    });

    it('debería manejar error cuando ADMIN_CHAT_ID no está configurado', async () => {
      delete process.env.ADMIN_CHAT_ID;
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      initializeScheduler(mockBot);
      await testWeeklyReport();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ ADMIN_CHAT_ID no configurado en variables de entorno'
      );
      
      consoleSpy.mockRestore();
    });

    it('debería enviar mensaje de error al admin cuando falla la generación', async () => {
      const { generateWeeklyExcel } = require('../../src/services/report');
      generateWeeklyExcel.mockRejectedValueOnce(new Error('Database error'));
      
      initializeScheduler(mockBot);
      await testWeeklyReport();
      
      // Verificar que se envió mensaje de error
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        '7143094298',
        expect.stringContaining('Error generando reporte semanal automático'),
        { parse_mode: 'Markdown' }
      );
    });
  });

  describe('Configuración del Cron Job', () => {
    it('debería usar la zona horaria correcta (Mexico)', () => {
      const cron = require('node-cron');
      
      initializeScheduler(mockBot);
      
      const scheduleCall = cron.schedule.mock.calls[0];
      expect(scheduleCall[2]).toEqual({ timezone: 'America/Mexico_City' });
    });

    it('debería ejecutarse los domingos a las 23:55', () => {
      const cron = require('node-cron');
      
      initializeScheduler(mockBot);
      
      const cronExpression = cron.schedule.mock.calls[0][0];
      expect(cronExpression).toBe('55 23 * * 0'); // 23:55 los domingos
    });
  });
});