import { producto, productoRemoto } from '../pruebas/datos-de-prueba';
import {
  crearProducto,
  esProductoRemoto,
  etiquetaDisponibilidad,
  imagenPrincipal,
  precioEnTexto,
} from './producto';

describe('Producto (docs/contrato-api/productos.md)', () => {
  it('RN-11: el precio es dinero exacto, nunca un número de punto flotante', () => {
    const p = producto('p1', 'Crema', '12.50');
    expect(p.precio.centavos).toBe(1250);
    expect(precioEnTexto(p.precio)).toBe('$12.50');
    expect(precioEnTexto(producto('p2', 'Labial', '9.5').precio)).toBe('$9.50');
    expect(precioEnTexto(producto('p3', 'Set', '0.10').precio)).toBe('$0.10');
  });

  it('el precio con formato fuera del contrato no se convierte', () => {
    expect(() => crearProducto({ ...productoRemoto('p1', 'Crema', '12.505') })).toThrow();
    expect(() => crearProducto({ ...productoRemoto('p1', 'Crema', 'abc') })).toThrow();
  });

  it('reconoce un producto del contrato y rechaza uno con disponibilidad desconocida', () => {
    expect(esProductoRemoto(productoRemoto('p1', 'Crema', '12.50'))).toBe(true);
    expect(esProductoRemoto({ ...productoRemoto('p1', 'Crema', '12.50'), disponibilidad: 'X' })).toBe(false);
    expect(esProductoRemoto({ ...productoRemoto('p1', 'Crema', '12.50'), precio: 12.5 })).toBe(false);
    expect(esProductoRemoto({ ...productoRemoto('p1', 'Crema', '12.50'), imagenes: [{}] })).toBe(false);
  });

  it('RN-09: los tres estados tienen una etiqueta clara para el Cliente', () => {
    expect(etiquetaDisponibilidad('DISPONIBLE')).toBe('Disponible');
    expect(etiquetaDisponibilidad('AGOTADO')).toBe('Agotado');
    expect(etiquetaDisponibilidad('PENDIENTE_REPOSICION')).toBe('Pendiente de reposición');
  });

  it('la imagen principal es la marcada o, si no, la de menor orden; sin imágenes es null', () => {
    expect(imagenPrincipal({ imagenes: [] })).toBeNull();
    const imagenes = [
      { id: 'a', url: '/a.jpg', orden: 2, principal: false },
      { id: 'b', url: '/b.jpg', orden: 0, principal: true },
    ];
    expect(imagenPrincipal({ imagenes })?.id).toBe('b');
    expect(imagenPrincipal({ imagenes: imagenes.map((i) => ({ ...i, principal: false })) })?.id).toBe('b');
  });
});
