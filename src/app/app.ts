import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { Toast } from 'primeng/toast';

/** Estructura de la app: Ionic aporta el contenedor y la navegación; PrimeNG, los avisos. */
@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet, Toast],
  template: `
    <ion-app>
      <p-toast position="top-center" />
      <ion-router-outlet />
    </ion-app>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
