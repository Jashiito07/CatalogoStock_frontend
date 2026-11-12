import { Style } from '@capacitor/status-bar';

import { BarraEstadoCapacitor, PluginBarraEstado } from './barra-estado-capacitor';

function plugin(falla = false) {
  const llamadas: string[] = [];
  const doble: PluginBarraEstado & { llamadas: string[]; estilo?: Style; color?: string } = {
    llamadas,
    async setOverlaysWebView({ overlay }) {
      llamadas.push(`overlay:${overlay}`);
      if (falla) throw new Error('plugin no disponible');
    },
    async setStyle({ style }) {
      llamadas.push('estilo');
      doble.estilo = style;
    },
    async setBackgroundColor({ color }) {
      llamadas.push('color');
      doble.color = color;
    },
  };
  return doble;
}

describe('BarraEstadoCapacitor (D-41)', () => {
  it('oscuro: íconos claros (Style.Dark), fondo oscuro y sin cubrir el contenido', async () => {
    const p = plugin();
    await new BarraEstadoCapacitor(p, () => true).aplicar('oscuro', '#0f172a');
    expect(p.estilo).toBe(Style.Dark);
    expect(p.color).toBe('#0f172a');
    expect(p.llamadas[0]).toBe('overlay:false');
  });

  it('claro: íconos oscuros (Style.Light) y fondo claro', async () => {
    const p = plugin();
    await new BarraEstadoCapacitor(p, () => true).aplicar('claro', '#f8fafc');
    expect(p.estilo).toBe(Style.Light);
    expect(p.color).toBe('#f8fafc');
  });

  it('en el navegador no llama al plugin', async () => {
    const p = plugin();
    await new BarraEstadoCapacitor(p, () => false).aplicar('oscuro', '#0f172a');
    expect(p.llamadas).toEqual([]);
  });

  it('si el plugin falla no lanza error', async () => {
    const p = plugin(true);
    await expect(
      new BarraEstadoCapacitor(p, () => true).aplicar('claro', '#f8fafc'),
    ).resolves.toBeUndefined();
  });
});
