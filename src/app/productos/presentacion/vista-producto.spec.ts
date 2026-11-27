import { LEONISA, producto, YANBAL } from '../pruebas/datos-de-prueba';
import { aVistaEstado, aVistaMarca, aVistaProducto, OPCIONES_DISPONIBILIDAD } from './vista-producto';

describe('vista-producto (RN-09, RF-CAT-05, RNF-11)', () => {
  it('convierte el producto con el precio exacto en texto y la imagen principal', () => {
    const vista = aVistaProducto(producto('p1', 'Crema', '12.50', { urlImagen: 'http://api/1.jpg' }));

    expect(vista).toMatchObject({
      id: 'p1',
      nombre: 'Crema',
      precio: '$12.50',
      imagenUrl: 'http://api/1.jpg',
      atenuado: false,
    });
    expect(vista.marca.nombre).toBe('Yanbal');
  });

  it('cada disponibilidad lleva texto, ícono y tono; solo el agotado se atenúa', () => {
    expect(aVistaEstado('DISPONIBLE')).toEqual({ texto: 'Disponible', icono: 'pi pi-check-circle', tipo: 'ok' });
    expect(aVistaEstado('AGOTADO')).toEqual({ texto: 'Agotado', icono: 'pi pi-ban', tipo: 'mal' });
    expect(aVistaEstado('PENDIENTE_REPOSICION')).toEqual({
      texto: 'Pendiente de reposición',
      icono: 'pi pi-clock',
      tipo: 'warn',
    });
    expect(aVistaProducto(producto('p2', 'Labial', '9.75', { disponibilidad: 'AGOTADO' })).atenuado).toBe(true);
    expect(aVistaProducto(producto('p3', 'Rímel', '5.00')).imagenUrl).toBeNull();
  });

  it('la marca conserva el texto del servidor y el acento con su texto (D-43)', () => {
    expect(aVistaMarca(YANBAL)).toMatchObject({ color: '#FC5823', texto: '#1E293B', acento: null, textoAcento: null });
    expect(aVistaMarca(LEONISA)).toMatchObject({ acento: '#F36E21', textoAcento: '#1E293B' });
  });

  it('los chips ofrecen «Todo» y los tres estados del servidor', () => {
    expect(OPCIONES_DISPONIBILIDAD.map((o) => [o.valor, o.etiqueta])).toEqual([
      [null, 'Todo'],
      ['DISPONIBLE', 'Disponible'],
      ['AGOTADO', 'Agotado'],
      ['PENDIENTE_REPOSICION', 'Pendiente de reposición'],
    ]);
  });
});
