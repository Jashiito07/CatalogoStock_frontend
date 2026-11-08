import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Adaptadores entre las reglas del dominio (`validaciones-usuario.ts`) y los formularios
 * reactivos. Cada error guarda su mensaje en español para mostrarlo bajo el campo.
 */

/** Error de una regla del dominio: `{ regla: '<mensaje>' }`. */
export function reglaDominio(regla: (valor: string) => boolean, mensaje: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor: unknown = control.value;
    return regla(typeof valor === 'string' ? valor : '') ? null : { regla: mensaje };
  };
}

/** Casilla obligatoria (aviso de privacidad, RNF-16). */
export function casillaMarcada(mensaje: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    control.value === true ? null : { regla: mensaje };
}

/** La confirmación debe ser igual al campo indicado; el error queda en la confirmación. */
export function igualA(campo: string, mensaje: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const otro = control.parent?.get(campo);
    return otro === null || otro === undefined || otro.value === control.value
      ? null
      : { regla: mensaje };
  };
}

/** Mensaje del primer error del control: regla local o error devuelto por el servidor. */
export function mensajeDeControl(control: AbstractControl | null): string | null {
  const errores = control?.errors;
  if (!errores) return null;
  const mensaje: unknown = errores['servidor'] ?? errores['regla'];
  return typeof mensaje === 'string' ? mensaje : null;
}

/** Marca un error del servidor en un campo; desaparece al editarlo. */
export function marcarErrorServidor(formulario: FormGroup, campo: string, mensaje: string): boolean {
  const control = formulario.get(campo);
  if (!control) return false;
  control.setErrors({ ...(control.errors ?? {}), servidor: mensaje });
  control.markAsTouched();
  return true;
}
