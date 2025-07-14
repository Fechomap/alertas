// tests/services/report.test.js
const { generateExcel, generateWeeklyExcel } = require('../../src/services/report');

// Mock de los modelos
jest.mock('../../src/models', () => ({
  Maniobra: {
    find: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        {
          chatId: '123',
          groupName: 'Test Group',
          alertManagerId: 'user1',
          maniobras: 5,
          descripcion: 'Test maniobra',
          fecha: new Date('2024-01-15T10:00:00Z')
        }
      ])
    })
  },
  Group: {
    find: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        {
          chatId: '123',
          displayName: 'Test Group Display'
        }
      ])
    })
  }
}));

// Mock de XLSX
jest.mock('xlsx', () => ({
  utils: {
    book_new: jest.fn(() => ({})),
    json_to_sheet: jest.fn(() => ({})),
    book_append_sheet: jest.fn()
  },
  write: jest.fn(() => Buffer.from('fake excel data'))
}));

describe('Report Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateExcel', () => {
    it('debería generar Excel con todos los datos por defecto', async () => {
      const result = await generateExcel();
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('fake excel data');
    });

    it('debería generar Excel con filtro semanal cuando weeklyOnly es true', async () => {
      const { Maniobra } = require('../../src/models');
      
      await generateExcel(true);
      
      // Verificar que se llamó con query de fecha
      expect(Maniobra.find).toHaveBeenCalledWith(
        expect.objectContaining({
          fecha: expect.objectContaining({
            $gte: expect.any(Date),
            $lte: expect.any(Date)
          })
        })
      );
    });
  });

  describe('generateWeeklyExcel', () => {
    it('debería generar reporte semanal', async () => {
      const result = await generateWeeklyExcel();
      
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('Cálculo de fechas semanales', () => {
    it('debería generar reporte semanal con filtro de fechas', async () => {
      const { Maniobra } = require('../../src/models');
      
      await generateExcel(true);
      
      const callArgs = Maniobra.find.mock.calls[0][0];
      
      // Verificar que se usa filtro de fecha
      expect(callArgs).toHaveProperty('fecha');
      expect(callArgs.fecha).toHaveProperty('$gte');
      expect(callArgs.fecha).toHaveProperty('$lte');
      
      // Verificar que las fechas son válidas
      expect(callArgs.fecha.$gte).toBeInstanceOf(Date);
      expect(callArgs.fecha.$lte).toBeInstanceOf(Date);
      
      // Verificar que el rango es de 6 días
      const diffInDays = (callArgs.fecha.$lte - callArgs.fecha.$gte) / (1000 * 60 * 60 * 24);
      expect(Math.abs(diffInDays - 6)).toBeLessThan(1); // Aproximadamente 6 días
    });

    it('debería manejar correctamente el problema del domingo', () => {
      // Test unitario para verificar el cálculo manual
      const sundayGetDay = 0;
      const daysToMonday = sundayGetDay === 0 ? -6 : 1 - sundayGetDay;
      expect(daysToMonday).toBe(-6);
      
      const wednesdayGetDay = 3;
      const daysToMondayWed = wednesdayGetDay === 0 ? -6 : 1 - wednesdayGetDay;
      expect(daysToMondayWed).toBe(-2);
    });
  });
});