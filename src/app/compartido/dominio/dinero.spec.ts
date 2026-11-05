import { Dinero, ErrorDinero } from './dinero';

describe('Dinero', () => {
  describe('desdeTexto', () => {
    it('convierte texto decimal con dos decimales a centavos', () => {
      expect(Dinero.desdeTexto('12.50').centavos).toBe(1250);
    });

    it('acepta un decimal o ninguno', () => {
      expect(Dinero.desdeTexto('12.5').centavos).toBe(1250);
      expect(Dinero.desdeTexto('12').centavos).toBe(1200);
      expect(Dinero.desdeTexto('0.05').centavos).toBe(5);
    });

    it('rechaza textos que no son montos exactos', () => {
      for (const texto of ['', 'abc', '12,50', '-3.00', '1.234', '1e3', '.50']) {
        expect(() => Dinero.desdeTexto(texto)).toThrow(ErrorDinero);
      }
    });
  });

  describe('operaciones', () => {
    it('suma de forma exacta donde el punto flotante falla (0.10 + 0.20)', () => {
      const total = Dinero.desdeTexto('0.10').sumar(Dinero.desdeTexto('0.20'));
      expect(total.aTexto()).toBe('0.30');
      expect(total.igualA(Dinero.desdeTexto('0.30'))).toBe(true);
    });

    it('multiplica por una cantidad entera', () => {
      expect(Dinero.desdeTexto('12.99').multiplicar(3).aTexto()).toBe('38.97');
      expect(Dinero.desdeTexto('12.99').multiplicar(0).esCero()).toBe(true);
    });

    it('rechaza cantidades no enteras o negativas', () => {
      const precio = Dinero.desdeTexto('1.00');
      expect(() => precio.multiplicar(1.5)).toThrow(ErrorDinero);
      expect(() => precio.multiplicar(-1)).toThrow(ErrorDinero);
    });

    it('calcula el total de una lista de montos', () => {
      const montos = ['19.90', '5.05', '0.05'].map((texto) => Dinero.desdeTexto(texto));
      expect(Dinero.total(montos).aTexto()).toBe('25.00');
      expect(Dinero.total([]).esCero()).toBe(true);
    });

    it('rechaza centavos negativos o no enteros', () => {
      expect(() => Dinero.desdeCentavos(-1)).toThrow(ErrorDinero);
      expect(() => Dinero.desdeCentavos(10.5)).toThrow(ErrorDinero);
    });
  });

  describe('presentación', () => {
    it('devuelve texto decimal con dos decimales para la API y SQLite', () => {
      expect(Dinero.desdeCentavos(5).aTexto()).toBe('0.05');
      expect(Dinero.desdeCentavos(123456).aTexto()).toBe('1234.56');
    });

    it('formatea en dólares con el formato de Ecuador (es-EC)', () => {
      expect(Dinero.desdeTexto('12.50').formatear()).toBe('$12,50');
      expect(Dinero.desdeTexto('1234.56').formatear()).toBe('$1.234,56');
      expect(Dinero.cero().formatear()).toBe('$0,00');
    });
  });
});
